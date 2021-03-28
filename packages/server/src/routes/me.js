const express = require("express");
const app = express.Router();
const session = require("../middleware/session");
const user = require("../middleware/user");
const validation = require("../middleware/validation");
const Joi = require("joi");

app.get("/", session, user, async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    avatar: req.user.avatar,
    createdAt: req.user.createdAt,
    updatedAt: req.user.updatedAt,
    totpEnabled: Boolean(req.user.totpSecret),
  });
});

app.post(
  "/",
  session,
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
        error: "Username already in use.",
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

      delete req.body.oldAuthKey;
    } else if (passwordChangeKeywords) {
      res.status(400).json({
        error: "Invalid data for setting password.",
      });

      return;
    }

    await req.deps.db.collection("users").updateOne(req.user, {
      $set: req.body,
    });

    res.end();

    delete req.body.salt;
    delete req.body.authKey;
    delete req.body.encryptedPrivateKey;

    if (Object.keys(req.body).length) {
      req.deps.wss.send((w) => w.session.user.equals(req.user._id), {
        t: "user",
        d: req.body,
      });
    }
  }
);

module.exports = app;
