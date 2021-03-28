module.exports = (data, ws, deps) => {
  ws.voiceSocks
    .find((w) => w.session.user.equals(data.user))
    .send({
      t: "voiceStreamOffer",
      d: {
        user: ws.session.user.toString(),
        type: data.type,
        sdp: data.sdp,
      },
    });
};
