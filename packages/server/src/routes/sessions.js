const express = require("express");
const app = express.Router();
const { ObjectId } = require("mongodb");
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
      self: session._id.equals(req.session._id),
    }))
  );
});

app.delete("/:id", sessionMiddleware, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: "Invalid session",
    });
  }

  const session = await req.deps.db.collection("sessions").findOne({
    _id: new ObjectId(req.params.id),
    user: req.session.user,
  });

  if (!session) {
    return res.status(400).json({
      error: "Session not found",
    });
  }

  await req.deps.db.collection("sessions").deleteOne({
    _id: session._id,
  });

  await req.deps.redis.publish(`session:${session._id}`, {
    t: "close",
    d: {
      reset: true,
    },
  });

  res.end();
});

module.exports = app;
