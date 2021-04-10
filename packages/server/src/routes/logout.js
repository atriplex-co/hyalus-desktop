const express = require("express");
const session = require("../middleware/session");
const app = express.Router();
const ratelimit = require("../middleware/ratelimit");

app.get(
  "/",
  session,
  ratelimit({
    scope: "ip",
    tag: "logout",
    max: 100,
    time: 60 * 5,
  }),
  async (req, res) => {
    await req.deps.db.collection("sessions").deleteOne(req.session);

    [...req.deps.wss.clients]
      .filter((w) => w.session._id.equals(req.session._id))
      .map((w) => {
        w.send({
          t: "close",
          d: "invalid-auth",
        });

        w.close();
      });

    res.end();
  }
);

module.exports = app;
