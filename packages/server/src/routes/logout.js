const express = require("express");
const app = express.Router();
const sessionMiddleware = require("../middleware/session");
const ratelimitMiddleware = require("../middleware/ratelimit");

app.get(
  "/",
  sessionMiddleware,
  ratelimitMiddleware({
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
