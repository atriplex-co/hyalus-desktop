module.exports = async (ws, msg) => {
  if (!ws.voiceChannel) {
    return;
  }

  const channel = await ws.deps.db.collection("channels").findOne({
    _id: ws.voiceChannel,
  });

  for (const user of channel.users
    .filter((u) => !u.removed)
    .filter((u) => !u.id.equals(ws.session.user))) {
    await ws.deps.redis.publish(`user:${user.id}`, {
      t: "channelUser",
      d: {
        id: ws.session.user.toString(),
        channel: channel._id.toString(),
        voiceConnected: false,
      },
    });
  }

  await ws.deps.redis.del(`voice_ws:${ws.session.user}`);
  await ws.deps.redis.del(`voice_channel:${ws.session.user}`);

  if (
    ![...ws.deps.wss.clients].find(
      (w) => w.voiceChannel && w.voiceChannel.equals(ws.voiceChannel)
    )
  ) {
    await ws.deps.redisSub.unsubscribe(`voice:${ws.voiceChannel}`);
  }

  ws.voiceChannel = null;
};
