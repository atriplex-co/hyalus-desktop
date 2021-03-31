const Joi = require("joi");
const { ObjectId } = require("mongodb");

module.exports = async (ws, msg) => {
  if (
    Joi.string()
      .required()
      .length(24)
      .hex()
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

  const channel = await ws.deps.db.collection("channels").findOne({
    _id: new ObjectId(msg),
    users: {
      $elemMatch: {
        id: ws.session.user,
        removed: false,
      },
    },
  });

  if (!channel) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-channel",
      },
    });

    return ws.close();
  }

  const existingVoicWs = await ws.deps.redis.get(`voice_ws:${ws.session.user}`);

  if (existingVoicWs && existingVoicWs !== ws.id) {
    await ws.deps.redis.publish(`ws:${existingVoicWs}`, {
      t: "voiceKick",
    });

    await ws.deps.redis.del(`voice_ws:${ws.session.user}`);
    await ws.deps.redis.del(`voice_channel:${ws.session.user}`);
  }

  for (const user of channel.users
    .filter((u) => !u.removed)
    .filter((u) => !u.id.equals(ws.session.user))) {
    await ws.deps.redis.publish(`user:${user.id}`, {
      t: "channelUser",
      d: {
        id: ws.session.user.toString(),
        channel: channel._id.toString(),
        voiceConnected: true,
      },
    });
  }

  await ws.deps.redis.set(`voice_ws:${ws.session.user}`, ws.id);
  await ws.deps.redis.set(`voice_channel:${ws.session.user}`, channel._id);

  await ws.deps.redisSub.subscribe(`voice:${channel._id}`);

  ws.voiceChannel = channel._id;
};
