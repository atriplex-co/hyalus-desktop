const Joi = require("joi");

module.exports = async (ws, msg) => {
  if (!ws.voiceChannel) {
    return;
  }

  if (
    Joi.string()
      .required()
      .valid("audio", "video", "displayVideo", "displayAudio")
      .validate(msg).error
  ) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-data",
      },
    });

    return ws.close();
  }

  await ws.deps.redis.publish(`voice:${ws.voiceChannel}`, {
    t: "voiceStreamEnd",
    d: {
      user: ws.session.user.toString(),
      type: msg,
    },
  });
};
