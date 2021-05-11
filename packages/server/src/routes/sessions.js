const express = require("express");
const app = express.Router();
const sessionMiddleware = require("../middleware/session");

app.get("/", sessionMiddleware, async (req, res) => {
  const sessions = await (
    await req.deps.db.collection("sessions").find(
      {
        user: req.session.user,
      },
      {
        limit: 50,
      }
    )
  ).toArray();

  res.json(
    sessions.map((session) => ({
      id: session._id,
      ip: session.ip,
      agent: session.agent,
      created: session.created,
      lastActive: session.lastActive,
    }))
  );
});

module.exports = app;
