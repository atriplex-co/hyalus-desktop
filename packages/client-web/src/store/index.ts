import { ref } from "vue";
import { iceServers, idbDel, idbGet, idbKeys, idbSet } from "../util";
import Axios from "axios";
import sodium from "libsodium-wrappers";
import { router } from "../router";
import {
  CallRTCType,
  CallStreamType,
  ChannelType,
  ColorTheme,
  FileChunkRTCType,
  MessageType,
  SocketMessageType,
  SocketProtocol,
  Status,
} from "common";
import MarkdownIt from "markdown-it";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItLinkAttr from "markdown-it-link-attributes";
import highlight from "highlight.js";
import RnnoiseWasm from "@hyalusapp/rnnoise/dist/rnnoise.wasm?url";
import RnnoiseWorker from "../shared/rnnoiseWorker?url";

export interface IState {
  ready: boolean;
  away: boolean;
  config: IConfig;
  socket?: Socket;
  updateAvailable: boolean;
  updateRequired: boolean;
  user?: IUser;
  sessions: ISession[];
  friends: IFriend[];
  channels: IChannel[];
  call?: ICall;
  expectedEvent?: SocketMessageType;
}

export interface IConfig {
  colorTheme: ColorTheme;
  fontScale: number;
  grayscale: boolean;
  adaptiveLayout: boolean;
  audioOutput: string;
  audioInput: string;
  videoInput: string;
  videoMode: string;
  audioOutputGain: number;
  audioInputGain: number;
  audioInputTrigger: number;
  voiceRtcEcho: boolean;
  voiceRtcGain: boolean;
  voiceRtcNoise: boolean;
  voiceRnnoise: boolean;
  notifySound: boolean;
  notifySystem: boolean;
  betaBanner: boolean;
  token?: Uint8Array;
  salt?: Uint8Array;
  publicKey?: Uint8Array;
  privateKey?: Uint8Array;
}

export interface ICall {
  channelId: string;
  localStreams: ICallLocalStream[];
  remoteStreams: ICallRemoteStream[];
  start: Date;
  deaf: boolean;
}

export interface ICallLocalStream {
  type: CallStreamType;
  track: MediaStreamTrack;
  peers: ICallLocalStreamPeer[];
}

export interface ICallLocalStreamPeer {
  userId: string;
  peer: RTCPeerConnection;
}

export interface ICallRemoteStream {
  userId: string;
  type: CallStreamType;
  peer: RTCPeerConnection;
  track: MediaStreamTrack;
  audio?: {
    el: unknown; // TS won't let us put IHTMLAudioElement in an interface for whatever fucking reason.
    gain: GainNode;
  };
}

export interface ICallTile {
  user: IChannelUser | IUser;
  stream?: ICallLocalStream | ICallRemoteStream;
}

export interface IVoicePeer {
  userId: string;
  peer: RTCPeerConnection;
  tracks: IVoiceTrack[];
}

export interface IVoiceTrack {
  type: string;
  track: MediaStreamTrack;
}

export interface IUser {
  id: string;
  name: string;
  username: string;
  avatarId?: string;
  created: Date;
  authKeyUpdated: Date;
  typingEvents: boolean;
  wantStatus: Status;
  totpEnabled: boolean;
}

export interface ISession {
  id: string;
  self: boolean;
  ip: string;
  agent: string;
  created: Date;
  lastStart: Date;
}

export interface IFriend {
  id: string;
  username: string;
  name: string;
  avatarId?: string;
  publicKey: Uint8Array;
  status: Status;
  accepted: boolean;
  acceptable: boolean;
}

export interface IChannel {
  id: string;
  type: ChannelType;
  created: Date;
  name?: string;
  avatarId?: string;
  owner: boolean;
  users: IChannelUser[];
  messages: IMessage[];
}

export interface IChannelUser {
  id: string;
  username: string;
  name: string;
  avatarId?: string;
  publicKey: Uint8Array;
  status: Status;
  hidden: boolean;
  lastTyping: Date;
  inCall: boolean;
}

export interface IMessage {
  id: string;
  userId: string;
  type: MessageType;
  created: Date;
  versions: IMessageVersion[];
}

export interface IMessageVersion {
  created: Date;
  data?: Uint8Array;
  dataString?: string;
  dataFormatted?: string;
  key?: Uint8Array;
}

export interface ISocketMessage {
  t: SocketMessageType;
  d?: unknown;
}

export interface ISocketHook {
  ttl: number;
  ttlTimeout?: number;
  type: SocketMessageType;
  hook(msg: ISocketMessage): void;
}

export interface IHTMLAudioElement extends HTMLMediaElement {
  setSinkId(sinkId: string): void;
}

const messageFormatter = new MarkdownIt("zero", {
  html: false,
  linkify: true,
  highlight(str, lang) {
    if (lang && highlight.getLanguage(lang)) {
      try {
        return highlight.highlight(str, {
          language: lang,
          ignoreIllegals: true,
        }).value;
      } catch {
        //
      }
    }

    return "";
  },
})
  .enable([
    "emphasis",
    "strikethrough",
    "backticks",
    "fence",
    "linkify",
    "block",
  ])
  .use(MarkdownItEmoji)
  .use(MarkdownItLinkAttr, {
    attrs: {
      target: "_blank",
      rel: "noopener noreferrer",
      class: "font-bold underline",
    },
  });

export const processMessageVersions = (opts: {
  id: string;
  userId: string;
  type: MessageType;
  created: Date;
  versions?: {
    created: number;
    data: string;
    key?: string;
  }[];
  channel: IChannel;
}): IMessageVersion[] | undefined => {
  let sender: IUser | IChannelUser | undefined;
  let publicKey: Uint8Array | undefined;

  if (
    store.state.value.user &&
    store.state.value.config.publicKey &&
    opts.userId === store.state.value.user?.id
  ) {
    sender = store.state.value.user;
    publicKey = store.state.value.config.publicKey;
  } else {
    sender = opts.channel.users.find((user) => user.id === opts.userId);
    publicKey = sender?.publicKey;
  }

  if (!sender || !publicKey) {
    console.warn(`processMessageVersions for invalid sender: ${opts.userId}`);
    return;
  }

  const versions: IMessageVersion[] = [];

  if (opts.versions) {
    for (const version of opts.versions) {
      const data = version.data ? sodium.from_base64(version.data) : undefined;
      const key = version.key ? sodium.from_base64(version.key) : undefined;
      let dataString: string | undefined;
      let dataFormatted: string | undefined;

      if (data && key && store.state.value.config.privateKey) {
        try {
          dataString = sodium.to_string(
            sodium.crypto_secretbox_open_easy(
              data.slice(sodium.crypto_secretbox_NONCEBYTES),
              data.slice(0, sodium.crypto_secretbox_NONCEBYTES),
              sodium.crypto_box_open_easy(
                key.slice(sodium.crypto_box_NONCEBYTES),
                key.slice(0, sodium.crypto_box_NONCEBYTES),
                publicKey,
                store.state.value.config.privateKey
              )
            )
          );
        } catch (e) {
          console.warn(`failed to decrypt message: ${opts.id}`);
        }
      }

      if (data && !key) {
        try {
          dataString = sodium.to_string(data);
        } catch {
          //
        }
      }

      if (opts.type === MessageType.Text && dataString) {
        dataFormatted = messageFormatter.render(dataString).trim();
      }

      if (opts.type === MessageType.GroupName && dataString) {
        dataString = `${sender.name} set the group name to "${dataString}"`;
      }

      if (
        [MessageType.GroupAdd, MessageType.GroupRemove].indexOf(opts.type) !==
          -1 &&
        version.data
      ) {
        let target: IChannelUser | IUser | undefined;

        if (
          store.state.value.user &&
          version.data === store.state.value.user?.id
        ) {
          target = store.state.value.user;
        } else {
          target = opts.channel.users.find((user) => user.id === version.data);
        }

        if (!target) {
          console.warn(
            `processMessageVersions for invalid target: ${version.data}`
          );
          return;
        }

        if (opts.type === MessageType.GroupAdd) {
          dataString = `${sender.name} added ${target.name}`;
        }

        if (opts.type === MessageType.GroupRemove) {
          dataString = `${sender.name} removed ${target.name}`;
        }
      }

      versions.push({
        created: new Date(version.created),
        data,
        dataString,
        dataFormatted,
        key,
      });
    }
  } else {
    versions.push({
      created: opts.created,
    });

    if (opts.type === MessageType.GroupCreate) {
      versions[0].dataString = `${sender.name} created a group`;
    }

    if (opts.type === MessageType.FriendAccept) {
      if (sender === store.state.value.user) {
        versions[0].dataString = `You accepted ${opts.channel.users[0].name}'s friend request`;
      } else {
        versions[0].dataString = `${opts.channel.users[0].name} accepted your friend request`;
      }
    }

    if (opts.type === MessageType.GroupAvatar) {
      versions[0].dataString = `${sender.name} set the group avatar`;
    }

    if (opts.type === MessageType.GroupLeave) {
      versions[0].dataString = `${sender.name} left the group`;
    }
  }

  return versions;
};

export class Socket {
  ws = new WebSocket(`${location.origin.replace("http", "ws")}/api/ws`);
  hooks: ISocketHook[] = [];
  closedManually = false;

  constructor() {
    this.ws.addEventListener("open", async () => {
      if (!store.state.value.config.token) {
        this.close();
        return;
      }

      this.send({
        t: SocketMessageType.CStart,
        d: {
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
          proto: number;
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
              versions?: {
                created: number;
                data: string;
                key?: string;
              }[];
            };
          }[];
        };

        if (data.proto !== SocketProtocol) {
          store.state.value.updateAvailable = true;
          store.state.value.updateRequired = true;
          return;
        }

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

          const lastMessageVersions = processMessageVersions({
            id: channel.lastMessage.id,
            userId: channel.lastMessage.userId,
            type: channel.lastMessage.type,
            created: new Date(channel.lastMessage.created),
            versions: channel.lastMessage.versions,
            channel: out,
          });

          if (lastMessageVersions) {
            out.messages.push({
              id: channel.lastMessage.id,
              userId: channel.lastMessage.userId,
              type: channel.lastMessage.type,
              created: new Date(channel.lastMessage.created),
              versions: lastMessageVersions,
            });
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

        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }

      if (msg.t === SocketMessageType.SReset) {
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
          console.warn(`sessionUpdate for invalid session: ${data.id}`);
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
          console.warn(`friendUpdate for invalid ID: ${data.id}`);
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
            versions?: {
              created: number;
              data: string;
              key?: string;
            }[];
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

        const lastMessageVersions = processMessageVersions({
          id: data.lastMessage.id,
          userId: data.lastMessage.userId,
          type: data.lastMessage.type,
          created: new Date(data.lastMessage.created),
          versions: data.lastMessage.versions,
          channel,
        });

        if (lastMessageVersions) {
          channel.messages.push({
            id: data.lastMessage.id,
            userId: data.lastMessage.userId,
            type: data.lastMessage.type,
            created: new Date(data.lastMessage.created),
            versions: lastMessageVersions,
          });
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
          console.warn(`channelUpdate for invalid channel: ${data.id}`);
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
          console.warn(`channelUserUpdate for invalid user: ${data.id}`);
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
        }

        if (
          store.state.value.call &&
          store.state.value.call.channelId === data.channelId
        ) {
          if (data.inCall) {
            for (const stream of store.state.value.call.localStreams) {
              await store.callSendLocalStream(stream, data.id);
            }
          } else {
            for (const stream of store.state.value.call.localStreams) {
              for (const peer of stream.peers.filter(
                (peer) => peer.userId === data.id
              )) {
                peer.peer.close();
              }
            }

            for (const stream of store.state.value.call.remoteStreams.filter(
              (stream) => stream.userId === data.id
            )) {
              stream.peer.close();
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
          versions?: {
            created: number;
            data: string;
            key?: string;
          }[];
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`messageCreate for invalid channel: ${data.channelId}`);
          return;
        }

        const versions = processMessageVersions({
          id: data.id,
          userId: data.userId,
          type: data.type,
          created: new Date(data.created),
          versions: data.versions,
          channel,
        });

        if (!versions) {
          return;
        }

        channel.messages.push({
          id: data.id,
          userId: data.userId,
          type: data.type,
          created: new Date(data.created),
          versions,
        });

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
            versions?: {
              created: number;
              data: string;
              key?: string;
            }[];
          };
        };

        const channel = store.state.value.channels.find(
          (channel) => channel.id === data.channelId
        );

        if (!channel) {
          console.warn(`messageDelete for invalid channel: ${data.channelId}`);
          return;
        }

        channel.messages = channel.messages.filter(
          (message) => message.id !== data.id
        );

        if (data.lastMessage) {
          const versions = processMessageVersions({
            id: data.lastMessage.id,
            userId: data.lastMessage.userId,
            type: data.lastMessage.type,
            created: new Date(data.lastMessage.created),
            versions: data.lastMessage.versions,
            channel,
          });

          if (!versions) {
            return;
          }

          channel.messages = channel.messages.filter(
            (message) => message.id !== data.lastMessage?.id
          );

          channel.messages.push({
            id: data.lastMessage.id,
            userId: data.lastMessage.userId,
            type: data.lastMessage.type,
            created: new Date(data.lastMessage.created),
            versions,
          });

          channel.messages.sort((a, b) => (a.created > b.created ? 1 : -1));
        }

        store.state.value.channels.sort((a, b) =>
          (a.messages.at(-1)?.created || a.created) <
          (b.messages.at(-1)?.created || b.created)
            ? 1
            : -1
        );
      }

      if (msg.t === SocketMessageType.SMessageVersionCreate) {
        //
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
          console.warn(`fileChunkRequest for invalid hash: ${data.hash}`);
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
          console.warn(`fileChunkRequest for invalid user: ${data.userId}`);
          return;
        }

        const peer = new RTCPeerConnection({ iceServers });
        const dc = peer.createDataChannel("");

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
              await peer.setRemoteDescription(
                new RTCSessionDescription({
                  type: "answer",
                  sdp: dataDecrypted.d,
                })
              );
            }

            if (dataDecrypted.t === FileChunkRTCType.ICECandidate) {
              await peer.addIceCandidate(
                new RTCIceCandidate(JSON.parse(dataDecrypted.d))
              );
            }
          },
        });

        peer.addEventListener("icecandidate", ({ candidate }) => {
          if (!candidate) {
            return;
          }

          sendPayload({
            t: FileChunkRTCType.ICECandidate,
            d: JSON.stringify(candidate),
          });
        });

        peer.addEventListener("connectionstatechange", () => {
          console.debug(`f_rtc/peer: ${peer.connectionState}`);
        });

        dc.addEventListener("open", () => {
          console.debug("f_rtc/dc: open");

          const msgSize = 1024 * 16;

          for (let i = 0; i < Math.ceil(chunk.length / msgSize); i++) {
            dc.send(chunk.slice(i * msgSize, i * msgSize + msgSize).buffer);
          }

          dc.send(""); //basically EOF.

          setTimeout(() => {
            peer.close();
          }, 1000 * 10);
        });

        dc.addEventListener("close", () => {
          console.debug("f_rtc/dc: close");
        });

        await peer.setLocalDescription(await peer.createOffer());

        sendPayload({
          t: FileChunkRTCType.SDP,
          d: peer.localDescription?.sdp,
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
          const peer = new RTCPeerConnection({ iceServers });

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

          peer.addEventListener("icecandidate", ({ candidate }) => {
            if (!candidate) {
              return;
            }

            sendPayload({
              mt: CallRTCType.LocalTrackICECandidate,
              st: dataDecrypted.st,
              d: JSON.stringify(candidate),
            });
          });

          peer.addEventListener("track", ({ track }) => {
            if (!store.state.value.call) {
              return;
            }

            const stream: ICallRemoteStream = {
              userId: data.userId,
              type: dataDecrypted.st,
              peer,
              track,
            };

            store.state.value.call.remoteStreams.push(stream);

            if (track.kind === "audio") {
              const el2 = document.createElement("audio");

              el2.onloadedmetadata = () => {
                const ctx = new AudioContext();
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
                el.setSinkId(store.state.value.config.audioOutput);
                el.play();

                stream.audio = {
                  el,
                  gain,
                };
              };

              el2.srcObject = new MediaStream([track]);
              el2.volume = 0;
              el2.play();
            }
          });

          peer.addEventListener("datachannel", ({ channel: dc }) => {
            dc.addEventListener("close", () => {
              console.debug("c_rtc/dc: remoteStream close");

              if (!store.state.value.call) {
                return;
              }

              store.state.value.call.remoteStreams =
                store.state.value.call.remoteStreams.filter(
                  (stream) => stream.peer !== peer
                );
            });
          });

          peer.addEventListener("connectionstatechange", () => {
            console.debug(`c_rtc/peer: ${peer.connectionState}`);
          });

          await peer.setRemoteDescription(
            new RTCSessionDescription({
              type: "offer",
              sdp: dataDecrypted.d,
            })
          );
          await peer.setLocalDescription(await peer.createAnswer());

          sendPayload({
            mt: CallRTCType.LocalTrackAnswer,
            st: dataDecrypted.st,
            d: peer.localDescription?.sdp,
          });
        }

        if (dataDecrypted.mt === CallRTCType.RemoteTrackICECandidate) {
          const stream = store.state.value.call.remoteStreams.find(
            (stream) =>
              stream.userId === data.userId && stream.type === dataDecrypted.st
          );

          if (!stream) {
            console.warn("SCallRTC+RemoteTrackICECandidate missing stream");
            return;
          }

          await stream.peer.addIceCandidate(
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
          )?.peer;

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
            peer.peer.close();
          }
        }

        for (const stream of store.state.value.call.remoteStreams) {
          stream.peer.close();
        }
      }

      if (!this.closedManually) {
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
    this.closedManually = true;
    this.ws.close();
  }

  registerHook(hook: ISocketHook): void {
    this.hooks.push(hook);

    hook.ttlTimeout = +setTimeout(() => {
      this.hooks = this.hooks.filter((h) => h !== hook);
    }, hook.ttl);
  }
}

export const axios = Axios.create();

export const store = {
  state: ref<IState>({
    ready: false,
    away: false,
    config: {
      colorTheme: ColorTheme.Green,
      fontScale: 100,
      grayscale: false,
      adaptiveLayout: false,
      audioOutput: "default",
      audioInput: "default",
      videoInput: "default",
      videoMode: "720p60",
      audioOutputGain: 100,
      audioInputGain: 100,
      audioInputTrigger: 60,
      voiceRtcEcho: true,
      voiceRtcGain: true,
      voiceRtcNoise: true,
      voiceRnnoise: true,
      notifySound: true,
      notifySystem: true,
      betaBanner: true,
    },
    updateAvailable: false,
    updateRequired: false,
    sessions: [],
    friends: [],
    channels: [],
  }),
  async start(): Promise<void> {
    // TODO: remove r2->r3 compat code, 2021.12.19
    // TODO: remove r2->r3 compat code, 2021.12.19
    // TODO: remove r2->r3 compat code, 2021.12.19
    try {
      const oldLocalConfig = (await idbGet("localConfig")) as Record<
        string,
        unknown
      >;
      const oldUserKeys = (await idbGet("userKeys")) as Record<string, unknown>;

      if (oldLocalConfig) {
        await idbSet("config", {
          ...idbGet("config"),
          adaptiveLayout: oldLocalConfig.adaptiveLayout,
          audioInput: oldLocalConfig.audioInput,
          audioInputGain: oldLocalConfig.audioInputGain,
          audioOutput: oldLocalConfig.audioOutput,
          audioOutputGain: oldLocalConfig.audioOutputGain,
          betaBanner: !oldLocalConfig.betaBannerHidden,
          colorTheme: oldLocalConfig.colorTheme,
          fontScale: oldLocalConfig.fontScale,
          grayscale: oldLocalConfig.grayscale,
          notifySound: oldLocalConfig.notifySound,
          notifySystem: oldLocalConfig.notifySystem,
          videoInput: oldLocalConfig.videoInput,
          videoMode: oldLocalConfig.videoMode,
          voiceRtcEcho: oldLocalConfig.voiceRtcEcho,
          voiceRtcNoise: oldLocalConfig.voiceRtcNoise,
          voiceRtcGain: oldLocalConfig.voiceRtcGain,
          voiceRnnoise: oldLocalConfig.voiceRnnoise,
        });

        await idbDel("localConfig");
      }

      if (oldUserKeys) {
        await idbSet("config", {
          ...idbGet("config"),
          salt: oldUserKeys.salt,
          token:
            oldUserKeys.token &&
            sodium.from_base64(oldUserKeys.token as string),
          publicKey: oldUserKeys.publicKey,
          privateKey: oldUserKeys.privateKey,
        });

        await idbDel("userKeys");
      }
    } catch {
      //
    }
    // TODO: remove r2->r3 compat code, 2021.12.19
    // TODO: remove r2->r3 compat code, 2021.12.19
    // TODO: remove r2->r3 compat code, 2021.12.19

    this.state.value.config = {
      ...this.state.value.config,
      ...((await idbGet("config")) as IConfig),
    };

    await this.updateIcon();

    if (!this.state.value.config.token) {
      return;
    }

    (
      axios.defaults.headers as {
        authorization?: string;
      }
    )["authorization"] = sodium.to_base64(this.state.value.config.token);

    this.state.value.socket = new Socket();
  },
  async writeConfig(k: string, v: unknown): Promise<unknown> {
    this.state.value.config = (await idbSet("config", {
      ...this.state.value.config,
      [k]: v,
    })) as IConfig;

    if (k === "colorTheme") {
      await this.updateIcon();
    }

    if (k === "audioOutput" && this.state.value.call) {
      for (const stream of this.state.value.call.remoteStreams) {
        if (!stream.audio) {
          continue;
        }

        (stream.audio.el as IHTMLAudioElement).setSinkId(
          this.state.value.config.audioOutput
        );
      }
    }

    if (k === "audioOutputGain" && this.state.value.call) {
      for (const stream of this.state.value.call.remoteStreams) {
        if (!stream.audio) {
          continue;
        }

        stream.audio.gain.gain.value =
          this.state.value.config.audioOutputGain / 100;
      }
    }

    if (
      [
        "audioInput",
        "voiceRtcEcho",
        "voiceRtcGain",
        "voiceRtcNoise",
        "voiceRnnoise",
      ].indexOf(k) !== -1 &&
      this.state.value.call &&
      this.state.value.call.localStreams.find(
        (stream) => stream.type === CallStreamType.Audio
      )
    ) {
      await this.callRemoveLocalStream(CallStreamType.Audio);
      await this.callAddLocalStream(CallStreamType.Audio);
    }

    if (
      k === "videoInput" &&
      this.state.value.call &&
      this.state.value.call.localStreams.find(
        (stream) => stream.type === CallStreamType.Audio
      )
    ) {
      await this.callRemoveLocalStream(CallStreamType.Video);
      await this.callAddLocalStream(CallStreamType.Video);
    }

    return v;
  },
  async updateIcon(): Promise<void> {
    (document.querySelector("link[rel='icon']") as HTMLLinkElement).href = (
      await import(
        `../assets/images/icon-standalone-${ColorTheme[
          this.state.value.config.colorTheme
        ].toLowerCase()}.png`
      )
    ).default;
  },
  async callSendLocalStream(
    localStream: ICallLocalStream,
    userId: string
  ): Promise<void> {
    const channel = store.state.value.channels.find(
      (channel) => channel.id === store.state.value.call?.channelId
    );

    if (!channel) {
      console.warn("callSendLocalStream missing channel");
      return;
    }

    const user = channel.users.find((user) => user.id === userId);

    if (!user) {
      console.warn("callSendLocalStream missing user");
      return;
    }

    if (localStream.peers.find((peer) => peer.userId === userId)) {
      console.warn("callSendLocalStream already has localStream peer");
      return;
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

      this.state.value.socket?.send({
        t: SocketMessageType.CCallRTC,
        d: {
          userId,
          data: sodium.to_base64(
            new Uint8Array([
              ...nonce,
              ...sodium.crypto_box_easy(
                JSON.stringify(val),
                nonce,
                user.publicKey,
                store.state.value.config.privateKey as unknown as Uint8Array
              ),
            ])
          ),
        },
      });
    };

    const peer = new RTCPeerConnection({ iceServers });
    const dc = peer.createDataChannel(""); // allows us to detect when the peer gets closed much quicker.
    const streamPeer =
      localStream.peers[
        localStream.peers.push({
          userId,
          peer,
        }) - 1 // don't touch this, prevents vue's "reactive"-ness from breaking things.
      ];

    peer.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) {
        return;
      }

      sendPayload({
        mt: CallRTCType.RemoteTrackICECandidate,
        st: localStream.type,
        d: JSON.stringify(candidate),
      });
    });

    peer.addEventListener("connectionstatechange", () => {
      console.debug(`c_rtc/peer: ${peer.connectionState}`);
    });

    dc.addEventListener("close", async () => {
      console.debug("c_rtc/dc: localStream close");

      localStream.peers = localStream.peers.filter(
        (streamPeer2) => streamPeer2 !== streamPeer
      );

      if (
        store.state.value.ready &&
        store.state.value.call &&
        store.state.value.call.localStreams.find(
          (localStream2) => localStream2 === localStream
        ) &&
        store.state.value.channels
          .find((channel) => channel.id === store.state.value.call?.channelId)
          ?.users.find((user) => user.id === userId)?.inCall
      ) {
        await this.callSendLocalStream(localStream, userId);
      }
    });

    peer.addTrack(localStream.track);
    await peer.setLocalDescription(await peer.createOffer());

    sendPayload({
      mt: CallRTCType.RemoteTrackOffer,
      st: localStream.type,
      d: peer.localDescription?.sdp,
    });
  },
  async callAddLocalStream(
    type: CallStreamType,
    track?: MediaStreamTrack
  ): Promise<void> {
    if (!store.state.value.call) {
      console.warn("callAddLocalStream missing call");
      return;
    }

    if (!track && type === CallStreamType.Audio) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: {
            ideal: this.state.value.config.audioInput,
          },
          autoGainControl: this.state.value.config.voiceRtcGain,
          noiseSuppression:
            !this.state.value.config.voiceRnnoise &&
            this.state.value.config.voiceRtcNoise,
          echoCancellation:
            !this.state.value.config.voiceRnnoise &&
            this.state.value.config.voiceRtcEcho,
        }, // TS is stupid here and complains.
      });

      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const dest = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      const gain2 = ctx.createGain();
      const analyser = ctx.createAnalyser();
      const analyserData = new Uint8Array(analyser.frequencyBinCount);
      const proc = ctx.createScriptProcessor(512, 1, 1);
      let closeTimeout: number;

      proc.addEventListener("audioprocess", () => {
        analyser.getByteFrequencyData(analyserData);

        if (
          analyserData.reduce((a, b) => a + b) / analyserData.length >
          this.state.value.config.audioInputTrigger / 10
        ) {
          gain2.gain.value = 1;

          if (closeTimeout) {
            clearTimeout(closeTimeout);
          }

          closeTimeout = +setTimeout(() => {
            gain2.gain.value = 0;
          }, 100);
        }

        gain.gain.value = this.state.value.config.audioInputGain / 100;
      });

      if (this.state.value.config.voiceRnnoise) {
        await ctx.audioWorklet.addModule(RnnoiseWorker);
        const worklet = new AudioWorkletNode(ctx, "rnnoise-processor", {
          processorOptions: {
            wasm: new Uint8Array(
              (
                await axios.get(RnnoiseWasm, {
                  responseType: "arraybuffer",
                })
              ).data
            ),
          },
        });

        gain.connect(worklet);
        worklet.connect(analyser);
        worklet.connect(gain2);
      } else {
        gain.connect(analyser);
        gain.connect(gain2);
      }

      gain2.gain.value = 0;

      src.connect(proc);
      proc.connect(ctx.destination);
      src.connect(gain);
      gain2.connect(dest);

      track = dest.stream.getTracks()[0];

      const _stop = track.stop.bind(track);
      track.stop = () => {
        _stop();
        stream.getTracks()[0].stop();
        ctx.close();
      };
    }

    if (!track && type === CallStreamType.Video) {
      const [height, frameRate] = this.state.value.config.videoMode.split("p");

      track = (
        await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: this.state.value.config.videoInput,
            height: +height,
            frameRate: +frameRate,
          },
        })
      ).getTracks()[0];
    }

    if (!track && type === CallStreamType.Display) {
      const [height, frameRate] = this.state.value.config.videoMode.split("p");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          height: +height,
          frameRate: +frameRate,
        },
        audio: {
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: true,
          echoCancellationType: "software",
        } as unknown as MediaTrackConstraints, // TS is stupid here and complains.
      });

      for (const track of stream.getTracks()) {
        if (track.kind === "video") {
          await this.callAddLocalStream(CallStreamType.Display, track);
        }

        if (track.kind === "audio") {
          await this.callAddLocalStream(CallStreamType.DisplayAudio, track);
        }
      }
    }

    if (!track) {
      console.warn("callAddLocalStream missing track");
      return;
    }

    const stream: ICallLocalStream = {
      type,
      track,
      peers: [],
    };

    store.state.value.call.localStreams.push(stream);

    track.addEventListener("ended", async () => {
      await this.callRemoveLocalStream(stream.type);
    });

    const channel = store.state.value.channels.find(
      (channel) => channel.id === store.state.value.call?.channelId
    );

    if (!channel) {
      return;
    }

    for (const user of channel.users.filter((user) => user.inCall)) {
      await this.callSendLocalStream(stream, user.id);
    }
  },
  async callRemoveLocalStream(type: CallStreamType): Promise<void> {
    if (!store.state.value.call) {
      console.warn("callRemoveLocalStream missing call");
      return;
    }

    const stream = store.state.value.call.localStreams.find(
      (stream) => stream.type === type
    );

    if (!stream) {
      console.warn("callRemoveLocalStream missing stream");
      return;
    }

    store.state.value.call.localStreams =
      store.state.value.call.localStreams.filter(
        (stream2) => stream2 !== stream
      );

    stream.track.stop();

    for (const { peer } of stream.peers) {
      peer.close();
    }
  },
  async callStart(channelId: string): Promise<void> {
    store.state.value.call = {
      channelId,
      localStreams: [],
      remoteStreams: [],
      start: new Date(),
      deaf: false,
    };

    store.state.value.socket?.send({
      t: SocketMessageType.CCallStart,
      d: {
        channelId,
      },
    });
  },
  async callReset(): Promise<void> {
    if (!store.state.value.call) {
      return;
    }

    for (const stream of store.state.value.call.localStreams) {
      stream.track.stop();

      for (const { peer } of stream.peers) {
        peer.close();
      }
    }

    for (const stream of store.state.value.call.remoteStreams) {
      stream.peer.close();
    }

    delete store.state.value.call;
  },
  async callSetDeaf(val: boolean) {
    if (!store.state.value.call) {
      return;
    }

    for (const stream of store.state.value.call.remoteStreams) {
      if (!stream.audio) {
        continue;
      }

      (stream.audio.el as IHTMLAudioElement).volume = val ? 0 : 1;
    }

    store.state.value.call.deaf = val;
  },
};
