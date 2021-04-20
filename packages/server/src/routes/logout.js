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
    
    await req.deps.redis.publish(`session:${req.session._id}`, {
      t: "close",
      d: {
        reset: true,
      },
    });

    res.end();
  }
);

module.exports = app;
