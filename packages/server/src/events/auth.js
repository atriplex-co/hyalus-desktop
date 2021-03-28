const Joi = require("joi");

module.exports = async (data, ws, deps) => {
  if (
    Joi.string()
      .required()
      .length(44)
      .base64()
      .validate(data.token).error
  ) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-token",
      },
    });

    return ws.close();
  }

  const session = await deps.db.collection("sessions").findOne({
    token: Buffer.from(data.token, "base64"),
  });

  if (!session) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-token",
      },
    });

    return ws.close();
  }

  ws.session = session;
};
