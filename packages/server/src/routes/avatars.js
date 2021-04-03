const crypto = require("crypto");
const express = require("express");
const Busboy = require("busboy");
const sharp = require("sharp");
const session = require("../middleware/session");
const user = require("../middleware/user");
const { ObjectId } = require("mongodb");
const app = express.Router();

app.post("/", session, user, async (req, res) => {
  const bb = new Busboy({
    headers: req.headers,
  });

  bb.on("file", (name, file) => {
    const bufs = [];

    file.on("data", (b) => {
      bufs.push(b);
    });

    file.on("end", async () => {
      let img;

      try {
        img = await sharp(Buffer.concat(bufs))
          .resize(256, 256)
          .toFormat("webp")
          .toBuffer();
      } catch {
        res.status(400).json({
          error: "Unsupported or invalid image data",
        });

        return;
      }

      const hash = crypto
        .createHash("sha256")
        .update(img)
        .digest();

      let avatar = await req.deps.db.collection("avatars").findOne({
        hash,
      });

      if (!avatar) {
        avatar = (
          await req.deps.db.collection("avatars").insertOne({
            hash,
            img,
          })
        ).ops[0];
      }

      await req.deps.db.collection("users").updateOne(req.user, {
        $set: {
          avatar: avatar._id,
        },
      });

      res.end();

      req.deps.redis.publish(`user:${req.user._id}`, {
        t: "user",
        d: {
          avatar: avatar._id.toString(),
        },
      });

      if (
        !(await req.deps.db.collection("users").findOne({
          avatar: avatar._id,
        }))
      ) {
        await req.deps.db.collection("avatars").deleteOne({
          id: avatar._id,
        });
      }
    });
  });

  req.pipe(bb);
});

app.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: "Invalid avatar",
    });
  }

  const avatar = await req.deps.db.collection("avatars").findOne({
    _id: new ObjectId(req.params.id),
  });

  if (!avatar) {
    res.status(404).end();
    return;
  }

  res.setHeader("content-type", "image/webp");
  res.send(avatar.img.buffer);
});

module.exports = app;
