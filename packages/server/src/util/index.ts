import mongoose, { Document } from "mongoose";
import express from "express";
import Joi from "joi";
import sodium from "libsodium-wrappers";
import fs from "fs";
import proc from "child_process";
import crypto from "crypto";
import {
  ChannelType,
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
import webpush from "web-push";

export interface IUser {
  _id: Buffer;
  created: Date;
  username: string;
  name: string;
  salt: Buffer;
  authKey: Buffer;
  authKeyUpdated: Date;
  publicKey: Buffer;
  encryptedPrivateKey: Buffer;
  avatarId?: Buffer;
  typingEvents: boolean;
  colorTheme: ColorTheme;
  wantStatus: Status;
  totpSecret?: Buffer;
}

export interface ISession {
  _id: Buffer;
  token: Buffer;
  userId: Buffer;
  created: Date;
  lastStart: Date;
  ip: string;
  agent: string;
  pushSubscription?: ISessionPushSubscription;
}

export interface ISessionPushSubscription {
  endpoint: string;
  p256dh: Buffer;
  auth: Buffer;
}

export interface IAvatar {
  _id: Buffer;
  data: Buffer;
  type: string;
}

export interface IFriend {
  _id: Buffer;
  user1Id: Buffer;
  user2Id: Buffer;
  accepted: boolean;
}

export interface IChannel {
  _id: Buffer;
  type: ChannelType;
  created: Date;
  name?: string;
  avatarId?: Buffer;
  users: IChannelUser[];
}

export interface IChannelUser {
  id: Buffer;
  owner: boolean;
  hidden: boolean;
  added: Date;
}

export interface IMessage {
  _id: Buffer;
  channelId: Buffer;
  userId: Buffer;
  type: MessageType;
  created: Date;
  updated?: Date;
  data?: Buffer;
  keys: IMessageKey[];
}

export interface IMessageKey {
  userId: Buffer;
  data: Buffer;
}

export interface IValidateOpts {
  body?: Record<string, Joi.Schema>;
  params?: Record<string, Joi.Schema>;
}

export const userSchema = new mongoose.Schema<IUser>({
  _id: {
    type: Buffer.alloc(0), //idk why tf we have to do this.
    required: true,
    default() {
      return generateId();
    },
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    default(): string {
      return (this as unknown as IUser).username; //this is the IDE-recommended solution- no really, it is.
    },
  },
  salt: {
    type: Buffer.alloc(0),
    required: true,
  },
  authKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  authKeyUpdated: {
    type: Date,
    required: true,
    default(): Date {
      return (this as unknown as IUser).created;
    },
  },
  publicKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  encryptedPrivateKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  avatarId: {
    type: Buffer.alloc(0),
  },
  typingEvents: {
    type: Boolean,
    required: true,
    default() {
      return true;
    },
  },
  colorTheme: {
    type: Number,
    required: true,
    default() {
      return ColorTheme.Green;
    },
  },
  wantStatus: {
    type: Number,
    required: true,
    default() {
      return Status.Online;
    },
  },
  totpSecret: {
    type: Buffer.alloc(0),
  },
});

export const User = mongoose.model<IUser>("User", userSchema);

export const sessionSchema = new mongoose.Schema<ISession>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  token: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateToken();
    },
  },
  userId: {
    type: Buffer.alloc(0),
    required: true,
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  lastStart: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  ip: {
    type: String,
    required: true,
  },
  agent: {
    type: String,
    required: true,
  },
  pushSubscription: {
    type: new mongoose.Schema<ISessionPushSubscription>({
      endpoint: {
        type: String,
        required: true,
      },
      p256dh: {
        type: Buffer.alloc(0),
        required: true,
      },
      auth: {
        type: Buffer.alloc(0),
        required: true,
      },
    }),
  },
});

export const Session = mongoose.model<ISession>("Session", sessionSchema);

export const avatarSchema = new mongoose.Schema<IAvatar>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  data: {
    type: Buffer.alloc(0),
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

export const Avatar = mongoose.model<IAvatar>("Avatar", avatarSchema);

export const friendSchema = new mongoose.Schema<IFriend>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  user1Id: {
    type: Buffer.alloc(0),
    required: true,
    ref: "User",
  },
  user2Id: {
    type: Buffer.alloc(0),
    required: true,
    ref: "User",
  },
  accepted: {
    type: Boolean,
    required: true,
    default() {
      return false;
    },
  },
});

export const Friend = mongoose.model<IFriend>("Friend", friendSchema);

export const channelSchema = new mongoose.Schema<IChannel>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  type: {
    type: Number,
    required: true,
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  name: {
    type: String,
  },
  avatarId: {
    type: Buffer.alloc(0),
  },
  users: [
    new mongoose.Schema<IChannelUser>({
      id: {
        type: Buffer.alloc(0),
        required: true,
      },
      owner: {
        type: Boolean,
        required: true,
        default() {
          return false;
        },
      },
      hidden: {
        type: Boolean,
        required: true,
        default() {
          return false;
        },
      },
      added: {
        type: Date,
        required: true,
        default() {
          return new Date();
        },
      },
    }),
  ],
});

export const Channel = mongoose.model<IChannel>("Channel", channelSchema);

export const messageSchema = new mongoose.Schema<IMessage>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  channelId: {
    type: Buffer.alloc(0),
    required: true,
  },
  userId: {
    type: Buffer.alloc(0),
    required: true,
  },
  type: {
    type: Number,
    required: true,
  },
  created: {
    type: Date,
    default() {
      return new Date();
    },
  },
  updated: {
    type: Date,
  },
  data: {
    type: Buffer.alloc(0),
  },
  keys: {
    type: [
      new mongoose.Schema<IMessageKey>({
        userId: {
          type: Buffer.alloc(0),
          required: true,
        },
        data: {
          type: Buffer.alloc(0),
          required: true,
        },
      }),
    ],
    default: undefined,
  },
});

export const Message = mongoose.model<IMessage>("Message", messageSchema);

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
): Promise<(Document<ISession> & ISession) | undefined> => {
  const token = req.headers["authorization"];

  if (tokenValidator.required().validate(token).error) {
    res.status(400).json({
      error: "Invalid token",
    });

    return;
  }

  const session = await Session.findOne({
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

        _resolve(undefined);
        return;
      }

      const resolve = (val?: Buffer) => {
        if (!req.file) {
          return;
        }

        try {
          fs.unlinkSync(req.file.path);
          fs.unlinkSync(`${req.file.path}.1`);
        } catch {
          //
        }

        _resolve(val);
      };

      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(req.file.path))
        .digest();

      if (
        await Avatar.findOne({
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
          proc.execSync(
            `ffprobe -i ${req.file.path} -show_format -show_streams`,
            {
              stdio: "pipe",
            }
          )
        );

        codecType = ffprobe.split("codec_type=")[1].split("\n")[0];
        width = +ffprobe.split("width=")[1].split("\n")[0];
        height = +ffprobe.split("height=")[1].split("\n")[0];
        duration = +ffprobe.split("duration=")[1].split("\n")[0];
      } catch {
        res.status(400).json({
          error: "Invalid avatar data",
        });

        resolve(undefined);
        return;
      }

      if (codecType !== "video") {
        res.status(400).json({
          error: "Invalid avatar codec type",
        });

        resolve(undefined);
        return;
      }

      if (!width || width > 4096 || !height || height > 4096) {
        res.status(400).json({
          error: "Invalid avatar size (max: 4096x4096)",
        });

        resolve(undefined);
        return;
      }

      let cropWidth = 0;
      let cropX = 0;
      let cropY = 0;
      let type = "";

      if (width > height) {
        cropWidth = height;
        cropX = (width - height) / 2;
        cropY = 0;
      } else {
        cropWidth = width;
        cropX = 0;
        cropY = (height - width) / 2;
      }

      const cmd = ["ffmpeg", "-i", req.file.path];

      if (!duration) {
        type = "image/webp";

        cmd.push(
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
          "webp"
        );
      } else {
        type = "video/mp4";

        if (duration > MaxAvatarDuration) {
          cmd.push("-t", String(MaxAvatarDuration));
        }

        cmd.push(
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
          "mp4"
        );
      }

      try {
        proc.execSync([...cmd, "-y", `${req.file.path}.out`].join(" "), {
          stdio: "pipe",
        });
      } catch {
        res.status(400).json({
          error: "Failed encoding avatar",
        });

        resolve(undefined);
        return;
      }

      await Avatar.create({
        _id: hash,
        data: fs.readFileSync(`${req.file.path}.out`),
        type,
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
    !(await Friend.findOne({
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

  const targetUser = (await User.findOne({
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
      for (const friend of await Friend.find({
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
      for (const channel of await Channel.find({
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

  if ([SocketMessageType.SMessageCreate].indexOf(opts.message.t) !== -1) {
    const sessions: ISession[] = [];

    if (opts.sessionId) {
      const session = await Session.findOne({
        _id: opts.sessionId,
      });

      if (session) {
        sessions.push(session);
      }
    }

    if (opts.userId) {
      for (const session of await Session.find({
        userId: opts.userId,
      })) {
        sessions.push(session);
      }
    }

    for (const session of sessions) {
      const socket = sockets.find(
        (socket) =>
          socket.session && !socket.session._id.compare(session._id as Buffer)
      );

      if (socket && !socket.away) {
        return;
      }
    }

    for (const session of sessions) {
      if (!session.pushSubscription) {
        continue;
      }

      let extra;

      if (opts.message.t === SocketMessageType.SMessageCreate) {
        const data = opts.message.d as {
          channelId: string;
          userId: string;
        };

        const channel = await Channel.findOne({
          _id: Buffer.from(sodium.from_base64(data.channelId)),
        });

        const user = await User.findOne({
          _id: Buffer.from(sodium.from_base64(data.userId)),
        });

        if (!channel || !user) {
          return;
        }

        extra = {
          channel: {
            type: channel.type,
            name: channel.name,
            avatarId: channel.avatarId && sodium.to_base64(channel.avatarId),
          },
          user: {
            name: user.name,
            avatarId: user.avatarId && sodium.to_base64(user.avatarId),
          },
        };
      }

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
          e: extra,
        })
      );
    }
  }
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
