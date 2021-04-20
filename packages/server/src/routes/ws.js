const WebSocket = require("ws");
const msgpack = require("msgpack-lite");
const crypto = require("crypto");

const keepalive = 30e3;

let server;
let deps;
let wss;

const setup = () => {
  wss = new WebSocket.Server({
    path: "/api/ws",
    server,
  });

  wss.on("connection", (ws) => {
    ws.deps = deps;
    ws._send = ws.send;
    ws.send = (data) => {
      ws._send(msgpack.encode(data));
    };

    ws.id = crypto.randomBytes(32).toString("base64");
    ws.alive = true;

    ws.on("message", (msg) => {
      ws.alive = true;

      try {
        msg = msgpack.decode(msg);
      } catch {
        ws.send({
          t: "close",
          d: {
            reason: "invalid-encoding",
          },
        });

        return ws.close();
      }

      const knownTypes = [
        "pong",
        "start",
        "voiceJoin",
        "voiceLeave",
        "voiceStreamOffer",
        "voiceStreamAnswer",
        "voiceStreamIce",
        "voiceStreamEnd",
        //TODO: implement voice stream pause/resume.
        // "voiceStreamResume",
        // "voiceStreamPause",
        "messageTyping",
      ];

      if (!knownTypes.find((t) => t === msg.t)) {
        return;
      }

      try {
        require(`../events/${msg.t}`)(ws, msg.d);
      } catch (e) {
        deps.log.error("Failed processing WS event");
        console.log(e);

        ws.send({
          t: "close",
          d: {
            reason: "server-error",
          },
        });

        return ws.close();
      }
    });

    ws.on("close", () => {
      require("../events/voiceLeave")(ws, {});

      if (ws.session) {
        ws.deps.redisSub.unsubscribe(`ws:${ws.id}`);

        if (
          ![...ws.deps.wss.clients].find(
            (w) => w.session && w.session.user.equals(ws.session.user)
          )
        ) {
          ws.deps.redisSub.unsubscribe(`user:${ws.session.user}`);
        }

        if (
          ![...ws.deps.wss.clients].find(
            (w) => w.session && w.session._id.equals(ws.session._id)
          )
        ) {
          ws.deps.redisSub.unsubscribe(`session:${ws.session._id}`);
        }
      }
    });
  });

  setInterval(() => {
    [...wss.clients].map((w) => {
      if (!w.alive) {
        w.terminate();
      }

      w.alive = false;
      w.send({
        t: "ping",
      });
    });
  }, 3e4);

  deps.wss = wss;
};

module.exports = (_server, _deps) => {
  server = _server;
  deps = _deps;

  setup();
};
