const msgpack = require("msgpack-lite");

module.exports = (deps) => (chan, msg) => {
  chan = chan.toString().split(":");
  msg = msgpack.decode(msg);

  if (chan[0] === "ws") {
    [...deps.wss.clients]
      .filter((w) => w.id === chan[1])
      .map((w) => {
        console.log({ chan, msg });
        w.send(msg);
      });
  }

  if (chan[0] === "user") {
    [...deps.wss.clients]
      .filter((w) => w.session && w.session.user.equals(chan[1]))
      .map((w) => {
        w.send(msg);
      });
  }

  if (chan[0] === "voice") {
    [...deps.wss.clients]
      .filter((w) => w.voiceChannel && w.voiceChannel.equals(chan[1]))
      .map((w) => {
        w.send(msg);
      });
  }
};
