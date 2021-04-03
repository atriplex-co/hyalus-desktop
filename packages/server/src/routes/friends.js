const express = require("express");
const Joi = require("joi");
const app = express.Router();
const session = require("../middleware/session");
const user = require("../middleware/user");
const validation = require("../middleware/validation");
const { ObjectId } = require("mongodb");

app.get("/", session, async (req, res) => {
  const friends = await (
    await req.deps.db.collection("friends").find({
      $or: [
        {
          initiator: req.session.user,
        },
        {
          target: req.session.user,
        },
      ],
    })
  ).toArray();

  const formatted = [];

  for (const friend of friends) {
    let userId;

    if (friend.initiator.equals(req.session.user)) {
      userId = friend.target;
    }

    if (friend.target.equals(req.session.user)) {
      userId = friend.initiator;
    }

    const user = await req.deps.db.collection("users").findOne({
      _id: userId,
    });

    formatted.push({
      id: friend._id,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        username: user.username,
      },
      accepted: friend.accepted,
      acceptable: !friend.accepted && friend.target.equals(req.session.user),
      updatedAt: friend.updatedAt,
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
      username: Joi.string()
        .required()
        .regex(/^[a-zA-Z0-9_.-]{3,32}$/),
    })
  ),
  async (req, res) => {
    req.body.username = req.body.username.toLowerCase();

    if (req.body.username === req.user.username) {
      res.status(400).json({
        error: "You can't friend yourself",
      });

      return;
    }

    const user = await req.deps.db.collection("users").findOne({
      username: req.body.username,
    });

    if (!user) {
      res.status(400).json({
        error: "Username doesn't exist",
      });

      return;
    }

    const existingFriend = await req.deps.db.collection("friends").findOne({
      $or: [
        {
          initiator: req.session.user,
          target: user._id,
        },
        {
          initator: user._id,
          target: req.session.user,
        },
      ],
    });

    if (existingFriend) {
      if (existingFriend.accepted) {
        res.status(400).json({
          error: "You are already frineds",
        });
      } else {
        res.status(400).json({
          error: "You already have a pending friend request",
        });
      }

      return;
    }

    const friend = (
      await req.deps.db.collection("friends").insertOne({
        initiator: req.session.user,
        target: user._id,
        accepted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).ops[0];

    req.deps.redis.publish(`user:${req.session.user}`, {
      t: "friend",
      d: {
        id: friend._id.toString(),
        user: {
          id: user._id.toString(),
          name: user.name,
          avatar: user.avatar.toString(),
          username: user.username,
        },
        accepted: false,
        acceptable: false,
      },
    });

    req.deps.redis.publish(`user:${user._id}`, {
      t: "friend",
      d: {
        id: friend._id.toString(),
        user: {
          id: req.user._id.toString(),
          name: req.user.name,
          avatar: req.user.avatar.toString(),
          username: req.user.username,
        },
        accepted: false,
        acceptable: true,
      },
    });

    res.end();
  }
);

app.post(
  "/accept",
  session,
  user,
  validation(
    Joi.object({
      id: Joi.string()
        .required()
        .length(24)
        .hex(),
    })
  ),
  async (req, res) => {
    const friend = await req.deps.db.collection("friends").findOne({
      _id: new ObjectId(req.body.id),
    });

    if (!friend) {
      res.status(404).json({
        error: "Friend does not exist",
      });

      return;
    }

    if (friend.accepted) {
      res.status(400).json({
        error: "Friend request already accepted",
      });

      return;
    }

    if (friend.initiator.equals(req.session.user)) {
      res.status(400).json({
        error: "You can't accept this request",
      });

      return;
    }

    await req.deps.db.collection("friends").updateOne(friend, {
      $set: {
        accepted: true,
        updatedAt: Date.now(),
      },
    });

    req.deps.redis.publish(`user:${friend.initiator}`, {
      t: "friend",
      d: {
        id: friend._id.toString(),
        accepted: true,
        updatedAt: Date.now(),
      },
    });

    req.deps.redis.publish(`user:${friend.target}`, {
      t: "friend",
      d: {
        id: friend._id.toString(),
        accepted: true,
        acceptable: false,
        updatedAt: Date.now(),
      },
    });

    let dmChannel = await req.deps.db.collection("channels").findOne({
      type: "dm",
      $and: [
        {
          users: {
            $elemMatch: {
              id: friend.initiator,
            },
          },
        },
        {
          users: {
            $elemMatch: {
              id: friend.target,
            },
          },
        },
      ],
    });

    if (dmChannel) {
      await req.deps.db.collection("channels").updateOne(dmChannel, {
        $set: {
          writable: true,
        },
      });

      for (const dmChannelUser of dmChannel.users) {
        req.deps.redis.publish(`user:${dmChannelUser.id}`, {
          t: "channel",
          d: {
            id: dmChannel._id.toString(),
            writable: true,
          },
        });
      }
    } else {
      dmChannel = (
        await req.deps.db.collection("channels").insertOne({
          type: "dm",
          writable: true,
          created: Date.now(),
          users: [
            {
              id: friend.initiator,
              admin: false,
              removed: false,
              added: Date.now(),
            },
            {
              id: friend.target,
              admin: false,
              removed: false,
              added: Date.now(),
            },
          ],
        })
      ).ops[0];

      const initatorUser = await req.deps.db.collection("users").findOne({
        _id: friend.initiator,
      });

      req.deps.redis.publish(`user:${friend.initiator}`, {
        t: "channel",
        d: {
          id: dmChannel._id.toString(),
          type: dmChannel.type,
          writable: dmChannel.writable,
          created: dmChannel.created,
          users: [
            {
              id: req.user._id.toString(),
              name: req.user.name,
              avatar: req.user.avatar.toString(),
              username: req.user.username,
              publicKey: req.user.publicKey.toString("base64"),
            },
          ],
        },
      });

      req.deps.redis.publish(`user:${friend.target}`, {
        t: "channel",
        d: {
          id: dmChannel._id.toString(),
          type: dmChannel.type,
          writable: dmChannel.writable,
          created: dmChannel.created,
          users: [
            {
              id: initatorUser._id.toString(),
              name: initatorUser.name,
              avatar: initatorUser.avatar.toString(),
              username: initatorUser.username,
              publicKey: initatorUser.publicKey.toString("base64"),
            },
          ],
        },
      });
    }

    res.end();
  }
);

app.delete("/:id", session, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: "Invalid friend",
    });
  }

  const friend = await req.deps.db.collection("friends").findOne({
    _id: new ObjectId(req.params.id),
  });

  if (!friend) {
    res.status(404).json({
      error: "Friend does not exist",
    });

    return;
  }

  await req.deps.db.collection("friends").deleteOne(friend);

  req.deps.redis.publish(`user:${friend.initiator}`, {
    t: "friend",
    d: {
      id: friend._id.toString(),
      delete: true,
    },
  });

  req.deps.redis.publish(`user:${friend.target}`, {
    t: "friend",
    d: {
      id: friend._id.toString(),
      delete: true,
    },
  });

  const dmChannel = await req.deps.db.collection("channels").findOne({
    type: "dm",
    $and: [
      {
        users: {
          $elemMatch: {
            id: friend.initiator,
          },
        },
      },
      {
        users: {
          $elemMatch: {
            id: friend.target,
          },
        },
      },
    ],
  });

  if (dmChannel) {
    await req.deps.db.collection("channels").updateOne(dmChannel, {
      $set: {
        writable: false,
      },
    });
  }

  for (const dmChannelUser of dmChannel.users) {
    req.deps.redis.publish(`user:${dmChannelUser.id}`, {
      t: "channel",
      d: {
        id: dmChannel._id.toString(),
        writable: false,
      },
    });
  }

  res.end();
});

module.exports = app;
