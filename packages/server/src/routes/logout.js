const express = require("express");
const session = require("../middleware/session");
const app = express.Router();

app.get("/", session, async (req, res) => {
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
});

module.exports = app;
