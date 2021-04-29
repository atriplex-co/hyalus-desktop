const crypto = require("crypto");
const express = require("express");
const app = express.Router();
const validation = require("../middleware/validation");
const Joi = require("joi");
const ratelimit = require("../middleware/ratelimit");

app.post(
  "/",
  validation(
    Joi.object({
      username: Joi.string()
        .required()
        .regex(/^[a-zA-Z0-9_.-]{3,32}$/),
      salt: Joi.string()
        .required()
        .length(24)
        .base64(),
      authKey: Joi.string()
        .required()
        .length(44)
        .base64(),
      publicKey: Joi.string()
        .required()
        .length(44)
        .base64(),
      encryptedPrivateKey: Joi.string()
        .required()
        .length(96)
        .base64(),
    })
  ),
  ratelimit({
    scope: "ip",
    tag: "register",
    max: 3,
    time: 60 * 60 * 12,
  }),
  async (req, res, next) => {
    req.body.username = req.body.username.toLowerCase();

    if (
      await req.deps.db.collection("users").findOne({
        username: req.body.username,
      })
    ) {
      res.status(400).json({
        error: "Username already in use",
      });

      return;
    }

    const user = (
      await req.deps.db.collection("users").insertOne({
        name: req.body.username,
        username: req.body.username,
        salt: Buffer.from(req.body.salt, "base64"),
        authKey: Buffer.from(req.body.authKey, "base64"),
        publicKey: Buffer.from(req.body.publicKey, "base64"),
        encryptedPrivateKey: Buffer.from(
          req.body.encryptedPrivateKey,
          "base64"
        ),
        avatar: null,
        accentColor: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
        totpSecret: null,
        active: true,
      })
    ).ops[0];

    const session = (
      await req.deps.db.collection("sessions").insertOne({
        user: user._id,
        token: crypto.randomBytes(32),
        ipAddr: req.ip,
        userAgent: req.headers["user-agent"],
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      })
    ).ops[0];

    res.json({
      token: session.token.toString("base64"),
    });
  }
);

module.exports = app;
