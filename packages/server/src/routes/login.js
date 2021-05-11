const crypto = require("crypto");
const express = require("express");
const Joi = require("joi");
const app = express.Router();
const validationMiddleware = require("../middleware/validation");
const ratelimitMiddleware = require("../middleware/ratelimit");

app.post(
  "/",
  ratelimitMiddleware({
    scope: "ip",
    tag: "login",
    max: 10,
    time: 60 * 5,
  }),
  validationMiddleware(
    Joi.object({
      username: Joi.string()
        .required()
        .regex(/^[a-zA-Z0-9_.-]{3,32}$/),
      authKey: Joi.string()
        .length(44)
        .base64()
        .required(),
    })
  ),
  async (req, res) => {
    req.body.username = req.body.username.toLowerCase();

    const user = await req.deps.db.collection("users").findOne({
      username: req.body.username,
    });

    if (
      !user ||
      user.authKey.buffer.compare(Buffer.from(req.body.authKey, "base64"))
    ) {
      res.status(400).json({
        error: "Invalid credentials",
      });

      return;
    }

    if (user.totpSecret) {
      const ticket = (
        await req.deps.db.collection("tickets").insertOne({
          type: "totpLogin",
          expires: new Date(Date.now() + 1000 * 60 * 15), //15m
          token: crypto.randomBytes(32),
          user: user._id,
          totpSecret: user.totpSecret,
        })
      ).ops[0];

      res.json({
        totpRequired: true,
        ticket: ticket.token.toString("base64"),
      });

      return;
    }

    const session = (
      await req.deps.db.collection("sessions").insertOne({
        user: user._id,
        token: crypto.randomBytes(32),
        ip: req.ip,
        agent: req.headers["user-agent"],
        created: new Date(),
        lastActive: new Date(),
      })
    ).ops[0];

    res.json({
      token: session.token.toString("base64"),
      publicKey: user.publicKey.toString("base64"),
      encryptedPrivateKey: user.encryptedPrivateKey.toString("base64"),
    });
  }
);

module.exports = app;
