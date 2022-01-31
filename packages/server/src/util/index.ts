import express from "express";
import Joi from "joi";
import sodium from "libsodium-wrappers";
import fs from "fs";
import crypto from "crypto";
import {
  AvatarType,
  ColorTheme,
  MaxAvatarDuration,
  MaxAvatarFPS,
  MaxAvatarWidth,
  MessageType,
  PushProtocol,
  SocketMessageType,
  Status,
} from "common";
import { ISocketMessage, sockets } from "../routes/ws";
import multer from "multer";
import webpush, { WebPushError } from "web-push";
import { execSync } from "child_process";
import { ISession, SessionModel } from "../models/session";
import { AvatarModel, IAvatarVersion } from "../models/avatar";
import { FriendModel } from "../models/friend";
import { IUser, UserModel } from "../models/user";
import { ChannelModel } from "../models/channel";

export interface IValidateOpts {
  body?: Record<string, Joi.Schema>;
  params?: Record<string, Joi.Schema>;
}

export const generateId = (): Buffer => {
  return Buffer.from(sodium.randombytes_buf(16));
};

export const generateToken = (): Buffer => {
  return Buffer.from(sodium.randombytes_buf(32));
};

export const validateRequest = (
  req: express.Request,
  res: express.Response,
  opts: IValidateOpts
): boolean => {
  let error: Joi.ValidationError | undefined;

  if (!error && opts.body) {
    error = Joi.object(opts.body).validate(req.body).error;
  }

  if (!error && opts.params) {
    error = Joi.object(opts.params).validate(req.params).error;
  }

  if (error) {
    res.status(400).json({
      error: error.message,
    });
  }

  return !error;
};

export const authRequest = async (
  req: express.Request,
  res: express.Response
): Promise<ISession | undefined> => {
  const token = req.headers["authorization"];

  if (tokenValidator.required().validate(token).error) {
    res.status(400).json({
      error: "Invalid token",
    });

    return;
  }

  const session = await SessionModel.findOne({
    token: Buffer.from(sodium.from_base64(token + "")),
  });

  if (!session) {
    res.status(400).json({
      error: "Invalid session",
    });

    return;
  }

  return session;
};

export const binarySchema = (check: (l: number) => boolean): Joi.Schema => {
  return Joi.string().custom((val: string) => {
    let data: Buffer | undefined;

    try {
      data = Buffer.from(sodium.from_base64(val));
    } catch {
      //
    }

    if (!data) {
      throw new Error("Invalid data");
    }

    if (!check(data.length)) {
      throw new Error(`Invalid data length (${data.length})`);
    }

    return val;
  });
};

export const usernameValidator = Joi.string().regex(/^[a-zA-Z0-9-_]{3,32}$/);

export const saltValidator = binarySchema((l) => l === 16);

export const authKeyValidator = binarySchema((l) => l === 32);

export const publicKeyValidator = binarySchema((l) => l === 32);

export const encryptedPrivateKeyValidator = binarySchema((l) => l === 72);

export const idValidator = binarySchema((l) => l === 16);

export const totpCodeValidator = Joi.number().min(0).max(999999);

export const tokenValidator = binarySchema((l) => l === 32);

export const awayValidator = Joi.boolean();

export const fileChunkHashValidator = binarySchema((l) => l === 64);

export const colorThemeValidator = Joi.number().valid(
  ColorTheme.Red,
  ColorTheme.Orange,
  ColorTheme.Amber,
  ColorTheme.Yellow,
  ColorTheme.Lime,
  ColorTheme.Green,
  ColorTheme.Emerald,
  ColorTheme.Teal,
  ColorTheme.Cyan,
  ColorTheme.Sky,
  ColorTheme.Blue,
  ColorTheme.Indigo,
  ColorTheme.Violet,
  ColorTheme.Purple,
  ColorTheme.Fuchsia,
  ColorTheme.Pink,
  ColorTheme.Rose
);

export const nameValidator = Joi.string().min(1).max(32);

export const typingEventsValidator = Joi.boolean();

export const wantStatusValidator = Joi.number().valid(
  Status.Online,
  Status.Away,
  Status.Busy,
  Status.Offline
);

export const totpSecretValidator = binarySchema((l) => l === 10);

export const avatarIdValidator = binarySchema((l) => l === 32);

export const messageTypeValidator = Joi.number().valid(
  MessageType.Text,
  MessageType.Attachment
);

export const messageDataValidator = binarySchema((l) => !!l && l <= 32 * 1024);

export const messageKeysValidator = Joi.array().items(
  Joi.object({
    userId: idValidator.required(),
    data: binarySchema((l) => l === 72),
  })
);

export const channelNameValidator = Joi.string().min(1).max(64);

export const processAvatar = (
  req: express.Request,
  res: express.Response
): Promise<Buffer | undefined> => {
  return new Promise((_resolve: (val?: Buffer) => void) => {
    multer({
      dest: "/tmp",
      limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1,
      },
    }).single("avatar")(req, res, async () => {
      if (!req.file) {
        res.status(400).json({
          error: "Invalid form data",
        });

        _resolve();
        return;
      }

      const resolve = (val?: Buffer) => {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
            fs.unlinkSync(`${req.file.path}.1`);
          } catch {
            //
          }
        }

        _resolve(val);
      };

      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(req.file.path))
        .digest();

      if (
        await AvatarModel.findOne({
          _id: hash,
        })
      ) {
        resolve(hash);
        return;
      }

      let codecType: string;
      let width: number;
      let height: number;
      let duration: number;

      try {
        const ffprobe = String(
          execSync(`ffprobe -i ${req.file.path} -show_format -show_streams`, {
            stdio: "pipe",
          })
        );

        codecType = ffprobe.split("codec_type=")[1].split("\n")[0];
        width = +ffprobe.split("width=")[1].split("\n")[0];
        height = +ffprobe.split("height=")[1].split("\n")[0];
        duration = +ffprobe
          .split("[FORMAT]")[1]
          .split("duration=")[1]
          .split("\n")[0];
      } catch {
        res.status(400).json({
          error: "Invalid avatar data",
        });

        resolve();
        return;
      }

      if (codecType !== "video") {
        res.status(400).json({
          error: "Invalid avatar codec type",
        });

        resolve();
        return;
      }

      if (!width || width > 4096 || !height || height > 4096) {
        res.status(400).json({
          error: "Invalid avatar size",
        });

        resolve();
        return;
      }

      let cropWidth = 0;
      let cropX = 0;
      let cropY = 0;

      if (width > height) {
        cropWidth = height;
        cropX = (width - height) / 2;
        cropY = 0;
      } else {
        cropWidth = width;
        cropX = 0;
        cropY = (height - width) / 2;
      }

      let versions: IAvatarVersion[] = [];

      try {
        execSync(
          [
            "ffmpeg",
            "-i",
            req.file.path,
            "-frames:v",
            "1",
            "-vf",
            `crop=${cropWidth}:${cropWidth}:${cropX}:${cropY},scale=${MaxAvatarWidth}:${MaxAvatarWidth}`,
            "-c:v",
            "libwebp",
            "-q:v",
            "80",
            "-compression_level",
            "6",
            "-pix_fmt",
            "yuva420p",
            "-an",
            "-sn",
            "-f",
            "webp",
            "-y",
            `${req.file.path}.out`,
          ].join(" "),
          {
            stdio: "pipe",
          }
        );
      } catch {
        res.status(400).json({
          error: "Failed encoding avatar",
        });

        resolve();
        return;
      }

      versions.push({
        data: fs.readFileSync(`${req.file.path}.out`),
        type: AvatarType.WEBP,
      });

      if (duration) {
        const cmd = [
          "ffmpeg",
          "-i",
          req.file.path,
          "-f",
          "lavfi",
          "-i",
          "color=181818",
          "-filter_complex",
          `[0]crop=${cropWidth}:${cropWidth}:${cropX}:${cropY}[fg],[fg]scale=${MaxAvatarWidth}:${MaxAvatarWidth}[fg],[fg]fps=${MaxAvatarFPS}[fg],[1]scale=${MaxAvatarWidth}:${MaxAvatarWidth}[bg],[bg]setsar=1[bg],[bg][fg]overlay=shortest=1`,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "30",
          "-pix_fmt",
          "yuv420p",
          "-an",
          "-sn",
          "-f",
          "mp4",
        ];

        if (duration > MaxAvatarDuration) {
          cmd.push("-t", String(MaxAvatarDuration));
        }

        let ok = true;

        try {
          execSync([...cmd, "-y", `${req.file.path}.out`].join(" "), {
            stdio: "pipe",
          });
        } catch {
          ok = false;
        }

        if (ok) {
          versions = [
            {
              data: fs.readFileSync(`${req.file.path}.out`),
              type: AvatarType.MP4,
            },
            ...versions,
          ];
        }
      }

      await AvatarModel.create({
        _id: hash,
        versions,
      });

      resolve(hash);
    });
  });
};

export const checkTotpCode = (key: Buffer, code: number): boolean => {
  const counters = [Math.floor(Date.now() / 1000 / 30)];
  counters.push(counters[0] - 1);
  counters.push(counters[0] + 1);

  for (const counter of counters) {
    const digest = crypto
      .createHmac("sha1", key)
      .update(
        Buffer.from([
          0,
          0,
          0,
          0,
          (counter >> 24) & 0xff,
          (counter >> 16) & 0xff,
          (counter >> 8) & 0xff,
          counter & 0xff,
        ])
      )
      .digest();
    const offset = digest.slice(-1)[0] & 0xf;
    const mod =
      (((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)) %
      10e5;

    if (code === mod) {
      return true;
    }
  }

  return false;
};

export const getStatus = async (
  targetUserId: Buffer,
  povUserId?: Buffer
): Promise<Status> => {
  if (
    !sockets.find(
      (socket) => socket.session && !socket.session.userId.compare(targetUserId)
    )
  ) {
    return Status.Offline;
  }

  if (
    povUserId &&
    !(await FriendModel.findOne({
      $or: [
        {
          user1Id: povUserId,
          user2Id: targetUserId,
        },
        {
          user1Id: targetUserId,
          user2Id: povUserId,
        },
      ],
      accepted: true,
    }))
  ) {
    return Status.Offline;
  }

  const targetUser = (await UserModel.findOne({
    _id: targetUserId,
  })) as IUser;

  if (
    targetUser.wantStatus === Status.Online &&
    !sockets.find(
      (socket) =>
        socket.session &&
        !socket.session.userId.compare(targetUserId) &&
        !socket.away
    )
  ) {
    return Status.Away;
  }

  return targetUser.wantStatus;
};

export const dispatchSocket = async (opts: {
  userId?: Buffer;
  sessionId?: Buffer;
  related?: {
    userId: Buffer;
    channels?: boolean;
    friends?: boolean;
    friendsAccepted?: boolean;
  };
  message: ISocketMessage;
}): Promise<void> => {
  const relatedTargetUserIds: Buffer[] = [];

  if (opts.related) {
    if (opts.related.friends) {
      for (const friend of await FriendModel.find({
        $or: [
          {
            user1Id: opts.related.userId,
          },
          {
            user2Id: opts.related.userId,
          },
        ],
        ...(opts.related.friendsAccepted !== undefined
          ? {
              accepted: opts.related.friendsAccepted,
            }
          : {}),
      })) {
        relatedTargetUserIds.push(
          !opts.related.userId.compare(friend.user1Id)
            ? friend.user2Id
            : friend.user1Id
        );
      }
    }

    if (opts.related.channels) {
      for (const channel of await ChannelModel.find({
        users: {
          $elemMatch: {
            id: opts.related.userId,
            hidden: false,
          },
        },
      })) {
        for (const user of channel.users) {
          if (!user.id.compare(opts.related.userId)) {
            continue;
          }

          relatedTargetUserIds.push(user.id);
        }
      }
    }
  }

  for (const socket of sockets) {
    const session = socket.session as ISession;

    if (
      !session ||
      !(
        (opts.userId && !session.userId.compare(opts.userId)) ||
        (opts.sessionId && !session._id.compare(opts.sessionId)) ||
        relatedTargetUserIds.find((id) => !id.compare(session.userId))
      )
    ) {
      continue;
    }

    socket.send(opts.message);
  }

  // so this doesn't cause any lag in groups.
  (async () => {
    if (opts.userId && opts.message.t === SocketMessageType.SMessageCreate) {
      const data = opts.message.d as {
        type: MessageType;
        channelId: string;
        userId: string;
      };

      if (
        data.type !== MessageType.Text ||
        !opts.userId.compare(Buffer.from(sodium.from_base64(data.userId)))
      ) {
        return;
      }

      const sessions: ISession[] = [];

      for (const session of await SessionModel.find({
        userId: opts.userId,
      })) {
        if (
          process.env.NODE_ENV === "production" &&
          sockets.find(
            (socket) =>
              socket.session &&
              !socket.session._id.compare(session._id as Buffer) &&
              !socket.away
          )
        ) {
          return;
        }

        sessions.push(session);
      }

      for (const session of sessions) {
        if (
          !session.pushSubscription ||
          session.pushSubscription.proto !== PushProtocol
        ) {
          continue;
        }

        const channel = await ChannelModel.findOne({
          _id: Buffer.from(sodium.from_base64(data.channelId)),
        });

        const user = await UserModel.findOne({
          _id: Buffer.from(sodium.from_base64(data.userId)),
        });

        if (!channel || !user) {
          return;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: session.pushSubscription.endpoint,
              keys: {
                p256dh: sodium.to_base64(session.pushSubscription.p256dh),
                auth: sodium.to_base64(session.pushSubscription.auth),
              },
            },
            JSON.stringify({
              ...opts.message,
              p: PushProtocol,
              e: {
                channel: {
                  type: channel.type,
                  name: channel.name,
                },
                user: {
                  name: user.name,
                  avatarId: user.avatarId && sodium.to_base64(user.avatarId),
                  publicKey: sodium.to_base64(user.publicKey),
                },
              },
            })
          );
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.log(e);
          }

          if (e instanceof WebPushError && e.statusCode === 410) {
            await SessionModel.findOneAndUpdate(
              {
                _id: session._id,
              },
              {
                $unset: {
                  pushSubscription: 1,
                },
              }
            );
          }
        }
      }
    }
  })();
};

export const cleanObject = <T>(val: T): T => {
  for (const [k, v] of Object.entries(val)) {
    if (v === undefined) {
      delete (val as Record<string, unknown>)[k];
    }
  }

  return val;
};

export const propagateStatusUpdate = async (userId: Buffer): Promise<void> => {
  await dispatchSocket({
    related: {
      userId: userId,
      friends: true,
      friendsAccepted: true,
    },
    message: {
      t: SocketMessageType.SForeignUserUpdate,
      d: {
        id: sodium.to_base64(userId),
        status: await getStatus(userId),
      },
    },
  });
};
