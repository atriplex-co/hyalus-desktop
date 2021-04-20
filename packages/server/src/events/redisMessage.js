const msgpack = require("msgpack-lite");

module.exports = (deps) => (chan, msg) => {
  chan = chan.toString().split(":");
  msg = msgpack.decode(msg);

  const targets = [];

  if (chan[0] === "ws") {
    targets.push(...[...deps.wss.clients].filter((w) => w.id === chan[1]));
  }

  if (chan[0] === "user") {
    targets.push(
      ...[...deps.wss.clients].filter(
        (w) => w.session && w.session.user.equals(chan[1])
      )
    );
  }

  if (chan[0] === "voice") {
    targets.push(
      ...[...deps.wss.clients].filter(
        (w) => w.voiceChannel && w.voiceChannel.equals(chan[1])
      )
    );
  }

  if (chan[0] === "session") {
    targets.push(
      ...[...deps.wss.clients].filter(
        (w) => w.session && w.session._id.equals(chan[1])
      )
    );
  }

  for (const w of targets) {
    w.send(msg);

    if (msg.t === "close") {
      w.close();
    }

    if (msg.t === "voiceKick") {
      w.voiceChannel = null;
    }
  }
};
