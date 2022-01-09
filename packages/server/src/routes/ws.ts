import Joi from "joi";
import sodium from "libsodium-wrappers";
import WebSocket from "ws";
import {
  awaySchema,
  binarySchema,
  Channel,
  dispatchSocket,
  fileChunkHashSchema,
  Friend,
  getStatus,
  IChannel,
  idSchema,
  IMessage,
  ISession,
  IUser,
  Message,
  propagateStatusUpdate,
  Session,
  tokenSchema,
  User,
} from "../util";
import { SocketMessageType, SocketProtocol } from "common";

export interface ISocketMessage {
  t: SocketMessageType;
  d?: unknown;
}

export interface ISocketFileChunkRequest {
  hash: string;
  tag: string;
  channelId: string;
  socket: Socket;
}

export let sockets: Socket[] = [];

export class Socket {
  ws: WebSocket;
  init: Date;
  session?: ISession;
  away: boolean;
  fileChunks: string[] = [];
  fileChunkRequests: ISocketFileChunkRequest[] = [];
  callChannelId?: Buffer;
  alive: boolean;
  pingInterval: number;

  constructor(ws: WebSocket) {
    ws.on("message", async (buf: Buffer) => {
      try {
        const msg = JSON.parse(String(buf)) as ISocketMessage;

        const { error } = Joi.object({
          t: Joi.number().required(),
          d: Joi.object(),
        }).validate(msg);

        if (error) {
          throw new Error(error.message);
        }

        if (msg.t === SocketMessageType.CStart) {
          const data = msg.d as {
            proto: number;
            token: string;
            away: boolean;
            fileChunks: string[];
          };

          if (!data.proto) {
            return;
          } // prevent old/broken clients from reconnecting infinitely, remove later.

          if (data.proto < SocketProtocol) {
            this.send({
              t: SocketMessageType.SReset,
              d: {
                updateRequired: true,
              },
            });

            return;
          }

          const { error } = Joi.object({
            proto: Joi.number(),
            token: tokenSchema.required(),
            away: awaySchema.required(),
            fileChunks: Joi.array().items(fileChunkHashSchema).required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          const reqSession = await Session.findOne({
            token: Buffer.from(sodium.from_base64(data.token)),
          });

          if (!reqSession) {
            this.send({
              t: SocketMessageType.SReset,
            });

            return;
          }

          this.session = reqSession;
          this.away = data.away;
          this.fileChunks = data.fileChunks;

          const reqUser = (await User.findOne({
            _id: reqSession.userId,
          })) as IUser;

          const sessions = [];
          const friends = [];
          const channels = [];

          for (const session of await Session.find({
            userId: reqUser._id,
          })) {
            sessions.push({
              id: sodium.to_base64(session._id),
              self: !session._id.compare(reqSession._id),
              ip: session.ip,
              agent: session.agent,
              created: +session.created,
              lastStart: +session.lastStart,
            });
          }

          for (const friend of await Friend.find({
            $or: [
              {
                user1Id: reqUser._id,
              },
              {
                user2Id: reqUser._id,
              },
            ],
          })) {
            const user = (await User.findOne({
              _id: !friend.user1Id.compare(reqUser._id)
                ? friend.user2Id
                : friend.user1Id,
            })) as IUser;

            friends.push({
              id: sodium.to_base64(user._id),
              username: user.username,
              name: user.name,
              avatarId: user.avatarId && sodium.to_base64(user.avatarId),
              publicKey: sodium.to_base64(user.publicKey),
              status: await getStatus(user._id, reqUser._id),
              accepted: friend.accepted,
              acceptable:
                !friend.accepted && !friend.user2Id.compare(reqUser._id),
            });
          }

          for (const channel of await Channel.find({
            users: {
              $elemMatch: {
                id: reqUser._id,
                hidden: false,
              },
            },
          })) {
            const users = [];

            for (const channelUser of channel.users) {
              if (!channelUser.id.compare(reqUser._id)) {
                continue;
              }

              const user = (await User.findOne({
                _id: channelUser.id,
              })) as IUser;
              users.push({
                id: sodium.to_base64(user._id),
                name: user.name,
                username: user.username,
                avatarId: user.avatarId && sodium.to_base64(user.avatarId),
                publicKey: sodium.to_base64(user.publicKey),
                status: await getStatus(user._id, reqUser._id),
                hidden: channelUser.hidden,
                lastTyping: 0,
                inCall:
                  !channelUser.hidden &&
                  !!sockets.find(
                    (socket) =>
                      socket.session &&
                      !socket.session.userId.compare(user._id) &&
                      socket.callChannelId &&
                      !socket.callChannelId.compare(channel._id)
                  ),
              });
            }

            const lastMessage = (await Message.findOne(
              {
                channelId: channel._id,
              },
              null,
              {
                sort: {
                  created: -1,
                },
              }
            )) as IMessage;

            const key =
              lastMessage.keys &&
              lastMessage.keys.find((key) => !key.userId.compare(reqUser._id))
                ?.data;

            channels.push({
              id: sodium.to_base64(channel._id),
              type: channel.type,
              created: +channel.created,
              name: channel.name,
              avatarId: channel.avatarId && sodium.to_base64(channel.avatarId),
              owner: !!channel.users.find((u) => !u.id.compare(reqUser._id))
                ?.owner,
              users,
              lastMessage: {
                id: sodium.to_base64(lastMessage._id),
                userId: sodium.to_base64(lastMessage.userId),
                type: lastMessage.type,
                created: +lastMessage.created,
                updated: lastMessage.updated && +lastMessage.updated,
                data: lastMessage.data && sodium.to_base64(lastMessage.data),
                key: key && sodium.to_base64(key),
              },
            });
          }

          this.send({
            t: SocketMessageType.SReady,
            d: {
              user: {
                id: sodium.to_base64(reqUser._id),
                name: reqUser.name,
                username: reqUser.username,
                avatarId:
                  reqUser.avatarId && sodium.to_base64(reqUser.avatarId),
                created: +reqUser.created,
                authKeyUpdated: +reqUser.authKeyUpdated,
                colorTheme: reqUser.colorTheme,
                wantStatus: reqUser.wantStatus,
                totpEnabled: !!reqUser.totpSecret,
                typingEvents: reqUser.typingEvents,
              },
              sessions,
              friends,
              channels,
              meta: {
                proto: SocketProtocol,
                type: process.env.NODE_ENV,
                vapidPublic: process.env.VAPID_PUBLIC,
              },
            },
          });

          await dispatchSocket({
            userId: reqSession.userId,
            message: {
              t: SocketMessageType.SSessionUpdate,
              d: {
                id: sodium.to_base64(reqSession._id),
                lastStart: +new Date(),
              },
            },
          });

          await propagateStatusUpdate(this.session.userId);
        }

        if (!this.session) {
          return;
        }

        if (msg.t === SocketMessageType.CChannelTyping) {
          const data = msg.d as {
            id: string;
          };

          const { error } = Joi.object({
            id: idSchema.required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          const channel = await Channel.findOne({
            _id: Buffer.from(sodium.from_base64(data.id)),
            users: {
              $elemMatch: {
                id: this.session.userId,
                hidden: false,
              },
            },
          });

          if (!channel) {
            return;
          }

          for (const user of channel.users.filter(
            (user) =>
              !user.hidden && user.id.compare((this.session as ISession).userId)
          )) {
            await dispatchSocket({
              userId: user.id,
              message: {
                t: SocketMessageType.SChannelUserUpdate,
                d: {
                  id: sodium.to_base64(this.session.userId),
                  channelId: data.id,
                  lastTyping: true,
                },
              },
            });
          }
        }

        if (msg.t === SocketMessageType.CFileChunkOwned) {
          const data = msg.d as {
            hash: string;
          };

          const { error } = Joi.object({
            hash: fileChunkHashSchema.required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          this.fileChunks.push(data.hash);
        }

        if (msg.t === SocketMessageType.CFileChunkLost) {
          const data = msg.d as {
            hash: string;
          };

          const { error } = Joi.object({
            hash: fileChunkHashSchema.required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          this.fileChunks = this.fileChunks.filter(
            (hash) => hash !== data.hash
          );
        }

        if (msg.t === SocketMessageType.CFileChunkRequest) {
          const data = msg.d as {
            hash: string;
            tag: string;
            channelId: string;
          };

          const { error } = Joi.object({
            hash: fileChunkHashSchema.required(),
            tag: idSchema.required(),
            channelId: idSchema.required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          const channel = await Channel.findOne({
            _id: Buffer.from(sodium.from_base64(data.channelId)),
            users: {
              $elemMatch: {
                id: this.session.userId,
                hidden: false,
              },
            },
          });

          if (!channel) {
            return;
          }

          const possibleSockets = sockets.filter(
            (socket) =>
              socket.session &&
              channel.users.find(
                (user) =>
                  !user.hidden &&
                  !user.id.compare((socket.session as ISession).userId)
              ) &&
              socket.fileChunks.find((hash) => hash === data.hash)
          );

          if (!possibleSockets.length) {
            return;
          }

          const socket =
            possibleSockets[Math.floor(Math.random() * possibleSockets.length)];

          this.fileChunkRequests.push({
            hash: data.hash,
            tag: data.tag,
            channelId: data.channelId,
            socket,
          });

          socket.fileChunkRequests.push({
            hash: data.hash,
            tag: data.tag,
            channelId: data.channelId,
            socket: this,
          });

          socket.send({
            t: SocketMessageType.SFileChunkRequest,
            d: {
              hash: data.hash,
              tag: data.tag,
              userId: sodium.to_base64(this.session.userId),
              channelId: sodium.to_base64(channel._id),
            },
          });
        }

        if (msg.t === SocketMessageType.CFileChunkRTC) {
          const data = msg.d as {
            hash: string;
            tag: string;
            data: string;
          };

          const { error } = Joi.object({
            hash: fileChunkHashSchema.required(),
            tag: idSchema.required(),
            data: binarySchema((l) => l <= 10240).required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          const req = this.fileChunkRequests.find(
            (req) => req.hash === data.hash && req.tag === data.tag
          );

          if (!req) {
            return;
          }

          req.socket.send({
            t: SocketMessageType.SFileChunkRTC,
            d: {
              hash: data.hash,
              tag: data.tag,
              data: data.data,
              userId: sodium.to_base64(this.session.userId),
              channelId: req.channelId,
            },
          });
        }

        if (msg.t === SocketMessageType.CCallStart) {
          const data = msg.d as {
            channelId: string;
          };

          const { error } = Joi.object({
            channelId: idSchema.required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          const channel = await Channel.findOne({
            _id: Buffer.from(sodium.from_base64(data.channelId)),
            users: {
              $elemMatch: {
                id: this.session.userId,
                hidden: false,
              },
            },
          });

          if (!channel) {
            this.send({
              t: SocketMessageType.SCallReset,
            });

            return;
          }

          const oldUserCallCocket = sockets.find(
            (socket) =>
              socket.session &&
              !socket.session.userId.compare(
                (this.session as ISession).userId
              ) &&
              socket.callChannelId
          );

          if (oldUserCallCocket) {
            await oldUserCallCocket.send({
              t: SocketMessageType.SCallReset,
            });
          }

          this.callChannelId = Buffer.from(sodium.from_base64(data.channelId));

          if (+this.init > +new Date() - 1000 * 1) {
            await new Promise((resolve) => {
              setTimeout(resolve, 1000);
            });
          }

          for (const user of channel.users.filter(
            (user) =>
              !user.hidden && user.id.compare((this.session as ISession).userId)
          )) {
            await dispatchSocket({
              userId: user.id,
              message: {
                t: SocketMessageType.SChannelUserUpdate,
                d: {
                  channelId: data.channelId,
                  id: sodium.to_base64((this.session as ISession).userId),
                  inCall: true,
                },
              },
            });
          }
        }

        if (msg.t === SocketMessageType.CCallStop) {
          this.callReset();
        }

        if (msg.t === SocketMessageType.CCallRTC) {
          const data = msg.d as {
            userId: string;
            data: string;
          };

          const { error } = Joi.object({
            userId: idSchema.required(),
            data: binarySchema((l) => l <= 10240).required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          if (!this.callChannelId) {
            return;
          }

          const socket = sockets.find(
            (socket) =>
              socket !== this &&
              socket.session &&
              !socket.session.userId.compare(
                Buffer.from(sodium.from_base64(data.userId))
              ) &&
              socket.callChannelId &&
              !socket.callChannelId.compare(this.callChannelId as Uint8Array)
          );

          if (!socket) {
            return;
          }

          socket.send({
            t: SocketMessageType.SCallRTC,
            d: {
              userId: sodium.to_base64(this.session.userId),
              data: data.data,
            },
          });
        }

        if (msg.t === SocketMessageType.CSetAway) {
          const data = msg.d as {
            away: boolean;
          };

          const { error } = Joi.object({
            away: Joi.bool().required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          this.away = data.away;

          await propagateStatusUpdate(this.session.userId);
        }

        if (msg.t === SocketMessageType.CSetPushSubscription) {
          const data = msg.d as {
            endpoint: string;
            p256dh: string;
            auth: string;
          };

          const { error } = Joi.object({
            endpoint: Joi.string().uri().max(1000).required(),
            p256dh: binarySchema((l) => l === 65).required(),
            auth: binarySchema((l) => l === 16).required(),
          }).validate(data);

          if (error) {
            throw new Error(error.message);
          }

          await Session.findOneAndUpdate(
            {
              _id: this.session._id,
            },
            {
              $set: {
                pushSubscription: {
                  endpoint: data.endpoint,
                  p256dh: Buffer.from(sodium.from_base64(data.p256dh)),
                  auth: Buffer.from(sodium.from_base64(data.auth)),
                },
              },
            }
          );
        }
      } catch (e: unknown) {
        if (process.env.NODE_ENV !== "production") {
          console.log(e);
        }

        this.send({
          t: SocketMessageType.SReset,
          d: {
            error: (e as Error).message,
          },
        });
      }
    });

    ws.on("close", async () => {
      sockets = sockets.filter((s) => s !== this);

      if (this.session) {
        await propagateStatusUpdate(this.session.userId);
      }

      await this.callReset();

      clearInterval(this.pingInterval as unknown as NodeJS.Timeout);
    });

    ws.on("pong", () => {
      this.alive = true;
    });

    this.ws = ws;
    this.init = new Date();
    this.away = false;
    this.alive = true;

    setTimeout(() => {
      if (!this.session) {
        this.ws.close();
      }
    }, 1000 * 30);

    this.pingInterval = +setInterval(() => {
      if (!this.alive) {
        ws.close();
      }

      this.alive = false;
      ws.ping();
    }, 1000 * 30);
  }

  async send(msg: ISocketMessage): Promise<void> {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      //
    }

    if (msg.t === SocketMessageType.SCallReset) {
      await this.callReset();
    }

    if (msg.t === SocketMessageType.SReset) {
      this.ws.close();
    }
  }

  async callReset() {
    if (this.session && this.callChannelId) {
      const channel = (await Channel.findOne({
        _id: this.callChannelId,
      })) as IChannel;

      for (const user of channel.users.filter(
        (user) =>
          !user.hidden && user.id.compare((this.session as ISession).userId)
      )) {
        await dispatchSocket({
          userId: user.id,
          message: {
            t: SocketMessageType.SChannelUserUpdate,
            d: {
              channelId: sodium.to_base64(channel._id),
              id: sodium.to_base64(this.session.userId),
              inCall: false,
            },
          },
        });
      }

      delete this.callChannelId;
    }
  }
}

export default (ws: WebSocket): void => {
  sockets.push(new Socket(ws));
};
