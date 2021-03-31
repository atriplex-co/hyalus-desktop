const crypto = require("crypto");
const msgpack = require("msgpack-lite");

const keepaliveInterval = 30e3;
const keepaliveTimeout = 120e3;

module.exports = (deps) => (ws) => {
  ws.id = crypto.randomBytes(32).toString("base64");

  ws._send = ws.send;
  ws.send = (data) => {
    ws._send(msgpack.encode(data));
  };

  ws.send({
    t: "hello",
    d: {
      proto: 1,
      keepalive: keepaliveInterval,
    },
  });

  ws.keepaliveChecker = setInterval(() => {
    if (ws.lastKeepalive < Date.now - keepaliveTimeout) {
      ws.close();
    }
  }, keepaliveInterval);

  ws.lastKeepalive = Date.now();

  ws.on("message", async (data) => {
    try {
      const _data = data;
      data = msgpack.decode(data);

      if (data.t === "auth") {
        return require("../events/auth")(data.d, ws, deps);
      }

      if (data.t === "keepalive") {
        return require("../events/keepalive")(data.d, ws, deps);
      }

      if (!ws.session) {
        ws.send({
          t: "close",
          d: {
            reason: "invalid-auth",
          },
        });

        return ws.close();
      }

      if (data.t === "voiceJoin") {
        return require("../events/voiceJoin")(data.d, ws, deps);
      }

      if (data.t === "voiceLeave") {
        return require("../events/voiceLeave")(data.d, ws, deps);
      }

      if (data.t === "voiceStreamOffer") {
        return require("../events/voiceStreamOffer")(data.d, ws, deps);
      }

      if (data.t === "voiceStreamAnswer") {
        return require("../events/voiceStreamAnswer")(data.d, ws, deps);
      }

      if (data.t === "voiceStreamEnd") {
        return require("../events/voiceStreamEnd")(data.d, ws, deps);
      }

      //TODO: implement stream pausing & resuming.

      // if (data.t === "voiceStreamPause") {
      //   return require("../events/voiceStreamPause")(data.d, ws, deps);
      // }

      // if (data.t === "voiceStreamResume") {
      //   return require("../events/voiceStreamResume")(data.d, ws, deps);
      // }

      ws.send({
        t: "close",
        d: {
          reason: "invalid-message",
        },
      });

      ws.close();
    } catch (e) {
      console.log("Disconnecting WS due to error");
      console.log(e);

      ws.send({
        t: "close",
        d: {
          reason: "server-error",
        },
      });

      ws.close();
    }
  });

  ws.on("close", async () => {
    clearInterval(ws.keepaliveChecker);

    require("../events/voiceLeave")({}, ws, deps);
  });
};
