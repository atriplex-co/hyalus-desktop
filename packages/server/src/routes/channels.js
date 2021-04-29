const express = require("express");
const validation = require("../middleware/validation");
const user = require("../middleware/user");
const session = require("../middleware/session");
const Joi = require("joi");
const app = express.Router();
const { ObjectId } = require("mongodb");
const Busboy = require("busboy");
const crypto = require("crypto");
const ratelimit = require("../middleware/ratelimit");
const fs = require("fs");
const os = require("os");
const proc = require("child_process");

app.post(
  "/",
  session,
  ratelimit({
    scope: "user",
    tag: "groupCreate",
    max: 5,
    time: 60 * 15, //15m
  }),
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
        created: new Date(),
        writable: true,
        users: users.map((u) => {
          return {
            id: u._id,
            admin: u === req.user,
            removed: false,
            added: new Date(),
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
                avatar: u.avatar?.toString(),
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
          time: new Date(),
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
  ratelimit({
    scope: "user",
    tag: "setChannelName",
    max: 3,
    time: 60,
    params: true,
  }),
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
          time: new Date(),
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

app.get(
  "/:id/messages",
  session,
  ratelimit({
    scope: "user",
    tag: "getMessages",
    max: 1000,
    time: 60 * 15, //1h
    params: true,
  }),
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
    });

    if (!channel) {
      res.status(404).json({
        error: "Channel does not exist",
      });

      return;
    }

    const channelUser = channel.users.find((u) =>
      u.id.equals(req.session.user)
    );

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
        message.key = message.keys
          .find((k) => k.id.equals(req.session.user))
          .key.toString("base64");
      }

      let body = message.body;

      if (body?.buffer) {
        body = body.toString("base64");
      }

      if (body instanceof ObjectId) {
        body = body.toString();
      }

      formatted.push({
        id: message._id,
        time: message.time,
        type: message.type,
        sender: message.sender,
        body,
        fileName: message.fileName,
        fileType: message.fileType,
        fileLength: message.fileLength,
        key: message.key,
      });
    }

    res.json(formatted);
  }
);

app.post(
  "/:id/messages",
  session,
  ratelimit({
    scope: "user",
    tag: "messageCreate",
    max: 20,
    time: 10,
    params: true,
  }),
  user,
  validation(
    Joi.object({
      body: Joi.string()
        .required()
        .max(Math.ceil(((5000 + 24) / 3) * 4)) //5000 chars, 24-byte nonce, base64'd
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
        time: new Date(),
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

app.delete(
  "/:channel/messages/:message",
  session,
  ratelimit({
    scope: "user",
    tag: "messageDelete",
    max: 20,
    time: 15,
    params: true,
  }),
  user,
  async (req, res) => {
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

    if (message.type === "file") {
      await req.deps.db.collection("files").deleteOne({
        _id: message.body,
      });
    }

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

    res.end();
  }
);

app.post(
  "/:channel/avatar",
  session,
  ratelimit({
    scope: "user",
    tag: "setChannelAvatar",
    max: 5,
    time: 60,
    params: true,
  }),
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
        const data = Buffer.concat(bufs);

        if (data.length > 1024 * 1024 * 10) {
          res.status(400).json({
            error: "Avatar too large (10MB max)",
          });
        }

        const tmp = fs.mkdtempSync(`${os.tmpdir()}/`);
        fs.writeFileSync(`${tmp}/input.dat`, data);

        try {
          const probed = JSON.parse(
            proc
              .execSync(
                [
                  "ffprobe",
                  `-i ${tmp}/input.dat`,
                  "-of json",
                  "-show_format",
                  "-show_streams",
                  "-v quiet",
                ].join(" "),
                {
                  timeout: 1000 * 10, //15s
                }
              )
              .toString()
          );

          let type;
          let cropWidth;
          let cropX = 0;
          let cropY = 0;

          if (probed.streams[0].width > probed.streams[0].height) {
            cropWidth = probed.streams[0].height;
            cropX = (probed.streams[0].width - cropWidth) / 2;
            cropY = 0;
          } else {
            cropWidth = probed.streams[0].width;
            cropX = 0;
            cropY = (probed.streams[0].height - cropWidth) / 2;
          }

          //image has more than 1 frame.
          if (probed.streams[0].nb_frames === "N/A") {
            type = "image/webp";

            proc.execSync(
              [
                "ffmpeg",
                `-f ${probed.format.format_name}`,
                `-i ${tmp}/input.dat`,
                "-c:v libwebp",
                "-qscale 80",
                "-pix_fmt yuv420p",
                "-frames:v 1",
                `-vf crop=${cropWidth}:${cropWidth}:${cropX}:${cropY},scale=256:256`,
                `-f webp`,
                `-y ${tmp}/output.dat`,
              ].join(" "),
              {
                stdio: "ignore",
                timeout: 1000 * 60, //1m
              }
            );
          } else {
            type = "video/mp4";

            let filters = [
              `[0]crop=${cropWidth}:${cropWidth}:${cropX}:${cropY}[fg]`,
              "[fg]scale=256:256[fg]",
              ...(probed.streams[0].nb_frames / probed.streams[0].duration > 30 //fps>30 effectively.
                ? [`[fg]fps=30[fg]`]
                : []),
              ,
              "[1]scale=256:256[bg]",
              "[bg]setsar=1[bg]",
              "[bg][fg]overlay=shortest=1",
            ].filter((i) => i); //remove any empty items.

            proc.execSync(
              [
                "ffmpeg",
                `-f ${probed.format.format_name}`,
                `-i ${tmp}/input.dat`,
                "-f lavfi",
                "-i color=202023",
                `-filter_complex '${filters.join(",")}'`,
                "-an",
                "-c:v libx264",
                "-crf 30",
                "-preset veryfast",
                "-profile:v high",
                "-pix_fmt yuv420p",
                `-f mp4`,
                `-y ${tmp}/output.dat`,
              ].join(" "),
              {
                stdio: "ignore",
                timeout: 1000 * 60, //1m
              }
            );
          }

          const data = fs.readFileSync(`${tmp}/output.dat`);
          const hash = crypto
            .createHash("sha256")
            .update(data)
            .digest();

          let avatar = await req.deps.db.collection("avatars").findOne({
            hash,
          });

          if (!avatar) {
            avatar = (
              await req.deps.db.collection("avatars").insertOne({
                hash,
                data,
                type,
              })
            ).ops[0];
          }

          await req.deps.db.collection("channels").updateOne(channel, {
            $set: {
              avatar: avatar._id,
            },
          });

          if (
            !(await req.deps.db.collection("users").findOne({
              avatar: channel.avatar,
            })) &&
            !(await req.deps.db.collection("channels").findOne({
              avatar: channel.avatar,
            }))
          ) {
            await req.deps.db.collection("avatars").deleteOne({
              _id: channel.avatar,
            });
          }

          const message = (
            await req.deps.db.collection("messages").insertOne({
              channel: channel._id,
              sender: req.session.user,
              time: new Date(),
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
        } catch (e) {
          res.status(400).json({
            error: "Invalid or unsupported image format",
          });
        }
      });
    });

    req.pipe(bb);
  }
);

app.post(
  "/:channel/users",
  session,
  ratelimit({
    scope: "user",
    tag: "addChannelUser",
    max: 50,
    time: 60 * 5,
    params: true,
  }),
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
            added: new Date(),
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
            avatar: targetUser.avatar?.toString(),
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
        avatar: user.avatar?.toString(),
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
        avatar: channel.avatar && channel.avatar?.toString(),
        writable: channel.writable,
        users: users.filter((u) => u.id !== req.body.user),
      },
    });

    const message = (
      await req.deps.db.collection("messages").insertOne({
        channel: channel._id,
        time: new Date(),
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

app.delete(
  "/:channel/users/:user",
  session,
  ratelimit({
    scope: "user",
    tag: "removeChannelUser",
    max: 100,
    time: 60 * 5,
  }),
  async (req, res) => {
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

    if (
      !channel.users.find((u) => u.id.equals(new ObjectId(req.params.user)))
    ) {
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
        time: new Date(),
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

    res.end();
  }
);

app.post(
  "/:channel/leave",
  session,
  ratelimit({
    scope: "user",
    tag: "leaveChannel",
    max: 20,
    time: 60,
  }),
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
      return res.status(404).json({
        error: "Channel not found",
      });
    }

    if (channel.type === "dm") {
      return res.status(400).json({
        error: "You cannot leave a DM channel",
      });
    }

    if (channel.users.filter((user) => !user.removed).length === 1) {
      await req.deps.db.collection("channels").deleteOne(channel);

      const messages = await (
        await req.deps.db.collection("messages").find({
          channel: channel._id,
        })
      ).toArray();

      for (const message of messages) {
        await req.deps.db.collection("messages").deleteOne(message);

        if (message.type === "file") {
          await req.deps.db.collection("files").deleteOne({
            _id: message.body,
          });
        }
      }
    } else {
      await req.deps.db.collection("channels").updateOne(
        {
          _id: channel._id,
          users: {
            $elemMatch: {
              id: req.session.user,
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
          sender: req.session.user,
          type: "channelUserLeave",
          time: new Date(),
          body: null,
          keys: null,
        })
      ).ops[0];

      for (const user of channel.users
        .filter((user) => !user.removed)
        .filter((user) => !user.id.equals(req.session.user))) {
        await req.deps.redis.publish(`user:${user.id}`, {
          t: "channelUser",
          d: {
            channel: channel._id.toString(),
            id: req.session.user.toString(),
            removed: true,
          },
        });

        await req.deps.redis.publish(`user:${user.id}`, {
          t: "message",
          d: {
            channel: channel._id.toString(),
            id: message._id.toString(),
            sender: message.sender.toString(),
            type: message.type,
            body: message.body,
            key: null,
          },
        });
      }
    }

    await req.deps.redis.publish(`user:${req.session.user}`, {
      t: "channel",
      d: {
        id: channel._id.toString(),
        delete: true,
      },
    });

    res.end();
  }
);

app.post(
  "/:id/files",
  session,
  ratelimit({
    scope: "user",
    tag: "uploadFile",
    max: 20,
    time: 60 * 5,
  }),
  user,
  validation(
    Joi.object({
      body: Joi.string()
        .required()
        .max(Math.ceil(((1024 * 1024 * 10 + 24) / 3) * 4)) //10MB file size.
        .base64(),
      fileName: Joi.string()
        .required()
        .max(Math.ceil(((255 + 24) / 3) * 4)) //255 chars is the limit on most platforms.
        .base64(),
      fileType: Joi.string()
        .required()
        .max(Math.ceil(((127 + 24) / 3) * 4)) //127 chars is the longest mime type.
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

    const file = (
      await req.deps.db.collection("files").insertOne({
        time: new Date(),
        body: Buffer.from(req.body.body, "base64"),
        channel: channel._id,
      })
    ).ops[0];

    const message = (
      await req.deps.db.collection("messages").insertOne({
        time: new Date(),
        channel: channel._id,
        type: "file",
        sender: req.session.user,
        body: file._id,
        fileName: Buffer.from(req.body.fileName, "base64"),
        fileType: Buffer.from(req.body.fileType, "base64"),
        fileLength: file.body.length,
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
          body: message.body.toString(),
          fileName: message.fileName,
          fileType: message.fileType,
          fileLength: message.fileLength,
          key: message.keys.find((k) => k.id.equals(channelUser.id)).key,
        },
      });
    }

    res.end();
  }
);

app.get(
  "/:channel/files/:file",
  session,
  ratelimit({
    scope: "user",
    tag: "getFile",
    max: 100,
    time: 60 * 2,
  }),
  ratelimit({
    scope: "user",
    tag: "getFile",
    max: 10,
    time: 60,
    params: true, //will count per-file.
  }),
  async (req, res) => {
    if (!ObjectId.isValid(req.params.channel)) {
      return res.status(400).json({
        error: "Invalid channel",
      });
    }

    if (!ObjectId.isValid(req.params.file)) {
      return res.status(400).json({
        error: "Invalid file",
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
      writable: true,
    });

    if (!channel) {
      res.status(404).json({
        error: "Channel not found",
      });

      return;
    }

    const file = await req.deps.db.collection("files").findOne({
      _id: new ObjectId(req.params.file),
      channel: channel._id,
    });

    if (!file) {
      res.status(404).json({
        error: "File not found",
      });

      return;
    }

    res.set("content-type", "application/octet-stream");
    res.set("cache-control", "public, max-age=31536000");
    res.end(file.body.buffer);
  }
);

module.exports = app;
