const { ObjectId } = require("mongodb");

module.exports = async (data, ws, deps) => {
  const channel = await deps.db.collection("channels").findOne({
    _id: new ObjectId(data),
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
        error: "invalid-voice-channel",
      },
    });

    return ws.close();
  }

  ws.voiceChannel = channel._id;
  ws.voiceSocks = [];

  [...deps.wss.clients]
    .filter((w) => w !== ws)
    .filter((w) => w.voiceChannel?.equals(channel._id))
    .map((w) => {
      w.voiceSocks.push(ws);
      ws.voiceSocks.push(w);
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
              voiceConnected: true,
            },
          });
        });
    });
};
