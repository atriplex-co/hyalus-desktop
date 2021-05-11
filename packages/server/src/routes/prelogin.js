const express = require("express");
const app = express.Router();
const Joi = require("joi");
const validationMiddleware = require("../middleware/validation");
const ratelimitMiddleware = require("../middleware/ratelimit");

app.post(
  "/",
  ratelimitMiddleware({
    scope: "ip",
    tag: "prelogin",
    max: 10,
    time: 60 * 5,
  }),
  validationMiddleware(
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
