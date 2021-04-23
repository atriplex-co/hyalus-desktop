const express = require("express");
const app = express.Router();
const session = require("../middleware/session");
const user = require("../middleware/user");
const validation = require("../middleware/validation");
const Joi = require("joi");
const ratelimit = require("../middleware/ratelimit");

app.post(
  "/",
  session,
  ratelimit({
    scope: "user",
    tag: "updateUser",
    max: 50,
    time: 60 * 5,
  }),
  user,
  validation(
    Joi.object({
      name: Joi.string()
        .min(1)
        .max(32),
      username: Joi.string()
        .min(3)
        .max(32)
        .alphanum(),
      salt: Joi.string()
        .length(24)
        .base64(),
      authKey: Joi.string()
        .length(44)
        .base64(),
      oldAuthKey: Joi.string()
        .length(44)
        .base64(),
      encryptedPrivateKey: Joi.string()
        .length(96)
        .base64(),
      accentColor: Joi.string().valid(
        "red",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "lightBlue",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose"
      ),
    })
  ),
  async (req, res) => {
    if (
      req.body.username &&
      (await req.deps.db.collection("users").findOne({
        username: req.body.username,
      }))
    ) {
      return res.status(400).json({
        error: "Username already in use",
      });
    }

    const passwordChangeKeywords = [
      "salt",
      "authKey",
      "oldAuthKey",
      "encryptedPrivateKey",
    ].filter((a) => a in req.body).length;

    if (passwordChangeKeywords === 4) {
      req.body.salt = Buffer.from(req.body.salt, "base64");
      req.body.authKey = Buffer.from(req.body.authKey, "base64");
      req.body.oldAuthKey = Buffer.from(req.body.oldAuthKey, "base64");
      req.body.encryptedPrivateKey = Buffer.from(
        req.body.encryptedPrivateKey,
        "base64"
      );

      if (req.user.authKey.buffer.compare(req.body.oldAuthKey)) {
        res.status(400).json({
          error: "Invalid password",
        });

        return;
      }

      //fields that should not be saved in the db under the user.
      delete req.body.oldAuthKey;

      //log out all other sessions.
      const sessions = await (
        await req.deps.db.collection("sessions").find({
          _id: {
            $ne: req.session._id,
          },
          user: req.session.user,
        })
      ).toArray();

      for (const session of sessions) {
        await req.deps.db.collection("sessions").deleteOne(session);

        await req.deps.redis.publish(`session:${session._id}`, {
          t: "close",
          d: {
            reset: true,
          },
        });
      }
    } else if (passwordChangeKeywords) {
      res.status(400).json({
        error: "Invalid data for setting password",
      });

      return;
    }

    await req.deps.db.collection("users").updateOne(req.user, {
      $set: req.body,
    });

    res.end();

    //fields that should not be exposed to other users.
    //or the user in general (via the $store.state.user object).
    delete req.body.salt;
    delete req.body.authKey;
    delete req.body.encryptedPrivateKey;

    if (Object.keys(req.body).length) {
      req.deps.redis.publish(`user:${req.session.user}`, {
        t: "user",
        d: req.body,
      });
    }

    //fields that should not be exposed outside of the current user.
    delete req.body.accentColor;

    if (Object.keys(req.body).length) {
      const targets = [];

      //propegate changes to friends
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

      for (const friend of friends) {
        let userId;

        if (friend.initiator.equals(req.session.user)) {
          userId = friend.target;
        }

        if (friend.target.equals(req.session.user)) {
          userId = friend.initiator;
        }

        targets.push(userId);
      }

      //propegate changes to channels
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

      for (const channel of channels) {
        for (const channelUser of channel.users
          .filter((u) => !u.removed)
          .filter((u) => !u.id.equals(req.session.user))) {
          targets.push(channelUser.id);
        }
      }

      for (const target of new Set(targets.map((t) => t.toString()))) {
        await req.deps.redis.publish(`user:${target}`, {
          t: "foreignUser",
          d: {
            id: req.session.user.toString(),
            ...req.body,
          },
        });
      }
    }
  }
);

module.exports = app;
