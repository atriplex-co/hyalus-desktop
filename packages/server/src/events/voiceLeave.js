module.exports = async (data, ws, deps) => {
  if (!ws.voiceChannel) {
    return;
  }

  ws.voiceSocks.map((w) => {
    w.voiceSocks = w.voiceSocks.filter((a) => a !== ws);
  });

  const channel = await deps.db.collection("channels").findOne({
    _id: ws.voiceChannel,
  });

  channel.users
    .filter((u) => !u.removed)
    .filter((u) => !u.id.equals(ws.session.user))
    .map(({ id }) => {
      [...deps.wss.clients]
        .filter((w) => w.session.user.equals(id))
        .map((w) => {
          w.send({
            t: "channelUser",
            d: {
              channel: channel._id.toString(),
              id: ws.session.user.toString(),
              voiceConnected: false,
            },
          });
        });
    });

  ws.voiceChannel = null;
  ws.voiceSocks = null;
};
