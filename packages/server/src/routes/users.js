const express = require("express");
const app = express.Router();
const ratelimit = require("../middleware/ratelimit");
const Joi = require("joi");

app.get(
  "/:username",
  ratelimit({
    scope: "ip",
    tag: "getUser",
    max: 20,
    time: 60,
  }),
  async (req, res) => {
    req.params.username = req.params.username.toLowerCase();

    if (
      Joi.string()
        .required()
        .regex(/^[a-zA-Z0-9_.-]{3,32}$/)
        .validate(req.params.username).error
    ) {
      return res.status(400).json({
        error: "Invalid username",
      });
    }

    const user = await req.deps.db.collection("users").findOne({
      username: req.params.username,
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      username: user.username,
    });
  }
);

module.exports = app;
