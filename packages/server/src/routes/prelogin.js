const express = require("express");
const app = express.Router();
const validation = require("../middleware/validation");
const Joi = require("joi");
const ratelimit = require("../middleware/ratelimit");

app.post(
  "/",
  ratelimit({
    scope: "ip",
    tag: "prelogin",
    max: 10,
    time: 60 * 5,
  }),
  validation(
    Joi.object({
      username: Joi.string()
        .required()
        .regex(/^[a-zA-Z0-9_.-]{3,32}$/),
    })
  ),
  async (req, res) => {
    req.body.username = req.body.username.toLowerCase();

    const user = await req.deps.db.collection("users").findOne({
      username: req.body.username,
    });

    if (!user) {
      res.status(400).json({
        error: "Username not found",
      });

      return;
    }

    res.json({
      salt: user.salt.toString("base64"),
    });
  }
);

module.exports = app;
