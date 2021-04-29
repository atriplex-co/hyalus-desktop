const crypto = require("crypto");
const express = require("express");
const Busboy = require("busboy");
const session = require("../middleware/session");
const user = require("../middleware/user");
const { ObjectId } = require("mongodb");
const app = express.Router();
const ratelimit = require("../middleware/ratelimit");
const _ffmpeg = require("fluent-ffmpeg");
const { ffmpeg, ffprobe } = require("../util");
const fs = require("fs");
const os = require("os");

app.post(
  "/",
  session,
  ratelimit({
    scope: "user",
    tag: "setAvatar",
    max: 5,
    time: 60 * 15,
  }),
  user,
  async (req, res) => {
    const bb = new Busboy({
      headers: req.headers,
    });

    bb.on("file", (name, file) => {
      const bufs = [];

      file.on("data", (b) => {
        bufs.push(b);
      });

      file.on("end", async () => {
        const data = Buffer.concat(bufs);

        if (data.length > 1024 * 1024 * 10) {
          res.status(400).json({
            error: "Avatar too large (10MB max)",
          });
        }

        const tmp = fs.mkdtempSync(`${os.tmpdir()}/`);
        fs.writeFileSync(`${tmp}/input.dat`, data);

        try {
          const probed = await ffprobe(`${tmp}/input.dat`);
          let type;

          console.log(probed);

          let cropWidth;
          let cropX = 0;
          let cropY = 0;

          if (probed.streams[0].width > probed.streams[0].height) {
            cropWidth = probed.streams[0].height;
            cropX = (probed.streams[0].width - cropWidth) / 2;
            cropY = 0;
          } else {
            cropWidth = probed.streams[0].width;
            cropX = 0;
            cropY = (probed.streams[0].height - cropWidth) / 2;
          }

          //image has more than 1 frame.
          if (probed.streams[0].nb_frames === "N/A") {
            type = "image/webp";

            await ffmpeg(
              _ffmpeg({
                niceness: 19,
                logger: req.deps.ws,
                timeout: 60, //1m
              })
                .input(`${tmp}/input.dat`)
                .inputFormat(probed.format.format_name)
                .addOptions([
                  "-c:v libwebp",
                  "-qscale 80",
                  "-pix_fmt yuv420p",
                  "-frames:v 1",
                  `-vf crop=${cropWidth}:${cropWidth}:${cropX}:${cropY},scale=256:256`,
                ])
                .outputFormat("webp")
                .output(`${tmp}/output.dat`)
            );
          } else {
            type = "video/mp4";

            await ffmpeg(
              _ffmpeg({
                niceness: 19,
                logger: req.deps.ws,
                timeout: 60, //1m
              })
                .input(`${tmp}/input.dat`)
                .inputFormat(probed.format.format_name)
                .addOptions([
                  "-an",
                  "-c:v libx264",
                  "-crf 30",
                  "-preset veryfast",
                  "-profile:v high",
                  "-pix_fmt yuv420p",
                  ...(probed.streams[0].nb_frames / probed.streams[0].duration >
                  30 //fps>30 effectively.
                    ? [
                        `-vf crop=${cropWidth}:${cropWidth}:${cropX}:${cropY},scale=256:256,fps=30`,
                      ]
                    : [
                        `-vf crop=${cropWidth}:${cropWidth}:${cropX}:${cropY},scale=256:256`,
                      ]),
                ])
                .outputFormat("mp4")
                .output(`${tmp}/output.dat`)
            );
          }

          const data = fs.readFileSync(`${tmp}/output.dat`);
          const hash = crypto
            .createHash("sha256")
            .update(data)
            .digest();

          let avatar = await req.deps.db.collection("avatars").findOne({
            hash,
          });

          if (!avatar) {
            avatar = (
              await req.deps.db.collection("avatars").insertOne({
                hash,
                data,
                type,
              })
            ).ops[0];
          }

          await req.deps.db.collection("users").updateOne(req.user, {
            $set: {
              avatar: avatar._id,
            },
          });

          req.deps.redis.publish(`user:${req.user._id}`, {
            t: "user",
            d: {
              avatar: avatar._id.toString(),
            },
          });

          if (
            !(await req.deps.db.collection("users").findOne({
              avatar: req.user.avatar,
            })) &&
            !(await req.deps.db.collection("channels").findOne({
              avatar: req.user.avatar,
            }))
          ) {
            await req.deps.db.collection("avatars").deleteOne({
              _id: req.user.avatar,
            });
          }

          const targets = [];

          //propegate changes to friends
          const friends = await (
            await req.deps.db.collection("friends").find({
              $or: [
                {
                  initiator: req.session.user,
                },
                {
                  target: req.session.user,
                },
              ],
            })
          ).toArray();

          for (const friend of friends) {
            let userId;

            if (friend.initiator.equals(req.session.user)) {
              userId = friend.target;
            }

            if (friend.target.equals(req.session.user)) {
              userId = friend.initiator;
            }

            targets.push(userId);
          }

          //propegate changes to channels
          const channels = await (
            await req.deps.db.collection("channels").find({
              users: {
                $elemMatch: {
                  id: req.session.user,
                  removed: false,
                },
              },
            })
          ).toArray();

          for (const channel of channels) {
            for (const channelUser of channel.users
              .filter((u) => !u.removed)
              .filter((u) => !u.id.equals(req.session.user))) {
              targets.push(channelUser.id);
            }
          }

          for (const target of new Set(targets.map((t) => t.toString()))) {
            await req.deps.redis.publish(`user:${target}`, {
              t: "foreignUser",
              d: {
                id: req.user._id.toString(),
                avatar: avatar._id.toString(),
              },
            });
          }

          res.end();
        } catch (e) {
          res.status(400).json({
            error: "Invalid or unsupported image format",
          });
        }

        fs.rmSync(tmp, {
          recursive: true,
          force: true,
        });
      });
    });

    req.pipe(bb);
  }
);

app.get(
  "/:id",
  ratelimit({
    scope: "ip",
    tag: "getAvatar",
    max: 1000,
    time: 60 * 60,
  }),
  async (req, res) => {
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

    res.set("content-type", avatar.type);
    res.set("cache-control", "public, max-age=31536000");
    res.send(avatar.data.buffer);
  }
);

module.exports = app;
