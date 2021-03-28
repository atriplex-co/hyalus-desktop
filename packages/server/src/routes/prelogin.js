const express = require("express");
const app = express.Router();
const validation = require("../middleware/validation");
const Joi = require("joi");

app.post(
  "/",
  validation(
    Joi.object({
      username: Joi.string()
        .required()
        .min(3)
        .max(32)
        .alphanum(),
    })
  ),
  async (req, res) => {
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
