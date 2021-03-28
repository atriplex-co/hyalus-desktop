module.exports = (data, ws, deps) => {
  ws.voiceSocks.map((w) => {
    w.send({
      t: "voiceStreamEnd",
      d: {
        user: ws.session.user.toString(),
        type: data,
      },
    });
  });
};
