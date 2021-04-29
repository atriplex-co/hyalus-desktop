const express = require("express");
const app = express.Router();
const sessionMiddleware = require("../middleware/session");
const userMiddleware = require("../middleware/user");
const validMiddleware = require("../middleware/validation");
const Joi = require("joi");
const { authenticator } = require("otplib");
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const ratelimit = require("../middleware/ratelimit");

app.get(
  "/init",
  sessionMiddleware,
  ratelimit({
    scope: "user",
    tag: "totpInit",
    max: 50,
    time: 60 * 15,
  }),
  userMiddleware,
  async (req, res) => {
    if (req.user.totpSecret) {
      res.status(400).json({
        error: "TOTP is already enabled on your account",
      });

      return;
    }

    const secret = authenticator.generateSecret();

    const ticket = (
      await req.deps.db.collection("tickets").insertOne({
        type: "totpEnable",
        user: req.user._id,
        expires: new Date(Date.now() + 1000 * 60 * 15), //15m
        token: crypto.randomBytes(32),
        totpSecret: secret,
      })
    ).ops[0];

    res.json({
      ticket: ticket.token.toString("base64"),
      secret: ticket.totpSecret,
    });
  }
);

app.post(
  "/enable",
  sessionMiddleware,
  ratelimit({
    scope: "user",
    tag: "totpEnable",
    max: 5,
    time: 60 * 15,
  }),
  userMiddleware,
  validMiddleware(
    Joi.object({
      ticket: Joi.string()
        .required()
        .base64()
        .length(44),
      authKey: Joi.string()
        .required()
        .base64()
        .length(44),
      code: Joi.string()
        .required()
        .regex(/\d{6}/),
    })
  ),
  async (req, res) => {
    if (req.user.totpSecret) {
      res.status(400).json({
        error: "TOTP is already enabled on your account",
      });

      return;
    }

    const ticket = await req.deps.db.collection("tickets").findOne({
      type: "totpEnable",
      token: Buffer.from(req.body.ticket, "base64"),
      user: req.user._id,
    });

    if (!ticket) {
      res.status(400).json({
        error: "Invalid ticket",
      });

      return;
    }

    if (
      req.user.authKey.buffer.compare(Buffer.from(req.body.authKey, "base64"))
    ) {
      res.status(400).json({
        error: "Invalid password",
      });

      return;
    }

    if (req.body.code !== authenticator.generate(ticket.totpSecret)) {
      res.status(400).json({
        error: "Invalid TOTP code",
      });

      return;
    }

    await req.deps.db.collection("users").updateOne(req.user, {
      $set: {
        totpSecret: ticket.totpSecret,
      },
    });

    await req.deps.db.collection("tickets").deleteOne(ticket);

    req.deps.redis.publish(`user:${req.user._id}`, {
      t: "user",
      d: {
        totpEnabled: true,
      },
    });

    res.end();
  }
);

app.post(
  "/disable",
  sessionMiddleware,
  ratelimit({
    scope: "user",
    tag: "totpDisable",
    max: 5,
    time: 60 * 15,
  }),
  userMiddleware,
  validMiddleware(
    Joi.object({
      authKey: Joi.string()
        .required()
        .base64()
        .length(44),
    })
  ),
  async (req, res) => {
    if (!req.user.totpSecret) {
      res.status(400).json({
        error: "TOTP isn't enabled on your account",
      });

      return;
    }

    if (
      req.user.authKey.buffer.compare(Buffer.from(req.body.authKey, "base64"))
    ) {
      res.status(400).json({
        error: "Invalid password",
      });

      return;
    }

    await req.deps.db.collection("users").updateOne(req.user, {
      $set: {
        totpSecret: null,
      },
    });

    req.deps.redis.publish(`user:${req.user._id}`, {
      t: "user",
      d: {
        totpEnabled: false,
      },
    });

    res.end();
  }
);

app.post(
  "/login",
  ratelimit({
    scope: "ip",
    tag: "totpLogin",
    max: 10,
    time: 60 * 5,
  }),
  validMiddleware(
    Joi.object({
      ticket: Joi.string()
        .required()
        .base64()
        .length(44),
      code: Joi.string()
        .required()
        .regex(/\d{6}/),
    })
  ),
  async (req, res) => {
    const ticket = await req.deps.db.collection("tickets").findOne({
      type: "totpLogin",
      token: Buffer.from(req.body.ticket, "base64"),
    });

    if (!ticket) {
      res.status(400).json({
        error: "Invalid ticket",
      });

      return;
    }

    if (req.body.code !== authenticator.generate(ticket.totpSecret)) {
      res.status(400).json({
        error: "Invalid TOTP code",
      });

      return;
    }

    await req.deps.db.collection("tickets").deleteOne(ticket);

    const user = await req.deps.db.collection("users").findOne({
      _id: ticket.user,
    });

    const session = (
      await req.deps.db.collection("sessions").insertOne({
        user: user._id,
        token: crypto.randomBytes(32),
        createdAt: new Date(),
        updatedAt: new Date(),
        ip: req.ip,
        device: req.headers["user-agent"],
        active: true,
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
