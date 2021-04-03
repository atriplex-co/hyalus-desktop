const express = require("express");
const validation = require("../middleware/validation");
const user = require("../middleware/user");
const session = require("../middleware/session");
const Joi = require("joi");
const app = express.Router();
const { ObjectId } = require("mongodb");
const Busboy = require("busboy");
const sharp = require("sharp");
const crypto = require("crypto");
const { default: redis } = require("ioredis/built/redis");

app.get("/", session, async (req, res) => {
  const channels = await (
    await req.deps.db.collection("channels").find({
      users: {
        $elemMatch: {
          id: req.session.user,
          removed: false,
        },
      },
    })
  ).toArray();

  const formatted = [];

  for (const channel of channels) {
    const users = [];

    for (const channelUserMeta of channel.users) {
      if (req.session.user.equals(channelUserMeta.id)) {
        continue;
      }

      const user = await req.deps.db.collection("users").findOne({
        _id: channelUserMeta.id,
      });

      const voiceChannel = await req.deps.redis.get(
        `voice_channel:${user._id}`
      );

      users.push({
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        username: user.username,
        publicKey: user.publicKey.toString("base64"),
        removed: channelUserMeta.removed,
        voiceConnected: channel._id.equals(voiceChannel),
      });
    }

    const lastMessage = await req.deps.db.collection("messages").findOne(
      {
        channel: channel._id,
        $or: [
          {
            keys: null,
          },
          {
            keys: {
              $elemMatch: {
                id: req.session.user,
              },
            },
          },
        ],
      },
      {
        sort: {
          time: -1,
        },
      }
    );

    if (lastMessage?.keys) {
      lastMessage.body = lastMessage.body.toString("base64");
      lastMessage.key = lastMessage.keys
        .find((k) => k.id.equals(req.session.user))
        .key.toString("base64");
    }

    formatted.push({
      id: channel._id,
      type: channel.type,
      name: channel.name,
      avatar: channel.avatar,
      writable: channel.writable,
      created: channel.created,
      admin: channel.users.find((u) => u.id.equals(req.session.user)).admin,
      users: users,
      lastMessage: lastMessage && {
        id: lastMessage._id,
        time: lastMessage.time,
        type: lastMessage.type,
        sender: lastMessage.sender,
        body: lastMessage.body,
        key: lastMessage.key,
      },
    });
  }

  res.json(formatted);
});

app.post(
  "/",
  session,
  user,
  validation(
    Joi.object({
      name: Joi.string()
        .required()
        .min(1)
        .max(256),
      users: Joi.array()
        .required()
        .min(1)
        .max(99)
        .items(
          Joi.string()
            .required()
            .hex()
            .length(24)
        ),
    })
  ),
  async (req, res) => {
    const users = [req.user];

    for (const userId of req.body.users) {
      const friend = await req.deps.db.collection("friends").findOne({
        accepted: true,
        $or: [
          {
            target: req.session.user,
            initiator: new ObjectId(userId),
          },
          {
            target: new ObjectId(userId),
            initiator: req.session.user,
          },
        ],
      });

      if (!friend) {
        res.status(400).json({
          error: "Users must be friends to create groups",
        });

        return;
      }

      const user = await req.deps.db.collection("users").findOne({
        _id: new ObjectId(userId),
      });

      users.push(user);
    }

    const channel = (
      await req.deps.db.collection("channels").insertOne({
        type: "group",
        name: req.body.name,
        avatar: null,
        created: Date.now(),
        writable: true,
        users: users.map((u) => {
          return {
            id: u._id,
            admin: u === req.user,
            removed: false,
            added: Date.now(),
          };
        }),
      })
    ).ops[0];

    for (const user of users) {
      req.deps.redis.publish(`user:${user._id}`, {
        t: "channel",
        d: {
          id: channel._id.toString(),
          type: channel.type,
          name: channel.name,
          avatar: channel.avatar,
          created: channel.created,
          writable: channel.writable,
          admin: user === req.user,
          users: users
            .filter((u) => u !== user)
            .map((u) => {
              return {
                id: u._id.toString(),
                name: u.name,
                avatar: u.avatar.toString(),
                username: u.username,
                publicKey: u.publicKey.toString("base64"),
              };
            }),
        },
      });
    }

    for (const user of users.filter((u) => u !== req.user)) {
      const message = (
        await req.deps.db.collection("messages").insertOne({
          channel: channel._id,
          time: Date.now(),
          sender: req.session.user,
          type: "channelUserAdd",
          body: user._id,
          keys: null,
        })
      ).ops[0];

      for (const channelUser of channel.users) {
        req.deps.redis.publish(`user:${channelUser.id}`, {
          t: "message",
          d: {
            channel: channel._id.toString(),
            id: message._id.toString(),
            time: message.time,
            sender: message.sender.toString(),
            type: message.type,
            body: message.body.toString(),
            key: null,
          },
        });
      }
    }

    res.end();
  }
);

app.post(
  "/:channel/meta",
  session,
  validation(
    Joi.object({
      name: Joi.string()
        .min(3)
        .max(32),
    })
  ),
  async (req, res) => {
    if (!ObjectId.isValid(req.params.channel)) {
      return res.status(400).json({
        error: "Invalid channel",
      });
    }

    const channel = await req.deps.db.collection("channels").findOne({
      _id: new ObjectId(req.params.channel),
      users: {
        $elemMatch: {
          id: req.session.user,
          removed: false,
        },
      },
    });

    if (!channel) {
      res.status(404).json({
        error: "Channel not found",
      });

      return;
    }

    if (channel.type === "dm") {
      res.status(400).json({
        error: "Can't set channel metadata on DMs",
      });

      return;
    }

    if (!channel.users.find((u) => u.id.equals(req.session.user)).admin) {
      res.status(400).json({
        error: "Must be channel administrator",
      });

      return;
    }

    await req.deps.db.collection("channels").updateOne(channel, {
      $set: req.body,
    });

    for (const user of channel.users.filter((u) => !u.removed)) {
      req.deps.redis.publish(`user:${user.id}`, {
        t: "channel",
        d: {
          id: channel._id.toString(),
          ...req.body,
        },
      });
    }

    if (req.body.name) {
      const message = (
        await req.deps.db.collection("messages").insertOne({
          channel: channel._id,
          sender: req.session.user,
          time: Date.now(),
          type: "channelName",
          body: req.body.name,
          keys: null,
        })
      ).ops[0];

      for (const user of channel.users.filter((u) => !u.removed)) {
        req.deps.redis.publish(`user:${user.id}`, {
          t: "message",
          d: {
            channel: channel._id.toString(),
            id: message._id.toString(),
            sender: message.sender.toString(),
            time: message.time,
            type: message.type,
            body: message.body,
          },
        });
      }
    }

    res.end();
  }
);

app.get("/:id/messages", session, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: "Invalid channel",
    });
  }

  const channel = await req.deps.db.collection("channels").findOne({
    _id: new ObjectId(req.params.id),
    users: {
      $elemMatch: {
        id: req.session.user,
        removed: false,
      },
    },
  });

  if (!channel) {
    res.status(404).json({
      error: "Channel does not exist",
    });

    return;
  }

  const channelUser = channel.users.find((u) => u.id.equals(req.session.user));

  const query = {
    channel: channel._id,
    time: {
      $gte: channelUser.added,
    },
    $or: [
      {
        keys: null,
      },
      {
        keys: {
          $elemMatch: {
            id: req.session.user,
          },
        },
      },
    ],
  };

  if (ObjectId.isValid(req.query.before)) {
    query._id = {
      $lt: new ObjectId(req.query.before),
    };
  }

  const messages = (
    await (
      await req.deps.db.collection("messages").find(query, {
        limit: 50,
        sort: {
          time: -1,
        },
      })
    ).toArray()
  ).reverse();

  const formatted = [];

  for (const message of messages) {
    if (message.keys) {
      message.body = message.body.toString("base64");
      message.key = message.keys
        .find((k) => k.id.equals(req.session.user))
        .key.toString("base64");
    }

    formatted.push({
      id: message._id,
      time: message.time,
      type: message.type,
      sender: message.sender,
      body: message.body,
      key: message.key,
    });
  }

  res.json(formatted);
});

app.post(
  "/:id/messages",
  session,
  user,
  validation(
    Joi.object({
      body: Joi.string()
        .required()
        .base64(),
      keys: Joi.array()
        .items(
          Joi.object({
            id: Joi.string()
              .required()
              .hex()
              .length(24),
            key: Joi.string()
              .required()
              .base64()
              .length(96),
          })
        )
        .required(),
    })
  ),
  async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "Invalid channel",
      });
    }

    const channel = await req.deps.db.collection("channels").findOne({
      _id: new ObjectId(req.params.id),
      users: {
        $elemMatch: {
          id: req.session.user,
          removed: false,
        },
      },
      writable: true,
    });

    if (!channel) {
      res.status(404).json({
        error: "Channel not found",
      });

      return;
    }

    if (
      channel.users
        .filter((u) => !u.removed)
        .map((u) => u.id)
        .sort()
        .join() !==
      req.body.keys
        .map((k) => k.id)
        .sort()
        .join()
    ) {
      res.status(400).json({
        error: "Invalid keys",
      });

      return;
    }

    const keys = [];

    for (const key of req.body.keys) {
      keys.push({
        id: new ObjectId(key.id),
        key: Buffer.from(key.key, "base64"),
      });
    }

    const message = (
      await req.deps.db.collection("messages").insertOne({
        time: Date.now(),
        channel: channel._id,
        type: "text",
        sender: req.session.user,
        body: Buffer.from(req.body.body, "base64"),
        keys,
      })
    ).ops[0];

    for (const channelUser of channel.users.filter((u) => !u.removed)) {
      req.deps.redis.publish(`user:${channelUser.id}`, {
        t: "message",
        d: {
          channel: channel._id.toString(),
          id: message._id.toString(),
          time: message.time,
          type: message.type,
          sender: message.sender.toString(),
          body: message.body,
          key: message.keys.find((k) => k.id.equals(channelUser.id)).key,
        },
      });
    }

    res.end();
  }
);

app.delete("/:channel/messages/:message", session, user, async (req, res) => {
  if (!ObjectId.isValid(req.params.channel)) {
    return res.status(400).json({
      error: "Invalid channel",
    });
  }

  if (!ObjectId.isValid(req.params.message)) {
    return res.status(400).json({
      error: "Invalid message",
    });
  }

  const channel = await req.deps.db.collection("channels").findOne({
    _id: new ObjectId(req.params.channel),
    users: {
      $elemMatch: {
        id: req.session.user,
        removed: false,
      },
    },
  });

  if (!channel) {
    res.status(400).json({
      error: "Channel does not exist",
    });

    return;
  }

  const message = await req.deps.db.collection("messages").findOne({
    _id: new ObjectId(req.params.message),
    channel: channel._id,
    sender: req.session.user,
  });

  if (!message) {
    res.status(400).json({
      error: "Message does not exists",
    });

    return;
  }

  await req.deps.db.collection("messages").deleteOne(message);

  res.end();

  for (const channelUser of channel.users.filter((u) => !u.removed)) {
    req.deps.redis.publish(`user:${channelUser.id}`, {
      t: "message",
      d: {
        channel: channel._id.toString(),
        id: message._id.toString(),
        delete: true,
      },
    });
  }
});

app.post("/:channel/avatar", session, async (req, res) => {
  if (!ObjectId.isValid(req.params.channel)) {
    return res.status(400).json({
      error: "Invalid channel",
    });
  }

  const channel = await req.deps.db.collection("channels").findOne({
    _id: new ObjectId(req.params.channel),
    users: {
      $elemMatch: {
        id: req.session.user,
        removed: false,
      },
    },
  });

  if (!channel) {
    res.status(404).json({
      error: "Channel not found",
    });

    return;
  }

  if (channel.type === "dm") {
    res.status(400).json({
      error: "Can't set channel avatar on DMs",
    });

    return;
  }

  if (!channel.users.find((u) => u.id.equals(req.session.user)).admin) {
    res.status(400).json({
      error: "Must be channel administrator",
    });

    return;
  }

  const bb = new Busboy({
    headers: req.headers,
  });

  bb.on("file", (name, file) => {
    const bufs = [];

    file.on("data", (b) => {
      bufs.push(b);
    });

    file.on("end", async () => {
      let img;

      try {
        img = await sharp(Buffer.concat(bufs))
          .resize(256, 256)
          .toFormat("webp")
          .toBuffer();
      } catch {
        res.status(400).json({
          error: "Unsupported or invalid image data",
        });

        return;
      }

      const hash = crypto
        .createHash("sha256")
        .update(img)
        .digest();

      let avatar = await req.deps.db.collection("avatars").findOne({
        hash,
      });

      if (!avatar) {
        avatar = (
          await req.deps.db.collection("avatars").insertOne({
            hash,
            img,
          })
        ).ops[0];
      }

      await req.deps.db.collection("channels").updateOne(channel, {
        $set: {
          avatar: avatar._id,
        },
      });

      const message = (
        await req.deps.db.collection("messages").insertOne({
          channel: channel._id,
          sender: req.session.user,
          time: Date.now(),
          type: "channelAvatar",
          body: null,
          keys: null,
        })
      ).ops[0];

      for (const user of channel.users.filter((u) => !u.removed)) {
        req.deps.redis.publish(`user:${user.id}`, {
          t: "channel",
          d: {
            id: channel._id.toString(),
            avatar: avatar._id.toString(),
          },
        });

        req.deps.redis.publish(`user:${user.id}`, {
          t: "message",
          d: {
            channel: channel._id.toString(),
            id: message._id.toString(),
            sender: message.sender.toString(),
            time: message.time,
            type: message.type,
          },
        });
      }

      res.end();
    });
  });

  req.pipe(bb);
});

app.post(
  "/:channel/users",
  session,
  user,
  validation(
    Joi.object({
      user: Joi.string()
        .required()
        .hex()
        .length(24),
    })
  ),
  async (req, res) => {
    if (!ObjectId.isValid(req.params.channel)) {
      return res.status(400).json({
        error: "Invalid channel",
      });
    }

    const channel = await req.deps.db.collection("channels").findOne({
      _id: new ObjectId(req.params.channel),
      users: {
        $elemMatch: {
          id: req.session.user,
          removed: false,
        },
      },
    });

    if (!channel) {
      res.status(404).json({
        error: "Channel not found",
      });

      return;
    }

    if (channel.type === "dm") {
      res.status(400).json({
        error: "Can't add users to DMs",
      });

      return;
    }

    const oldChannelUser = channel.users.find((u) =>
      u.id.equals(req.body.user)
    );

    if (oldChannelUser && !oldChannelUser.removed) {
      res.status(400).json({
        error: "User is already in channel",
      });

      return;
    }

    const friend = await req.deps.db.collection("friends").findOne({
      accepted: true,
      $or: [
        {
          initiator: req.session.user,
          target: new ObjectId(req.body.user),
        },
        {
          initiator: new ObjectId(req.body.user),
          target: req.session.user,
        },
      ],
    });

    if (!friend) {
      res.status(400).json({
        error: "Must be friends with user to add them",
      });

      return;
    }

    const targetUser = await req.deps.db.collection("users").findOne({
      _id: new ObjectId(req.body.user),
    });

    if (oldChannelUser) {
      await req.deps.db.collection("channels").updateOne(
        {
          _id: channel._id,
          users: {
            $elemMatch: {
              id: new ObjectId(req.body.user),
            },
          },
        },
        {
          $set: {
            "users.$.removed": false,
          },
        }
      );

      channel.users
        .filter((user) => !user.removed)
        .filter((user) => !user.id.equals(req.body.user))
        .map((user) => {
          req.deps.redis.publish(`user:${user.id}`, {
            t: "channelUser",
            d: {
              channel: channel._id.toString(),
              id: targetUser._id.toString(),
              removed: false,
            },
          });
        });
    } else {
      await req.deps.db.collection("channels").updateOne(channel, {
        $push: {
          users: {
            id: targetUser._id,
            admin: false,
            removed: false,
            added: Date.now(),
          },
        },
      });

      for (const user of channel.users.filter((u) => !u.removed)) {
        req.deps.redis.publish(`user:${user.id}`, {
          t: "channelUser",
          d: {
            channel: channel._id.toString(),
            id: targetUser._id.toString(),
            name: targetUser.name,
            avatar: targetUser.avatar.toString(),
            username: targetUser.username,
            publicKey: targetUser.publicKey.toString("base64"),
            removed: false,
          },
        });
      }
    }

    const users = [];

    for (const meta of channel.users) {
      const user = await req.deps.db.collection("users").findOne({
        _id: meta.id,
      });

      users.push({
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar.toString(),
        username: user.username,
        publicKey: user.publicKey.toString("base64"),
        removed: meta.removed,
      });
    }

    req.deps.redis.publish(`user:${targetUser._id}`, {
      t: "channel",
      d: {
        id: channel._id.toString(),
        type: channel.type,
        name: channel.name,
        avatar: channel.avatar && channel.avatar.toString(),
        writable: channel.writable,
        users: users.filter((u) => u.id !== req.body.user),
      },
    });

    const message = (
      await req.deps.db.collection("messages").insertOne({
        channel: channel._id,
        time: Date.now(),
        sender: req.session.user,
        type: "channelUserAdd",
        body: new ObjectId(req.body.user),
        keys: null,
      })
    ).ops[0];

    users.push({
      id: targetUser._id,
    });

    for (const user of users.filter((u) => !u.removed)) {
      req.deps.redis.publish(`user:${user.id}`, {
        t: "message",
        d: {
          channel: channel._id.toString(),
          id: message._id.toString(),
          time: message.time,
          sender: message.sender.toString(),
          type: message.type,
          body: message.body.toString(),
          key: null,
        },
      });
    }

    res.end();
  }
);

app.delete("/:channel/users/:user", session, async (req, res) => {
  if (!ObjectId.isValid(req.params.channel)) {
    return res.status(400).json({
      error: "Invalid channel",
    });
  }

  if (!ObjectId.isValid(req.params.user)) {
    return res.status(400).json({
      error: "Invalid user",
    });
  }

  if (req.session.user.equals(req.params.user)) {
    res.status(400).json({
      error: "You can't remove yourself",
    });

    return;
  }

  const channel = await req.deps.db.collection("channels").findOne({
    _id: new ObjectId(req.params.channel),
    users: {
      $elemMatch: {
        id: req.session.user,
        removed: false,
      },
    },
  });

  if (!channel) {
    res.status(404).json({
      error: "Channel not found",
    });

    return;
  }

  if (channel.type === "dm") {
    res.status(400).json({
      error: "Users can't be removed from DMs",
    });

    return;
  }

  if (!channel.users.find((u) => u.id.equals(req.session.user)).admin) {
    res.status(400).json({
      error: "Must be a channel administrator",
    });

    return;
  }

  if (!channel.users.find((u) => u.id.equals(new ObjectId(req.params.user)))) {
    res.status(404).json({
      error: "Channel user not found",
    });

    return;
  }

  await req.deps.db.collection("channels").updateOne(
    {
      _id: new ObjectId(req.params.channel),
      users: {
        $elemMatch: {
          id: new ObjectId(req.params.user),
        },
      },
    },
    {
      $set: {
        "users.$.removed": true,
      },
    }
  );

  const message = (
    await req.deps.db.collection("messages").insertOne({
      channel: channel._id,
      time: Date.now(),
      type: "channelUserRemove",
      sender: req.session.user,
      body: new ObjectId(req.params.user),
      keys: null,
    })
  ).ops[0];

  channel.users
    .filter((u) => !u.removed)
    .filter((u) => !u.id.equals(req.params.user))
    .map((user) => {
      req.deps.redis.publish(`user:${user.id}`, {
        t: "message",
        d: {
          channel: message.channel.toString(),
          id: message._id.toString(),
          time: message.time,
          type: message.type,
          sender: message.sender.toString(),
          body: message.body.toString(),
        },
      });

      req.deps.redis.publish(`user:${user.id}`, {
        t: "channelUser",
        d: {
          channel: message.channel.toString(),
          id: req.params.user,
          removed: true,
          voiceConnected: false,
        },
      });
    });

  req.deps.redis.publish(`user:${req.params.user}`, {
    t: "voiceKick",
  });

  req.deps.redis.publish(`user:${req.params.user}`, {
    t: "channel",
    d: {
      id: channel._id.toString(),
      delete: true,
    },
  });

  res.status(204).end();
});

module.exports = app;
