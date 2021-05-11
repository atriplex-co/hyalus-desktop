const Joi = require("joi");

module.exports = async (req, res, next) => {
  const token = req.headers.auth;

  if (!token) {
    res.status(401).json({
      error: "Missing token",
    });

    return;
  }

  if (
    Joi.string()
      .required()
      .base64()
      .length(44)
      .validate(req.headers.auth).error
  ) {
    res.status(400).json({
      error: "Invalid token",
    });

    return;
  }

  const session = await req.deps.db.collection("sessions").findOne({
    token: Buffer.from(token, "base64"),
  });

  if (!session) {
    res.status(401).json({
      error: "Invalid session",
    });

    return;
  }

  req.session = session;

  next();
};
