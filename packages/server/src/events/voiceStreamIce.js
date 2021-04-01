const Joi = require("joi");

module.exports = async (ws, msg) => {
  if (!ws.voiceChannel) {
    return;
  }

  msg.candidate = Buffer.from(msg.candidate);

  if (
    Joi.object({
      user: Joi.string()
        .required()
        .length(24)
        .hex(),
      type: Joi.string()
        .required()
        .valid("audio", "video", "displayVideo", "displayAudio"),
      candidate: Joi.binary().required(),
      initiator: Joi.bool().required(),
    })
      .required()
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

  const targetVoiceChannel = await ws.deps.redis.get(
    `voice_channel:${msg.user}`
  );

  if (!ws.voiceChannel.equals(targetVoiceChannel)) {
    return;
  }

  const targetVoiceWs = await ws.deps.redis.get(`voice_ws:${msg.user}`);

  await ws.deps.redis.publish(`ws:${targetVoiceWs}`, {
    t: "voiceStreamIce",
    d: {
      user: ws.session.user.toString(),
      type: msg.type,
      candidate: msg.candidate,
      initiator: msg.initiator,
    },
  });
};
