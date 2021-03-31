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
    return;
  }

  for (const user of channel.users
    .filter((u) => !u.removed)
    .filter((u) => !u.id.equals(ws.session.user))) {
    await ws.deps.redis.publish(`user:${user.id}`, {
      t: "channelUser",
      d: {
        id: ws.session.user.toString(),
        channel: channel._id.toString(),
        lastTyping: Date.now(),
      },
    });
  }

  await ws.deps.redis.set(
    `typing_time:${ws.session.user}`,
    Date.now(),
    "ex",
    5
  );

  await ws.deps.redis.set(
    `typing_channel:${ws.session.user}`,
    channel._id,
    "ex",
    5
  );
};
