import { idbGet, idbKeys } from "../global/idb";
import { iceServers } from "../global/config";
import sodium from "libsodium-wrappers";
import { router } from "../router";
import {
  CallRTCType,
  CallStreamType,
  ChannelType,
  ColorTheme,
  FileChunkRTCType,
  MessageType,
  PushProtocol,
  SocketMessageType,
  SocketProtocol,
  Status,
} from "common";
import {
  ICallPersist,
  ICallRemoteStream,
  IChannel,
  IChannelUser,
  IFriend,
  IHTMLAudioElement,
  ISocketHook,
  ISocketMessage,
} from "./types";
import { store } from "./store";
import {
  axios,
  isDesktop,
  isMobile,
  notifyGetAvatarUrl,
  notifySend,
  patchSdp,
  processMessage,
} from "./helpers";

let updateCheck: string;
let awayController: AbortController;

export class Socket {
  ws = new WebSocket(`${location.origin.replace("http", "ws")}/api/ws`);
  hooks: ISocketHook[] = [];
  preventReconnect = false;
  meta: {
    proto?: number;
    type?: string;
    vapidPublic?: string;
  } = {};

  constructor() {
    this.ws.addEventListener("open", async () => {
      if (!store.state.value.config.token) {
        this.close();
        return;
      }

      this.send({
        t: SocketMessageType.CStart,
        d: {
          proto: SocketProtocol,
          token: sodium.to_base64(store.state.value.config.token),
          away: store.state.value.away,
          fileChunks: (await idbKeys())
            .filter((key) => key.startsWith("file:"))
            .map((key) => key.slice("file:".length)),
        },
      });
    });

    this.ws.addEventListener("message", async ({ data: _data }) => {
      const msg = JSON.parse(_data) as ISocketMessage;
      console.debug("rx: %o", {
        t: SocketMessageType[msg.t],
        d: msg.d,
      });

      for (const hook of this.hooks) {
        if (msg.t !== hook.type) {
          continue;
        }

        clearTimeout(hook.ttlTimeout);
        hook.ttlTimeout = +setTimeout(() => {
          this.hooks = this.hooks.filter((h) => h !== hook);
        }, hook.ttl);

        hook.hook(msg);
      }

      if (msg.t === SocketMessageType.SReady) {
        const data = msg.d as {
          user: {
            id: string;
            name: string;
            username: string;
            avatarId?: string;
            created: number;
            authKeyUpdated: number;
            typingEvents: boolean;
            wantStatus: Status;
            totpEnabled: boolean;
            colorTheme: ColorTheme;
          };
          sessions: {
            id: string;
            self: boolean;
            ip: string;
            agent: string;
            created: number;
            lastStart: number;
          }[];
          friends: {
            id: string;
            username: string;
            name: string;
            avatarId?: string;
            publicKey: string;
            status: Status;
            accepted: boolean;
            acceptable: boolean;
          }[];
          channels: {
            id: string;
            type: ChannelType;
            created: number;
            name?: string;
            avatarId?: string;
            owner: boolean;
            users: {
              id: string;
              name: string;
              username: string;
              avatarId?: string;
              publicKey: string;
              status: Status;
              hidden: boolean;
              lastTyping: number;
              inCall: boolean;
            }[];
            lastMessage: {
              id: string;
              userId: string;
              type: MessageType;
              created: number;
              updated?: number;
              data?: string;
              key?: string;
            };
          }[];
          meta: {
            proto: number;
            type: string;
            vapidPublic: string;
          };
        };

        this.meta = data.meta;

        store.state.value.user = {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          avatarId: data.user.avatarId,
          created: new Date(data.user.created),
          authKeyUpdated: new Date(data.user.authKeyUpdated),
          typingEvents: data.user.typingEvents,
          wantStatus: data.user.wantStatus,
          totpEnabled: data.user.totpEnabled,
        };

        store.state.value.sessions = [];
        store.state.value.friends = [];
        store.state.value.channels = [];

        for (const session of data.sessions) {
          store.state.value.sessions.push({
            id: session.id,
            self: session.self,
            ip: session.ip,
            agent: session.agent,
            created: new Date(session.created),
            lastStart: new Date(session.lastStart),
          });
        }

        for (const friend of data.friends) {
          store.state.value.friends.push({
            id: friend.id,
            username: friend.username,
            name: friend.name,
            avatarId: friend.avatarId,
            publicKey: sodium.from_base64(friend.publicKey),
            status: friend.status,
            accepted: friend.accepted,
            acceptable: friend.acceptable,
          });
        }

        for (const channel of data.channels) {
          const users: IChannelUser[] = [];

          for (const user of channel.users) {
            users.push({
              id: user.id,
              username: user.username,
              name: user.name,
              avatarId: user.avatarId,
              publicKey: sodium.from_base64(user.publicKey),
              status: user.status,
              hidden: user.hidden,
              lastTyping: new Date(user.lastTyping),
              inCall: user.inCall,
            });
          }

          const out: IChannel = {
            id: channel.id,
            type: channel.type,
            created: new Date(channel.created),
            name: channel.name,
            avatarId: channel.avatarId,
            owner: channel.owner,
            users,
            messages: [],
          };

          const lastMessage = processMessage({
            ...channel.lastMessage,
            channel: out,
          });

          if (lastMessage) {
            out.messages.push(lastMessage);
          }

          store.state.value.channels.push(out);
        }

        store.state.value.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        store.state.value.ready = true;

        if (store.state.value.call) {
          this.send({
            t: SocketMessageType.CCallStart,
            d: {
              channelId: store.state.value.call.channelId,
            },
          });

          const channel = store.state.value.channels.find(
            (channel) => channel.id === store.state.value.call?.channelId
          );

          if (!channel) {
            return;
          }

          for (const user of channel.users.filter((user) => user.inCall)) {
            for (const stream of store.state.value.call.localStreams) {
              await store.callSendLocalStream(stream, user.id);
            }
          }
        }

        await store.writeConfig("colorTheme", data.user.colorTheme);

        try {
          const { data } = await axios.get("/", {
            headers: {
              accept: "*/*",
            },
          });

          if (updateCheck && updateCheck !== data) {
            store.state.value.updateAvailable = true;
          }

          updateCheck = data;
        } catch {
          //
        }

        const initPermissions = async () => {
          removeEventListener("mousedown", initPermissions);
          removeEventListener("keydown", initPermissions);

          try {
            if (!isDesktop) {
              await Notification.requestPermission();
            }

            if (isMobile || window.dev.enabled) {
              const pushSubscription = JSON.parse(
                JSON.stringify(
                  await (
                    await navigator.serviceWorker.getRegistrations()
                  )[0].pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.meta.vapidPublic,
                  })
                )
              );

              this.send({
                t: SocketMessageType.CSetPushSubscription,
                d: {
                  endpoint: pushSubscription.endpoint,
                  p256dh: pushSubscription.keys.p256dh,
                  auth: pushSubscription.keys.auth,
                  proto: PushProtocol,
                },
              });
            }
          } catch (e) {
            console.warn(e);
          }

          try {
            if (!isDesktop) {
              await IdleDetector.requestPermission();
            }

            const awayDetector = new IdleDetector();
            awayController = new AbortController();

            awayDetector.addEventListener("change", () => {
              const away = !(
                awayDetector.userState === "active" &&
                awayDetector.screenState === "unlocked"
              );

              if (store.state.value.away === away) {
                return;
              }

              store.state.value.away = away;

              if (store.state.value.ready) {
                store.state.value.socket?.send({
                  t: SocketMessageType.CSetAway,
                  d: {
                    away,
                  },
                });
              }
            });

            await awayDetector.start({
              threshold: 1000 * 60 * 10,
              signal: awayController.signal,
            });
          } catch (e) {
            console.warn(e);
          }
        };

        if (!isDesktop) {
          addEventListener("mousedown", initPermissions);
          addEventListener("keydown", initPermissions);
        } else {
          await initPermissions();
        }

        // TODO: implement on web.
        if (
          isDesktop &&
          store.state.value.config.callPersist &&
          !store.state.value.call
        ) {
          const callPersist = JSON.parse(
            store.state.value.config.callPersist
          ) as ICallPersist;

          if (
            +new Date() - callPersist.updated > 1000 * 60 * 5 ||
            !store.state.value.channels.find(
              (channel) => channel.id === callPersist.channelId
            )
          ) {
            return;
          }

          await store.callStart(callPersist.channelId);

          for (const stream of callPersist.localStreams) {
            if ([CallStreamType.Audio].indexOf(stream) === -1) {
              return;
            }

            await store.callAddLocalStream({
              type: CallStreamType.Audio,
              silent: true,
            });
          }
        }
      }

      if (msg.t === SocketMessageType.SReset) {
        const data = msg.d as {
          error?: string;
          updateRequired?: boolean;
        };

        if (data && data.updateRequired) {
          store.state.value.updateAvailable = true;
          store.state.value.updateRequired = true;
          this.close();
          return;
        }

        await store.writeConfig("token", null);
        await router.push("/auth");
      }

      if (msg.t === SocketMessageType.SSelfUpdate) {
        const data = msg.d as {
          username?: string;
          name?: string;
          avatarId?: string;
          colorTheme?: ColorTheme;
          wantStatus?: Status;
          typingEvents?: boolean;
          totpEnabled?: boolean;
        };

        if (!store.state.value.user) {
          return;
        }

        store.state.value.user = {
          ...store.state.value.user,
          ...data,
        };

        if (data.colorTheme !== undefined) {
          await store.writeConfig("colorTheme", data.colorTheme);
        }
      }

      if (msg.t === SocketMessageType.SSessionCreate) {
        const data = msg.d as {
          id: string;
          ip: string;
          agent: string;
          created: number;
        };

        store.state.value.sessions.push({
          id: data.id,
          ip: data.ip,
          agent: data.agent,
          created: new Date(data.created),
          lastStart: new Date(data.created),
          self: false,
        });
      }

      if (msg.t === SocketMessageType.SSessionUpdate) {
        const data = msg.d as {
          id: string;
          lastStart?: number;
        };

        const session = store.state.value.sessions.find(
          (session) => session.id === data.id
        );

        if (!session) {
          console.warn(`SSessionUpdate for invalid session: ${data.id}`);
          return;
        }

        if (data.lastStart !== undefined) {
          session.lastStart = new Date(data.lastStart);
        }
      }

      if (msg.t === SocketMessageType.SSessionDelete) {
        const data = msg.d as {
          id: string;
        };

        store.state.value.sessions = store.state.value.sessions.filter(
          (session) => session.id !== data.id
        );
      }

      if (msg.t === SocketMessageType.SFriendCreate) {
        const data = msg.d as {
          id: string;
          username: string;
          name: string;
          avatarId?: string;
          publicKey: string;
          status: Status;
          acceptable: boolean;
        };

        store.state.value.friends.push({
          id: data.id,
          username: data.username,
          name: data.name,
          avatarId: data.avatarId,
          publicKey: sodium.from_base64(data.publicKey),
          status: data.status,
          accepted: false,
          acceptable: data.acceptable,
        });

        if (data.acceptable) {
          notifySend({
            icon: await notifyGetAvatarUrl(data.avatarId),
            title: data.name,
            body: `${data.name} sent a friend request`,
          });
        }
      }

      if (msg.t === SocketMessageType.SFriendUpdate) {
        const data = msg.d as {
          id: string;
          accepted?: boolean;
          acceptable?: boolean;
          status?: Status;
        };

        const friend = store.state.value.friends.find(
          (friend) => friend.id === data.id
        );

        if (!friend) {
          console.warn(`SFriendUpdate for invalid ID: ${data.id}`);
          return;
        }

        if (data.accepted !== undefined) {
          friend.accepted = data.accepted;
        }

        if (data.acceptable !== undefined) {
          friend.acceptable = data.acceptable;
        }

        if (data.status !== undefined) {
          friend.status = data.status;

          for (const channel of store.state.value.channels) {
            const user = channel.users.find((user) => user.id === data.id);

            if (user) {
              user.status = data.status;
            }
          }
        }
      }

      if (msg.t === SocketMessageType.SFriendDelete) {
        const data = msg.d as {
          id: string;
        };

        store.state.value.friends = store.state.value.friends.filter(
          (friend) => friend.id !== data.id
        );

        for (const channel of store.state.value.channels) {
          const user = channel.users.find((user) => user.id === data.id);

          if (user) {
            user.status = Status.Offline;
          }
        }
      }

      if (msg.t === SocketMessageType.SChannelCreate) {
        const data = msg.d as {
          id: string;
          type: ChannelType;
          created: string;
          name?: string;
          avatarId?: string;
          owner: boolean;
          users: {
            id: string;
            name: string;
            username: string;
            avatarId?: string;
            publicKey: string;
            status: Status;
            hidden: boolean;
            inCall: boolean;
          }[];
          lastMessage: {
            id: string;
            userId: string;
            type: MessageType;
            created: number;
            updated?: number;
            data?: string;
            key?: string;
          };
        };

        const users: IChannelUser[] = [];

        for (const user of data.users) {
          users.push({
            id: user.id,
            name: user.name,
            username: user.username,
            avatarId: user.avatarId,
            publicKey: sodium.from_base64(user.publicKey),
            status: user.status,
            hidden: user.hidden,
            lastTyping: new Date(0),
            inCall: user.inCall,
          });
        }

        const channel: IChannel = {
          id: data.id,
          type: data.type,
          created: new Date(data.created),
          name: data.name,
          avatarId: data.avatarId,
          owner: data.owner,
          users,
          messages: [],
        };

        const lastMessage = processMessage({
          ...data.lastMessage,
          channel,
        });

        if (lastMessage) {
          channel.messages.push(lastMessage);
        }

        store.state.value.channels.push(channel);

        store.state.value.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        if (msg.t === store.state.value.expectedEvent) {
          await router.push(`/channels/${data.id}`);
        }
      }

      if (msg.t === SocketMessageType.SChannelUpdate) {
        const data = msg.d as {
          id: string;
          name?: string;
          avatarId?: string;
          owner?: boolean;
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.id
        );

        if (!channel) {
          console.warn(`SChannelUpdate for invalid channel: ${data.id}`);
          return;
        }

        if (data.name) {
          channel.name = data.name;
        }

        if (data.avatarId) {
          channel.avatarId = data.avatarId;
        }

        if (data.owner !== undefined) {
          channel.owner = data.owner;
        }
      }

      if (msg.t === SocketMessageType.SChannelDelete) {
        const data = msg.d as {
          id: string;
        };

        store.state.value.channels = store.state.value.channels.filter(
          (channel) => channel.id !== data.id
        );
      }

      if (msg.t === SocketMessageType.SChannelUserCreate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          username: string;
          name: string;
          avatarId?: string;
          status: Status;
          publicKey: string;
          hidden: boolean;
          lastTyping: number;
          inCall: boolean;
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `channelUserCreate for invalid channel: ${data.channelId}`
          );
          return;
        }

        channel.users.push({
          id: data.id,
          username: data.username,
          name: data.name,
          avatarId: data.avatarId,
          status: data.status,
          publicKey: sodium.from_base64(data.publicKey),
          hidden: data.hidden,
          lastTyping: new Date(data.lastTyping),
          inCall: data.inCall,
        });
      }

      if (msg.t === SocketMessageType.SChannelUserUpdate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          hidden?: boolean;
          lastTyping?: boolean;
          inCall?: boolean;
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `channelUserUpdate for invalid channel: ${data.channelId}`
          );
          return;
        }

        const user = channel.users.find((user) => user.id === data.id);

        if (!user) {
          console.warn(`SChannelUserUpdate for invalid user: ${data.id}`);
          return;
        }

        if (data.hidden !== undefined) {
          user.hidden = data.hidden;
        }

        if (data.lastTyping) {
          user.lastTyping = new Date();
        }

        if (data.inCall !== undefined) {
          user.inCall = data.inCall;

          if (
            store.state.value.call &&
            store.state.value.call.channelId === data.channelId
          ) {
            for (const stream of store.state.value.call.localStreams) {
              for (const peer of stream.peers.filter(
                (peer) => peer.userId === data.id
              )) {
                peer.pc.close();

                stream.peers = stream.peers.filter((peer2) => peer2 !== peer);
              }
            }

            for (const stream of store.state.value.call.remoteStreams.filter(
              (stream) => stream.userId === data.id
            )) {
              stream.pc.close();

              store.state.value.call.remoteStreams =
                store.state.value.call.remoteStreams.filter(
                  (stream2) => stream2.pc !== stream.pc
                );
            }

            if (data.inCall) {
              for (const stream of store.state.value.call.localStreams) {
                await store.callSendLocalStream(stream, data.id);
              }
            }
          }
        }
      }

      if (msg.t === SocketMessageType.SForeignUserUpdate) {
        const data = msg.d as {
          id: string;
          name?: string;
          username?: string;
          avatarId?: string;
          status?: Status;
        };

        const targets: (IFriend | IChannelUser)[] = [];

        const friend = store.state.value.friends.find(
          (friend) => friend.id === data.id
        );

        if (friend) {
          targets.push(friend);
        }

        for (const channel of store.state.value.channels) {
          const user = channel.users.find((user) => user.id === data.id);

          if (user) {
            targets.push(user);
          }
        }

        for (const target of targets) {
          if (data.name) {
            target.name = data.name;
          }

          if (data.username) {
            target.username = data.username;
          }

          if (data.avatarId) {
            target.avatarId = data.avatarId;
          }

          if (data.status !== undefined) {
            target.status = data.status;
          }
        }
      }

      if (msg.t === SocketMessageType.SMessageCreate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          userId: string;
          type: MessageType;
          created: number;
          updated?: number;
          data?: string;
          key?: string;
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`SMessageCreate for invalid channel: ${data.channelId}`);
          return;
        }

        const message = processMessage({
          ...data,
          channel,
        });

        if (!message) {
          return;
        }

        channel.messages.push(message);
        channel.messages.sort((a, b) => (a.created > b.created ? 1 : -1));

        store.state.value.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );

        if (msg.t === store.state.value.expectedEvent) {
          await router.push(`/channels/${data.channelId}`);
        }

        const user = channel.users.find((user) => user.id === data.userId);

        if (!user) {
          return; // also prevents us from getting notifs from ourselves, unlike some apps...
        }

        if (
          !(
            document.visibilityState === "visible" &&
            router.currentRoute.value.path === `/channels/${channel.id}`
          )
        ) {
          let title = user.name;
          let body = "";

          if (channel.name) {
            title += ` (${channel.name})`;
          }

          if (message && message.dataString) {
            body = message.dataString;
          }

          if (data.type === MessageType.Attachment) {
            try {
              body = JSON.parse(body).name;
            } catch {
              //
            }
          }

          if (!body) {
            return;
          }

          notifySend({
            icon: await notifyGetAvatarUrl(user.avatarId),
            title,
            body,
          });
        }
      }

      if (msg.t === SocketMessageType.SMessageDelete) {
        const data = msg.d as {
          id: string;
          channelId: string;
          lastMessage: {
            id: string;
            userId: string;
            type: MessageType;
            created: number;
            updated?: number;
            data?: string;
            key?: string;
          };
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`SMessageDelete for invalid channel: ${data.channelId}`);
          return;
        }

        channel.messages = channel.messages.filter(
          (message) => message.id !== data.id
        );

        if (data.lastMessage) {
          const lastMessage = processMessage({
            ...data.lastMessage,
            channel,
          });

          if (!lastMessage) {
            return;
          }

          channel.messages = channel.messages.filter(
            (message) => message.id !== data.lastMessage?.id
          );

          channel.messages.push(lastMessage);

          channel.messages.sort((a, b) => (a.created > b.created ? 1 : -1));
        }

        store.state.value.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );
      }

      if (msg.t === SocketMessageType.SMessageUpdate) {
        const data = msg.d as {
          id: string;
          channelId: string;
          updated: number;
          data: string;
          key: string;
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `messageVerionCreate for invalid channel: ${data.channelId}`
          );
          return;
        }

        const message = channel.messages.find(
          (message) => message.id === data.id
        );

        if (!message) {
          return;
        }

        const message2 = processMessage({
          ...message,
          ...data,
          channel,
        });

        if (!message2) {
          return;
        }

        channel.messages[channel.messages.indexOf(message)] = message2;
      }

      if (msg.t === SocketMessageType.SFileChunkRequest) {
        const data = msg.d as {
          hash: string;
          tag: string;
          userId: string;
          channelId: string;
        };

        const chunk = (await idbGet(`file:${data.hash}`)) as Uint8Array;

        if (!chunk) {
          console.warn(`SFileChunkRequest for invalid hash: ${data.hash}`);
          return;
        }

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(
            `fileChunkRequest for invalid channel: ${data.channelId}`
          );
          return;
        }

        let publicKey: Uint8Array | undefined;

        if (
          store.state.value.user &&
          store.state.value.user.id === data.userId
        ) {
          publicKey = store.state.value.config.publicKey;
        } else {
          publicKey = channel.users.find(
            (user) => user.id === data.userId
          )?.publicKey;
        }

        if (!publicKey) {
          console.warn(`SFileChunkRequest for invalid user: ${data.userId}`);
          return;
        }

        const pc = new RTCPeerConnection({ iceServers });
        const dc = pc.createDataChannel("");

        const sendPayload = (val: unknown) => {
          const json = JSON.stringify(val);
          console.debug("f_rtc/tx: %o", JSON.parse(json)); // yes, there's a reason for this.
          const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

          this.send({
            t: SocketMessageType.CFileChunkRTC,
            d: {
              hash: data.hash,
              tag: data.tag,
              data: sodium.to_base64(
                new Uint8Array([
                  ...nonce,
                  ...sodium.crypto_box_easy(
                    JSON.stringify(val),
                    nonce,
                    publicKey as unknown as Uint8Array,
                    store.state.value.config.privateKey as unknown as Uint8Array
                  ),
                ])
              ),
            },
          });
        };

        this.registerHook({
          ttl: 1000 * 10,
          type: SocketMessageType.SFileChunkRTC,
          async hook(msg: ISocketMessage) {
            const data2 = msg.d as {
              hash: string;
              tag: string;
              data: string;
            };

            if (data2.hash !== data.hash || data2.tag !== data.tag) {
              return;
            }

            const dataBytes = sodium.from_base64(data2.data);
            const dataDecrypted = JSON.parse(
              sodium.to_string(
                sodium.crypto_box_open_easy(
                  dataBytes.slice(sodium.crypto_box_NONCEBYTES),
                  dataBytes.slice(0, sodium.crypto_box_NONCEBYTES),
                  publicKey as unknown as Uint8Array,
                  store.state.value.config.privateKey as unknown as Uint8Array
                )
              )
            );

            console.debug("f_rtc/rx: %o", dataDecrypted);

            if (dataDecrypted.t === FileChunkRTCType.SDP) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "answer",
                  sdp: dataDecrypted.d,
                })
              );
            }

            if (dataDecrypted.t === FileChunkRTCType.ICECandidate) {
              await pc.addIceCandidate(
                new RTCIceCandidate(JSON.parse(dataDecrypted.d))
              );
            }
          },
        });

        pc.addEventListener("icecandidate", ({ candidate }) => {
          if (!candidate) {
            return;
          }

          sendPayload({
            t: FileChunkRTCType.ICECandidate,
            d: JSON.stringify(candidate),
          });
        });

        pc.addEventListener("connectionstatechange", () => {
          console.debug(`f_rtc/peer: ${pc.connectionState}`);
        });

        dc.addEventListener("open", () => {
          console.debug("f_rtc/dc: open");

          const msgSize = 1024 * 16;

          for (let i = 0; i < Math.ceil(chunk.length / msgSize); i++) {
            dc.send(chunk.slice(i * msgSize, i * msgSize + msgSize).buffer);
          }

          dc.send(""); //basically EOF.

          setTimeout(() => {
            pc.close();
          }, 1000 * 10);
        });

        dc.addEventListener("close", () => {
          pc.close();
          console.debug("f_rtc/dc: close");
        });

        await pc.setLocalDescription(await pc.createOffer());

        sendPayload({
          t: FileChunkRTCType.SDP,
          d: pc.localDescription?.sdp,
        });
      }

      if (msg.t === SocketMessageType.SCallRTC) {
        const data = msg.d as {
          userId: string;
          data: string;
        };

        if (!store.state.value.call) {
          return;
        }

        const channel = store.state.value.channels.find(
          (channel) => channel.id === store.state.value.call?.channelId
        );

        if (!channel) {
          return;
        }

        const user = channel.users.find((user) => user.id === data.userId);

        if (!user || !store.state.value.config.privateKey) {
          return;
        }

        const dataBytes = sodium.from_base64(data.data);
        const dataDecrypted: {
          mt: CallRTCType;
          st: CallStreamType;
          d: string;
        } = JSON.parse(
          sodium.to_string(
            sodium.crypto_box_open_easy(
              dataBytes.slice(sodium.crypto_box_NONCEBYTES),
              dataBytes.slice(0, sodium.crypto_box_NONCEBYTES),
              user.publicKey,
              store.state.value.config.privateKey
            )
          )
        );

        console.debug("c_rtc/rx: %o", {
          ...dataDecrypted,
          mt: CallRTCType[dataDecrypted.mt],
          st: CallStreamType[dataDecrypted.st],
        });

        if (dataDecrypted.mt === CallRTCType.RemoteTrackOffer) {
          const pc = new RTCPeerConnection({ iceServers });
          let ctx: AudioContext;

          if (
            [CallStreamType.Audio, CallStreamType.DisplayAudio].indexOf(
              dataDecrypted.st
            ) !== -1
          ) {
            ctx = new AudioContext();
          }

          const sendPayload = (val: unknown) => {
            const jsonRaw = JSON.stringify(val);
            const json = JSON.parse(jsonRaw);
            console.debug("c_rtc/tx: %o", {
              ...json,
              mt: CallRTCType[json.mt],
              st: CallStreamType[json.st],
            }); // yes, there's a reason for this.
            const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

            this.send({
              t: SocketMessageType.CCallRTC,
              d: {
                userId: data.userId,
                data: sodium.to_base64(
                  new Uint8Array([
                    ...nonce,
                    ...sodium.crypto_box_easy(
                      JSON.stringify(val),
                      nonce,
                      user.publicKey,
                      store.state.value.config
                        .privateKey as unknown as Uint8Array
                    ),
                  ])
                ),
              },
            });
          };

          pc.addEventListener("icecandidate", ({ candidate }) => {
            if (!candidate) {
              return;
            }

            sendPayload({
              mt: CallRTCType.LocalTrackICECandidate,
              st: dataDecrypted.st,
              d: JSON.stringify(candidate),
            });
          });

          pc.addEventListener("track", ({ track }) => {
            if (!store.state.value.call) {
              return;
            }

            const stream: ICallRemoteStream = {
              userId: data.userId,
              type: dataDecrypted.st,
              pc,
              track,
              config: {},
            };

            store.state.value.call.remoteStreams.push(stream);

            if (ctx) {
              const el2 = document.createElement("audio");

              el2.onloadedmetadata = () => {
                ctx = new AudioContext();
                const gain = ctx.createGain();
                const dest = ctx.createMediaStreamDestination();
                const el = document.createElement("audio") as IHTMLAudioElement;

                ctx
                  .createMediaStreamSource(el2.srcObject as MediaStream)
                  .connect(gain);
                gain.connect(dest);
                gain.gain.value =
                  store.state.value.config.audioOutputGain / 100;
                el.srcObject = dest.stream;
                el.volume = !store.state.value.call?.deaf ? 1 : -1;

                if (!isMobile) {
                  el.setSinkId(store.state.value.config.audioOutput);
                }

                el.play();

                stream.config.el = el;
                stream.config.gain = gain;
              };

              el2.srcObject = new MediaStream([track]);
              el2.volume = 0;
              el2.play();
            }
          });

          pc.addEventListener("datachannel", ({ channel: dc }) => {
            dc.addEventListener("close", () => {
              console.debug("c_rtc/dc: remoteStream close");
              pc.close();

              if (ctx) {
                ctx.close();
              }

              if (!store.state.value.call) {
                return;
              }

              store.state.value.call.remoteStreams =
                store.state.value.call.remoteStreams.filter(
                  (stream) => stream.pc !== pc
                );
            });
          });

          pc.addEventListener("connectionstatechange", () => {
            console.debug(`c_rtc/peer: ${pc.connectionState}`);
          });

          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: "offer",
              sdp: dataDecrypted.d,
            })
          );
          await pc.setLocalDescription(patchSdp(await pc.createAnswer()));

          sendPayload({
            mt: CallRTCType.LocalTrackAnswer,
            st: dataDecrypted.st,
            d: pc.localDescription?.sdp,
          });
        }

        if (dataDecrypted.mt === CallRTCType.RemoteTrackICECandidate) {
          let stream: ICallRemoteStream | undefined;

          for (let i = 0; i < 10; ++i) {
            stream = store.state.value.call.remoteStreams.find(
              (stream) =>
                stream.userId === data.userId &&
                stream.type === dataDecrypted.st
            );

            if (stream) {
              break;
            } else {
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
            }
          }

          if (!stream) {
            console.warn("SCallRTC + RemoteTrackICECandidate missing stream");
            return;
          }

          await stream.pc.addIceCandidate(
            new RTCIceCandidate(JSON.parse(dataDecrypted.d))
          );
        }

        if (
          [
            CallRTCType.LocalTrackAnswer,
            CallRTCType.LocalTrackICECandidate,
          ].indexOf(dataDecrypted.mt) !== -1
        ) {
          const stream = store.state.value.call.localStreams.find(
            (stream) => stream.type === dataDecrypted.st
          );

          if (!stream) {
            console.warn("SCallRTC missing stream");
            return;
          }

          const peer = stream.peers.find(
            (peer) => peer.userId === data.userId
          )?.pc;

          if (!peer) {
            console.warn("SCallRTC missing peer");
            return;
          }

          if (dataDecrypted.mt === CallRTCType.LocalTrackAnswer) {
            await peer.setRemoteDescription(
              new RTCSessionDescription({
                type: "answer",
                sdp: dataDecrypted.d,
              })
            );
          }

          if (dataDecrypted.mt === CallRTCType.LocalTrackICECandidate) {
            await peer.addIceCandidate(
              new RTCIceCandidate(JSON.parse(dataDecrypted.d))
            );
          }
        }
      }

      if (msg.t === SocketMessageType.SCallReset) {
        await store.callReset();
      }
    });

    this.ws.addEventListener("close", () => {
      store.state.value.ready = false;

      if (store.state.value.call) {
        for (const stream of store.state.value.call.localStreams) {
          for (const peer of stream.peers) {
            peer.pc.close();
          }
        }

        for (const stream of store.state.value.call.remoteStreams) {
          stream.pc.close();
        }
      }

      if (!this.preventReconnect) {
        setTimeout(() => {
          store.state.value.socket = new Socket();
        }, 1000);
      }
    });
  }

  send(msg: ISocketMessage): void {
    this.ws.send(JSON.stringify(msg));
    console.debug("tx: %o", {
      t: SocketMessageType[msg.t],
      d: msg.d,
    });
  }

  close(): void {
    this.preventReconnect = true;
    this.ws.close();
  }

  registerHook(hook: ISocketHook): void {
    this.hooks.push(hook);

    hook.ttlTimeout = +setTimeout(() => {
      this.hooks = this.hooks.filter((h) => h !== hook);
    }, hook.ttl);
  }
}
