import Vuex from "vuex";
import axios from "axios";
import sodium from "libsodium-wrappers";
import MarkdownIt from "markdown-it";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItLinkAttr from "markdown-it-link-attributes";
import hljs from "highlight.js";
import router from "../router";
import sndNotification from "../assets/sounds/notification_simple-01.ogg";
import sndStateUp from "../assets/sounds/state-change_confirm-up.ogg";
import sndStateDown from "../assets/sounds/state-change_confirm-down.ogg";
import sndNavBackward from "../assets/sounds/navigation_backward-selection.ogg";
import sndNavForward from "../assets/sounds/navigation_forward-selection.ogg";
import sndNavBackwardMin from "../assets/sounds/navigation_backward-selection-minimal.ogg";
import sndNavForwardMin from "../assets/sounds/navigation_forward-selection-minimal.ogg";
import imgIcon from "../assets/images/icon-background.png";
import idb from "./idb";
import Rnnoise from "@hyalusapp/rnnoise";
import RnnoiseWasm from "@hyalusapp/rnnoise/dist/rnnoise.wasm?url";

const wsProto = 1;
const maxFileSize = 1024 * 1024 * 250;
const maxFileChunkSize = 1024 * 1024 * 2;

const iceServers = [
  {
    urls: ["stun:stun.l.google.com:19302"],
  },
  {
    urls: ["stun:stun1.l.google.com:19302"],
  },
];

const messageFormatter = new MarkdownIt("zero", {
  html: false,
  linkify: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, {
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

let rnnoise;

const notify = async (opts) => {
  if (store.getters.localConfig.notifySound) {
    try {
      new Audio(sndNotification).play();
    } catch {
      //
    }
  }

  let icon = imgIcon;

  if (opts.avatarId) {
    icon = `${store.getters.baseUrl}/api/avatars/${opts.avatarId}`;
  }

  if (store.getters.localConfig.notifySystem) {
    try {
      new Notification(opts.title, {
        icon,
        body: opts.body,
        silent: true,
      });
    } catch {
      //
    }
  }
};

const store = new Vuex.Store({
  state: {
    loginKeys: null,
    userKeys: null,
    localConfig: null,
    ws: null,
    ready: false,
    user: null,
    friends: [],
    channels: [],
    sessions: [],
    lastEvent: "",
    voice: null,
    baseUrl: null,
    invite: null,
    sidebarHidden: false,
    updateRequired: false,
    userInvite: "",
  },
  getters: {
    baseUrl: (state) => state.baseUrl,
    ws: (state) => state.ws,
    ready: (state) => state.ready,
    localConfig: (state) => state.localConfig,
    user: (state) => state.user,
    userKeys: (state) => state.userKeys,
    friends: (state) => state.friends,
    channels: (state) => state.channels,
    channelById: (state) => (channelId) =>
      state.channels.find((channel) => channel.id === channelId),
    sessions: (state) => state.sessions,
    voice: (state) => state.voice,
    loginKeys: (state) => state.loginKeys,
    lastEvent: (state) => state.lastEvent,
    updateRequired: (state) => state.updateRequired,
    userInvite: (state) => state.userInvite,
  },
  mutations: {
    setUser(state, val) {
      if (val) {
        val.authKeyUpdated = new Date(val.authKeyUpdated);
      }

      state.user = val;
    },
    setWs(state, val) {
      if (state.ws && state.ws.readyState === 1) {
        state.ws.close();
      }

      state.ws = val;
    },
    setBaseUrl(state, val) {
      state.baseUrl = val;
      axios.defaults.baseURL = val;
    },
    setVoice(state, channelId) {
      if (channelId) {
        state.voice = {
          channelId,
          peers: [],
          tracks: [],
          deaf: false,
          time: new Date(),
        };
      } else {
        state.voice = null;
      }
    },
    resetVoiceTime(state) {
      state.voice.time = new Date();
    },
    setReady(state, val) {
      state.ready = val;
    },
    setSidebarHidden(state, val) {
      state.sidebarHidden = val;
    },
    setUserKeys(state, val) {
      state.userKeys = val;
    },
    setLocalConfig(state, val) {
      state.localConfig = val;
    },
    handleSetUsername(state, { username }) {
      state.user.username = username;
    },
    handleSetName(state, { name }) {
      state.user.name = name;
    },
    handleSetAvatarId(state, { avatarId }) {
      state.user.avatarId = avatarId;
    },
    handleFriendCreate(state, val) {
      state.friends.push(val);
    },
    handleFriendDelete(state, { id }) {
      state.friends = state.friends.filter((f) => f.id !== id);
    },
    setFriends(state, val) {
      state.friends = val;
    },
    setChannels(state, val) {
      state.channels = val;
    },
    setSessions(state, val) {
      state.sessions = val;
    },
    handleFriendAccept(state, { id }) {
      const friend = state.friends.find((f) => f.id === id);
      friend.accepted = true;
      friend.canAccept = false;
    },
    handleChannelCreate(state, val) {
      state.channels.push({
        ...val,
        users: [],
        messages: [],
        created: new Date(val.created),
      });
    },
    handleForeignUserSetUsername(state, { id, username }) {
      const friend = state.friends.find((f) => f.id === id);
      if (friend) {
        friend.username = username;
      }

      state.channels.map((channel) => {
        const user = channel.users.find((u) => u.id === id);
        if (user) {
          user.username = username;
        }
      });
    },
    handleForeignUserSetName(state, { id, name }) {
      const friend = state.friends.find((f) => f.id === id);
      if (friend) {
        friend.name = name;
      }

      state.channels.map((channel) => {
        const user = channel.users.find((u) => u.id === id);
        if (user) {
          user.name = name;
          if (channel.type === "private") {
            channel.name = name;
          }
        }
      });
    },
    handleForeignUserSetAvatarId(state, { id, avatarId }) {
      const friend = state.friends.find((f) => f.id === id);
      if (friend) {
        friend.avatarId = avatarId;
      }

      state.channels.map((channel) => {
        const user = channel.users.find((u) => u.id === id);
        if (user) {
          user.avatarId = avatarId;
          if (channel.type === "private") {
            channel.avatarId = avatarId;
          }
        }
      });
    },
    handleChannelUserCreate(state, val) {
      const channel = state.channels.find(
        (channel) => channel.id === val.channelId
      );

      if (channel.type === "private") {
        channel.avatarId = val.avatarId;
        channel.name = val.name;
      }

      channel.users.push({
        ...val,
        publicKey: sodium.from_base64(val.publicKey),
      });
    },
    handleMessageCreate(state, val) {
      const channel = state.channels.find(
        (channel) => channel.id === val.channelId
      );

      if (channel.messages.find((m) => m.id === val.id)) {
        return;
      }

      if (val.userId === state.user.id) {
        val.user = state.user;
      } else {
        val.user = channel.users.find((u) => u.id === val.userId);
      }

      val.created = new Date(val.created);

      if (val.key) {
        val.key = sodium.from_base64(val.key);

        val.body = sodium.from_base64(val.body);

        try {
          val.keyDecrypted = sodium.crypto_box_open_easy(
            val.key.slice(sodium.crypto_box_NONCEBYTES),
            val.key.slice(0, sodium.crypto_box_NONCEBYTES),
            val.user?.publicKey || state.userKeys.publicKey,
            state.userKeys.privateKey
          );

          val.bodyDecrypted = sodium.crypto_secretbox_open_easy(
            val.body.slice(sodium.crypto_secretbox_NONCEBYTES),
            val.body.slice(0, sodium.crypto_secretbox_NONCEBYTES),
            val.keyDecrypted
          );
        } catch (e) {
          console.warn(e);
          console.warn(`failed to decrypt meesage ${val.id}`);
          val.error = "Failed to decrypt message";
        }
      }

      if (val.type === "text" && val.bodyDecrypted) {
        val.bodyString = sodium.to_string(val.bodyDecrypted);
        val.bodyFormatted = messageFormatter
          .render(val.bodyString)
          .trim()
          .replaceAll("\n<pre", '\n<pre class="mt-2"')
          .replaceAll("/pre>\n", '/pre><p class="mb-4"/>\n'); //the margin tricks are for codeblocks.
      }

      if (val.type === "friendAccept") {
        const target = channel.users[0].name;

        if (val.user === state.user) {
          val.eventText = `You accepted ${target}'s friend request`;
        } else {
          val.eventText = `${target} accepted your friend request`;
        }
      }

      if (val.type === "groupCreate") {
        val.eventText = `${val.user.name} created a group`;
      }

      if (val.type === "groupLeave") {
        val.eventText = `${val.user.name} left the group`;
      }

      if (["groupAdd", "groupRemove"].indexOf(val.type) !== -1) {
        if (val.body === state.user.id) {
          val.target = state.user;
        } else {
          val.target = channel.users.find((u) => u.id === val.body);
        }

        if (val.type === "groupAdd") {
          val.eventText = `${val.user.name} added ${val.target.name} to the group`;
        }

        if (val.type === "groupRemove") {
          val.eventText = `${val.user.name} removed ${val.target.name} from the group`;
        }
      }

      if (val.type === "groupName") {
        val.eventText = `${val.user.name} renamed the group`;

        if (val.bodyString) {
          val.eventText += ` to ${val.bodyString}`;
        }
      }

      if (val.type === "groupAvatar") {
        val.eventText = `${val.user.name} set the group icon`;
      }

      if (val.type === "file" && val.bodyDecrypted) {
        val.file = JSON.parse(sodium.to_string(val.bodyDecrypted));

        if (val.file.header) {
          val.file.header = sodium.from_base64(val.file.header);
        }

        if (val.file.key) {
          val.file.key = sodium.from_base64(val.file.key);
        }

        if (val.file.size) {
          let sizeFormattedUnits = "BKMG";
          let sizeFormattedUnit = 0;
          let sizeFormattedNum = val.file.size;
          while (sizeFormattedNum > 1000) {
            sizeFormattedNum /= 1024;
            sizeFormattedUnit++;
          }

          val.file.sizeFormatted = `${Math.floor(sizeFormattedNum)}${
            sizeFormattedUnits[sizeFormattedUnit]
          }`;
        }

        if (val.file.size < 1024 * 1024 * 10 && val.file.type) {
          const t1 = val.file.type.split("/")[0];
          if (["image", "audio", "video"].indexOf(t1) !== -1) {
            val.file.preview = t1;
          }
        }
      }

      if (val.sound) {
        let title = val.user.name;

        if (channel.type === "group") {
          title += ` (${channel.name})`;
        }

        notify({
          avatarId: val.user.avatarId,
          title,
          body: val.bodyString || val.eventText || val.file?.name || val.error,
        });
      }

      channel.messages.push(Object.freeze(val));
      channel.messages = channel.messages.sort((a, b) => {
        return a.created > b.created ? 1 : -1;
      });
    },
    handleMessageDelete(state, val) {
      const channel = state.channels.find((c) => c.id === val.channelId);

      channel.messages = channel.messages.filter((m) => m.id !== val.id);
    },
    handleSetColorTheme(state, { colorTheme }) {
      state.user.colorTheme = colorTheme;
    },
    handleSetTypingEvents(state, { typingEvents }) {
      state.user.typingEvents = typingEvents;
    },
    handleSessionCreate(state, val) {
      state.sessions.push({
        ...val,
        created: new Date(val.created),
        lastStart: new Date(val.lastStart || Date.now()),
      });
    },
    handleSessionDelete(state, { id }) {
      state.sessions = state.sessions.filter((s) => s.id !== id);
    },
    handleSessionStart(state, { id }) {
      const session = state.sessions.find((s) => s.id === id);

      if (!session) {
        return;
      }

      session.lastStart = new Date();
    },
    handleSetTotpEnabled(state, { totpEnabled }) {
      state.user.totpEnabled = totpEnabled;
    },
    setLoginKeys(state, val) {
      state.loginKeys = val;
    },
    handleChannelSetName(state, { id, name }) {
      const channel = state.channels.find((c) => c.id === id);
      channel.name = name;
    },
    handleChannelSetAvatarId(state, { id, avatarId }) {
      const channel = state.channels.find((c) => c.id === id);
      channel.avatarId = avatarId;
    },
    handleChannelSetOwner(state, { id, owner }) {
      const channel = state.channels.find((c) => c.id === id);
      channel.owner = owner;
    },
    handleChannelDelete(state, { id }) {
      state.channels = state.channels.filter((c) => c.id !== id);
    },
    handleChannelUserSetHidden(state, { id, channelId, hidden }) {
      const channel = state.channels.find((c) => c.id === channelId);
      const user = channel.users.find((u) => u.id === id);

      user.hidden = hidden;
    },
    handleChannelUserSetInVoice(state, { id, channelId, inVoice }) {
      const channel = state.channels.find((c) => c.id === channelId);
      const user = channel.users.find((u) => u.id === id);

      user.inVoice = inVoice;
    },
    setLastEvent(state, val) {
      state.lastEvent = val;
    },
    addWsFilterCallback(state, val) {
      state.ws.filterCallbacks.push(val);
    },
    setVoicePeer(state, { peer }) {
      state.voice.peers.push(peer);
    },
    deleteVoicePeer(state, { userId }) {
      state.voice.peers = state.voice.peers.filter((p) => p.userId !== userId);
    },
    setVoiceTrack(state, { track }) {
      state.voice.tracks.push(track);
    },
    deleteVoiceTrack(state, { type }) {
      state.voice.tracks = state.voice.tracks.filter((t) => t.type !== type);
    },
    setVoicePeerTrack(state, { userId, track }) {
      const peer = state.voice.peers.find((p) => p.userId === userId);

      if (!peer) {
        return;
      }

      peer.tracks.push(track);
    },
    deleteVoicePeerTrack(state, { userId, id }) {
      const peer = state.voice.peers.find((p) => p.userId === userId);

      if (!peer) {
        return;
      }

      peer.tracks = peer.tracks.filter((t) => t.id !== id);
    },
    setVoiceDeaf(state, val) {
      state.voice.deaf = val;
    },
    truncateMessages(state, { channelId, method, keep = 0 }) {
      const channel = state.channels.find((c) => c.id === channelId);

      if (!channel) {
        return;
      }

      if (channel.messages.length < 100) {
        return;
      }

      const last = channel.messages[channel.messages.length - 1];

      if (method === "before") {
        channel.messages = channel.messages.slice(0, 100);
      }

      if (method === "after") {
        channel.messages = channel.messages.slice(-100);
      }

      if (!method) {
        channel.messages = channel.messages.slice(keep * -1);
      }

      if (channel.messages.indexOf(last) === -1) {
        channel.messages.push(last); //makes sure we don't throw out the last message.
      }
    },
    setUpdateRequired(state, val) {
      state.updateRequired = val;
    },
    setUserInvite(state, val) {
      state.userInvite = val;
    },
  },
  actions: {
    async register({ dispatch }, data) {
      const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

      const symKey = sodium.crypto_pwhash(
        32,
        data.password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = sodium.crypto_pwhash(
        32,
        symKey,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const { publicKey, privateKey } = sodium.crypto_box_keypair();

      const encryptedPrivateKeyNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES
      );

      const encryptedPrivateKey = new Uint8Array([
        ...encryptedPrivateKeyNonce,
        ...sodium.crypto_secretbox_easy(
          privateKey,
          encryptedPrivateKeyNonce,
          symKey
        ),
      ]);

      const { data: register } = await axios.post("/api/register", {
        username: data.username,
        salt: sodium.to_base64(salt),
        authKey: sodium.to_base64(authKey),
        publicKey: sodium.to_base64(publicKey),
        encryptedPrivateKey: sodium.to_base64(encryptedPrivateKey),
      });

      await idb.set("userKeys", {
        salt,
        publicKey,
        privateKey,
        token: register.token,
      });

      await dispatch("start");
      await router.push("/app");
    },
    async login(
      { getters, commit, dispatch },
      { username = "", password = "", totpCode = "" }
    ) {
      let salt;
      let symKey;
      let authKey;

      if (getters.loginKeys) {
        username = getters.loginKeys.username;
        salt = getters.loginKeys.salt;
        symKey = getters.loginKeys.symKey;
        authKey = getters.loginKeys.authKey;
      } else {
        const { data: prelogin } = await axios.post("/api/prelogin", {
          username: username,
        });

        salt = sodium.from_base64(prelogin.salt);

        symKey = sodium.crypto_pwhash(
          32,
          password,
          salt,
          sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_ALG_ARGON2ID13
        );

        authKey = sodium.crypto_pwhash(
          32,
          symKey,
          salt,
          sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_ALG_ARGON2ID13
        );
      }

      const body = {
        username,
        authKey: sodium.to_base64(authKey),
        totpCode,
      };

      const { data } = await axios.post("/api/login", body);

      if (data.totpRequired) {
        commit("setLoginKeys", {
          username,
          salt,
          symKey,
          authKey,
        });

        return;
      }

      const encryptedPrivateKey = sodium.from_base64(data.encryptedPrivateKey);

      const privateKey = sodium.crypto_secretbox_open_easy(
        encryptedPrivateKey.slice(sodium.crypto_secretbox_NONCEBYTES),
        encryptedPrivateKey.slice(0, sodium.crypto_secretbox_NONCEBYTES),
        symKey
      );

      const publicKey = sodium.from_base64(data.publicKey);

      await idb.set("userKeys", {
        salt,
        publicKey,
        privateKey,
        token: data.token,
      });

      commit("setLoginKeys", null);

      await dispatch("start");
      await router.push("/app");
    },
    async start({ getters, commit, dispatch }) {
      await sodium.ready;

      rnnoise = await Rnnoise({
        locateFile: () => RnnoiseWasm,
      });

      if (window.HyalusDesktop?.isPackaged) {
        commit("setBaseUrl", "https://hyalus.app");
      } else {
        commit("setBaseUrl", location.origin);
      }

      //localConfig setup
      commit(
        "setLocalConfig",
        await idb.set("localConfig", {
          colorTheme: "green",
          fontScale: 100,
          grayscale: false,
          adaptiveLayout: false,
          audioOutput: "default",
          audioInput: "default",
          videoInput: "default",
          videoMode: "720p60",
          audioOutputGain: 100,
          audioInputGain: 100,
          voiceRtcEcho: true,
          voiceRtcGain: true,
          voiceRtcNoise: true,
          voiceRnnoise: true,
          notifySound: true,
          notifySystem: true,
          betaBannerHidden: false,
          ...(await idb.get("localConfig")),
        })
      );

      //userKeys migration (TODO: remove after 8/28)
      if (localStorage.token) {
        await idb.set("userKeys", {
          token: sodium.to_base64(
            sodium.from_base64(
              localStorage.token,
              sodium.base64_variants.ORIGINAL
            )
          ),
          salt: sodium.from_base64(
            localStorage.salt,
            sodium.base64_variants.ORIGINAL
          ),
          publicKey: sodium.from_base64(
            localStorage.publicKey,
            sodium.base64_variants.ORIGINAL
          ),
          privateKey: sodium.from_base64(
            localStorage.privateKey,
            sodium.base64_variants.ORIGINAL
          ),
        });

        localStorage.removeItem("token");
        localStorage.removeItem("salt");
        localStorage.removeItem("publicKey");
        localStorage.removeItem("privateKey");
      }

      //userKeys setup
      commit("setUserKeys", await idb.get("userKeys"));

      //ws setup
      if (getters.userKeys) {
        axios.defaults.headers.authorization = getters.userKeys.token;

        const ws = new WebSocket(
          `${getters.baseUrl.replace("http", "ws")}/api/ws`
        );

        ws.filterCallbacks = [];

        ws._send = ws.send;
        ws.send = (data) => {
          if (ws.readyState === WebSocket.OPEN) {
            console.debug("socket/tx: %o", data);
            ws._send(JSON.stringify(data));
          }
        };

        ws._close = ws.close;
        ws.close = () => {
          ws.noReconnect = true;
          ws._close();
        };

        ws.onopen = async () => {
          const payload = {
            token: getters.userKeys.token,
            fileChunks: (await idb.keys())
              .filter((k) => /^file:/.test(k))
              .map((k) => k.slice("file:".length)),
          };

          if (getters.voice) {
            payload.voiceChannelId = getters.voice.channelId;
          }

          ws.send({
            t: "start",
            d: payload,
          });
        };

        ws.onmessage = async ({ data }) => {
          const msg = JSON.parse(data);
          console.debug("socket/rx: %o", msg);

          for (const opts of ws.filterCallbacks) {
            if (opts.filter(msg)) {
              opts.resolve(msg);
              ws.filterCallbacks = ws.filterCallbacks.filter((i) => i !== opts);

              return;
            }
          }

          if (msg.t === "reset") {
            ws.noReconnect = true;
            ws.close();

            await dispatch("reset");
          }

          if (msg.t === "ready") {
            if (msg.d.proto !== wsProto) {
              ws.close();
              commit("setUpdateRequired", true);
            }

            commit("setFriends", []);
            commit("setChannels", []);
            commit("setSessions", []);
            commit("setUser", msg.d.user);

            msg.d.friends.map((friend) => {
              commit("handleFriendCreate", friend);
            });

            msg.d.channels.map((channel) => {
              commit("handleChannelCreate", channel);

              channel.users.map((user) => {
                commit("handleChannelUserCreate", {
                  channelId: channel.id,
                  ...user,
                });
              });

              commit("handleMessageCreate", {
                channelId: channel.id,
                ...channel.lastMessage,
              });
            });

            msg.d.sessions.map((session) => {
              commit("handleSessionCreate", session);
            });

            commit("setReady", true);

            if (getters.voice) {
              await dispatch("voiceRestart");
            }

            await dispatch("writeLocalConfig", [
              "colorTheme",
              msg.d.user.colorTheme,
            ]);

            await dispatch("updateFavicon");
          }

          if (msg.t === "setUsername") {
            commit("handleSetUsername", msg.d);
          }

          if (msg.t === "setName") {
            commit("handleSetName", msg.d);
          }

          if (msg.t === "setAvatarId") {
            commit("handleSetAvatarId", msg.d);
          }

          if (msg.t === "setTotpEnabled") {
            commit("handleSetTotpEnabled", msg.d);
          }

          if (msg.t === "setColorTheme") {
            commit("handleSetColorTheme", msg.d);
            await dispatch("writeLocalConfig", [
              "colorTheme",
              msg.d.colorTheme,
            ]);
            await dispatch("updateFavicon");
          }

          if (msg.t === "setTypingEvents") {
            commit("handleSetTypingEvents", msg.d);
          }

          if (msg.t === "sessionCreate") {
            commit("handleSessionCreate", msg.d);
          }

          if (msg.t === "sessionDelete") {
            commit("handleSessionDelete", msg.d);
          }

          if (msg.t === "sessionStart") {
            commit("handleSessionStart", msg.d);
          }

          if (msg.t === "friendCreate") {
            commit("handleFriendCreate", msg.d);

            if (getters.ready && msg.d.canAccept) {
              notify({
                title: msg.d.name,
                avatarId: msg.d.avatarId,
                body: "Sent you a friend request",
              });
            }
          }

          if (msg.t === "friendDelete") {
            commit("handleFriendDelete", msg.d);
          }

          if (msg.t === "friendAccept") {
            commit("handleFriendAccept", msg.d);
          }

          if (msg.t === "channelCreate") {
            commit("handleChannelCreate", msg.d);

            msg.d.users.map((user) => {
              commit("handleChannelUserCreate", {
                ...user,
                channelId: msg.d.id,
              });
            });

            commit("handleMessageCreate", {
              ...msg.d.lastMessage,
              channelId: msg.d.id,
            });

            if (getters.lastEvent === "groupCreate" && msg.d.type === "group") {
              commit("setLastEvent", "");
              router.push(`/channels/${msg.d.id}`);
            }
          }

          if (msg.t === "channelDelete") {
            commit("handleChannelDelete", msg.d);
          }

          if (msg.t === "channelSetName") {
            commit("handleChannelSetName", msg.d);
          }

          if (msg.t === "channelSetAvatarId") {
            commit("handleChannelSetAvatarId", msg.d);
          }

          if (msg.t === "channelUserCreate") {
            commit("handleChannelUserCreate", msg.d);
          }

          if (msg.t === "channelUserSetHidden") {
            commit("handleChannelUserSetHidden", msg.d);
          }

          if (msg.t === "channelUserSetInVoice") {
            if (getters.voice?.channelId === msg.d.channelId) {
              const user = getters.channels
                ?.find((c) => c.id === msg.d.channelId)
                ?.users?.find((u) => u.id === msg.d.id);

              if (msg.d.inVoice) {
                await dispatch("handleVoiceUserJoin", {
                  userId: msg.d.id,
                  sound: user && !user.inVoice,
                });
              } else {
                await dispatch("handleVoiceUserLeave", {
                  userId: msg.d.id,
                  sound: user && user.inVoice,
                });
              }
            }

            commit("handleChannelUserSetInVoice", msg.d);
          }

          if (msg.t === "channelSetOwner") {
            commit("handleChannelSetOwner", msg.d);
          }

          if (msg.t === "foreignUserSetUsername") {
            commit("handleForeignUserSetUsername", msg.d);
          }

          if (msg.t === "foreignUserSetName") {
            commit("handleForeignUserSetName", msg.d);
          }

          if (msg.t === "foreignUserSetAvatarId") {
            commit("handleForeignUserSetAvatarId", msg.d);
          }

          if (msg.t === "messageCreate") {
            commit("handleMessageCreate", {
              ...msg.d,
              sound: msg.d.userId !== getters.user.id,
            });
          }

          if (msg.t === "messageDelete") {
            commit("handleMessageDelete", msg.d);
          }

          if (msg.t === "fileChunkRequest") {
            await dispatch("handleFileChunkRequest", msg.d);
          }

          if (msg.t === "voiceRtc") {
            await dispatch("handleVoiceUserRtc", msg.d);
          }

          if (msg.t === "voiceReset") {
            await dispatch("voiceStop");
          }
        };

        ws.onclose = async () => {
          if (!ws.noReconnect) {
            setTimeout(() => {
              dispatch("start");
            }, 1000 * 2);

            setTimeout(() => {
              if (getters.ws?.readyState !== WebSocket.OPEN) {
                commit("setReady", false);
              }
            }, 1000 * 10);
          }
        };

        commit("setWs", ws);
      }
    },
    async logout() {
      await axios.get("/api/logout");
    },
    async reset({ commit }) {
      commit("setUserKeys", null);
      await idb.delete("userKeys");
      await router.push("/auth");
    },
    setName: (_, name) => axios.post("/api/me/name", { name }),
    setUsername: (_, username) => axios.post("/api/me/username", { username }),
    setAvatar() {
      const el = document.createElement("input");

      el.addEventListener("input", async () => {
        const form = new FormData();
        form.append("avatar", el.files[0]);

        await axios.post("/api/me/avatar", form, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      });

      el.type = "file";
      el.click();
    },
    async setAuthKey({ getters, commit }, { oldPassword, password }) {
      const oldSymKey = sodium.crypto_pwhash(
        32,
        oldPassword,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const oldAuthKey = sodium.crypto_pwhash(
        32,
        oldSymKey,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

      const symKey = sodium.crypto_pwhash(
        32,
        password,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = sodium.crypto_pwhash(
        32,
        symKey,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const encryptedPrivateKeyNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES
      );

      const encryptedPrivateKey = new Uint8Array([
        ...encryptedPrivateKeyNonce,
        ...sodium.crypto_secretbox_easy(
          getters.userKeys.privateKey,
          encryptedPrivateKeyNonce,
          symKey
        ),
      ]);

      await axios.post("/api/me/authKey", {
        salt: sodium.to_base64(salt),
        authKey: sodium.to_base64(authKey),
        oldAuthKey: sodium.to_base64(oldAuthKey),
        privateKey: sodium.to_base64(encryptedPrivateKey),
      });

      const userKeys = {
        ...getters.userKeys,
        salt,
      };

      await idb.set("userKeys", userKeys);
      commit("setUserKeys", userKeys);
    },
    async totpEnable({ getters }, { password, totpSecret, totpCode }) {
      const symKey = sodium.crypto_pwhash(
        32,
        password,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = sodium.crypto_pwhash(
        32,
        symKey,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      await axios.post("/api/totp/enable", {
        authKey: sodium.to_base64(authKey),
        totpSecret,
        totpCode,
      });
    },
    async totpDisable({ getters }, { password }) {
      const symKey = sodium.crypto_pwhash(
        32,
        password,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = sodium.crypto_pwhash(
        32,
        symKey,
        getters.userKeys.salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      await axios.post("/api/totp/disable", {
        authKey: sodium.to_base64(authKey),
      });
    },
    async addFriend(_, username) {
      await axios.post("/api/friends", {
        username,
      });
    },
    async acceptFriend(_, friendId) {
      await axios.get(`/api/friends/${friendId}/accept`);
    },
    async removeFriend(_, friendId) {
      await axios.delete(`/api/friends/${friendId}`);
    },
    async getChannelMessages({ getters, commit }, { channelId, method = "" }) {
      const channel = getters.channelById(channelId);

      let url = `/api/channels/${channelId}/messages`;

      if (method === "before") {
        url += `?before=${Number(channel.messages[0].created)}`;
      }

      if (method === "after") {
        url += `?after=${Number(
          channel.messages[channel.messages.length - 1].created
        )}`;
      }

      const { data: messages } = await axios.get(url);

      for (const message of messages) {
        commit("handleMessageCreate", {
          silent: true,
          channelId,
          ...message,
        });
      }

      commit("truncateMessages", {
        channelId,
        method,
        keep: messages.length,
      });
    },
    async sendMessage({ getters }, { channelId, body, type }) {
      const channel = getters.channelById(channelId);

      const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      const userKeys = [];

      for (const user of channel.users.filter((u) => !u.hidden)) {
        const userKeyNonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES
        );

        userKeys.push({
          userId: user.id,
          key: sodium.to_base64(
            new Uint8Array([
              ...userKeyNonce,
              ...sodium.crypto_box_easy(
                key,
                userKeyNonce,
                user.publicKey,
                getters.userKeys.privateKey
              ),
            ])
          ),
        });
      }

      const selfKeyNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES
      );

      userKeys.push({
        userId: getters.user.id,
        key: sodium.to_base64(
          new Uint8Array([
            ...selfKeyNonce,
            ...sodium.crypto_box_easy(
              key,
              selfKeyNonce,
              getters.userKeys.publicKey,
              getters.userKeys.privateKey
            ),
          ])
        ),
      });

      await axios.post(`/api/channels/${channel.id}/messages`, {
        type,
        body: sodium.to_base64(
          new Uint8Array([
            ...nonce,
            ...sodium.crypto_secretbox_easy(body, nonce, key),
          ])
        ),
        keys: userKeys,
      });
    },
    async sendMessageTyping({ getters }, channelId) {
      getters.ws.send({
        t: "typing",
        d: {
          channelId,
        },
      });
    },
    async deleteMessage(_, { channelId, messageId }) {
      await axios.delete(`/api/channels/${channelId}/messages/${messageId}`);
    },
    async groupCreate({ commit }, { name, userIds }) {
      commit("setLastEvent", "groupCreate");

      try {
        await axios.post("/api/channels", {
          name,
          userIds,
        });
      } catch (e) {
        commit("setLastEvent", ""); //this prevents it from lingering around after an error.
        throw e;
      }
    },
    async setGroupName(_, { channelId, name }) {
      await axios.post(`/api/channels/${channelId}/name`, {
        name,
      });
    },
    async setGroupAvatar(_, channelId) {
      const el = document.createElement("input");

      el.addEventListener("input", async () => {
        const form = new FormData();
        form.append("avatar", el.files[0]);

        await axios.post(`/api/channels/${channelId}/avatar`, form, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      });

      el.type = "file";
      el.click();
    },
    async groupAdd(_, { channelId, userId }) {
      await axios.post(`/api/channels/${channelId}/users`, {
        userId,
      });
    },
    async groupRemove(_, { channelId, userId }) {
      await axios.delete(`/api/channels/${channelId}/users/${userId}`);
    },
    async voiceStart({ getters, commit, dispatch }, { channelId, tracks }) {
      if (getters.voice && getters.voice.channelId !== channelId) {
        await dispatch("voiceStop");
      }

      getters.ws.send({
        t: "voiceStart",
        d: {
          channelId,
        },
      });

      commit("setVoice", channelId);

      for (const type of tracks) {
        await dispatch("startLocalTrack", {
          type,
        });
      }

      new Audio(sndStateUp).play();
    },
    async voiceStop({ getters, commit }) {
      if (!getters.voice) {
        return;
      }

      for (const track of getters.voice.tracks) {
        track.stop();
      }

      for (const peer of getters.voice.peers) {
        peer.close();
      }

      getters.ws.send({
        t: "voiceStop",
      });

      commit("setVoice");

      new Audio(sndStateDown).play();
    },
    async voiceRestart({ getters, commit, dispatch }) {
      commit("resetVoiceTime");

      for (const peer of getters.voice.peers) {
        await dispatch("handleVoiceUserLeave", {
          userId: peer.userId,
        });
      }
    },
    async updateFavicon({ getters }) {
      const { default: icon } = await import(
        `../assets/images/icon-standalone-${getters.localConfig.colorTheme}.png`
      );
      document.querySelector("link[rel='icon']").href = icon;
    },
    async groupLeave(_, channelId) {
      await axios.delete(`/api/channels/${channelId}`);
    },
    async processInvite({ getters, dispatch }) {
      await dispatch("addFriend", getters.invite.username);
    },
    async setPreferredStatus(_, preferredStatus) {
      await axios.post("/api/me/preferredStatus", {
        preferredStatus,
      });
    },
    async deleteSession(_, id) {
      await axios.delete(`/api/sessions/${id}`);
    },
    async writeLocalConfig({ getters, commit, dispatch }, [k, v]) {
      commit(
        "setLocalConfig",
        await idb.set("localConfig", {
          ...getters.localConfig,
          [k]: v,
        })
      );

      if (
        getters.voice &&
        ["audioInputGain", "audioOutputGain"].indexOf(k) !== -1
      ) {
        await dispatch("updateVoiceAudio");
      }

      if (
        [
          "audioInput",
          "voiceRtcGain",
          "voiceRtcEcho",
          "voiceRtcNoise",
          "voiceRnnoise",
        ].indexOf(k) !== -1 &&
        getters.voice &&
        getters.voice.tracks.find((t) => t.type === "audio")
      ) {
        await dispatch("stopLocalTrack", { type: "audio" });
        await dispatch("startLocalTrack", { type: "audio" });
      }

      if (
        ["videoInput", "videoMode"].indexOf(k) !== -1 &&
        getters.voice &&
        getters.voice.tracks.find((t) => t.type === "video")
      ) {
        await dispatch("stopLocalTrack", { type: "video" });
        await dispatch("startLocalTrack", { type: "video" });
      }
    },
    async setColorTheme(_, colorTheme) {
      await axios.post("/api/me/colorTheme", { colorTheme });
    },
    async setTypingEvents(_, typingEvents) {
      await axios.post("/api/me/typingEvents", { typingEvents });
    },
    async uploadFile({ dispatch }, { channelId, file }) {
      if (file.size > maxFileSize) {
        throw new Error("File is too large (max: 200MB)");
      }

      const key = sodium.crypto_secretstream_xchacha20poly1305_keygen();
      const { state, header } =
        sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
      const chunks = [];

      for (let i = 0; i < Math.ceil(file.size / maxFileChunkSize); i++) {
        const data = sodium.crypto_secretstream_xchacha20poly1305_push(
          state,
          await new Promise((cb) => {
            const reader = new FileReader();
            reader.onload = () => cb(new Uint8Array(reader.result));
            reader.readAsArrayBuffer(
              file.slice(
                i * maxFileChunkSize,
                i * maxFileChunkSize + maxFileChunkSize
              )
            );
          }),
          "",
          0
        );

        const hash = sodium.to_base64(sodium.crypto_hash(data));

        await dispatch("storeFileChunk", { data, hash });

        chunks.push(hash);
      }

      await dispatch("sendMessage", {
        channelId,
        type: "file",
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          header: sodium.to_base64(header),
          key: sodium.to_base64(key),
          chunks,
        }),
      });
    },
    async fileDownload(
      { getters, dispatch },
      { channelId, messageId, target }
    ) {
      const channel = getters.channelById(channelId);
      const message = channel.messages.find((m) => m.id === messageId);

      if (message.file.size > maxFileSize) {
        console.warn(`File ${message.id} is too large`);
        return;
      }

      if (
        message.file.chunks.length !==
        Math.ceil(message.file.size / maxFileChunkSize)
      ) {
        console.warn(`File ${message.id} has invalid # of chunks`);
        return;
      }

      const data = new Uint8Array(message.file.size);
      const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
        message.file.header,
        message.file.key
      );

      for (let i = 0; i < message.file.chunks.length; i++) {
        const hash = message.file.chunks[i];
        const encryptedChunk = await dispatch(
          "getFileChunk",
          message.file.chunks[i]
        );

        if (!encryptedChunk) {
          console.warn(`Failed to get chunk ${hash}`);
          return;
        }

        const pull = sodium.crypto_secretstream_xchacha20poly1305_pull(
          state,
          encryptedChunk
        );

        if (!pull) {
          console.warn(`Failed to decrypt chunk ${hash}`);
          return;
        }

        data.set(pull.message, i * maxFileChunkSize);
      }

      const url = URL.createObjectURL(
        new Blob([data], {
          type: message.file.type,
        })
      );

      if (target === "local") {
        const el = document.createElement("a");
        el.download = message.file.name;
        el.href = url;
        el.click();
        URL.revokeObjectURL(el.href); // frees up mem on next GC cycle.
      }

      if (target === "url") {
        return url;
      }
    },
    async storeFileChunk({ getters }, { data, hash }) {
      await navigator.storage.persist();

      const estimate = await navigator.storage.estimate();
      const quota = Math.max(estimate.quota, 1024 * 1024 * 1024 * 50);

      if (quota - estimate.usage < 1024 * 1024 * 5) {
        //TODO: free up disk space.
      }

      await idb.set(`file:${hash}`, data);

      getters.ws.send({
        t: "fileChunkOwned",
        d: {
          hash,
        },
      });

      return hash;
    },
    async getFileChunk({ getters, dispatch }, hash) {
      let chunk = await idb.get(`file:${hash}`);

      if (!chunk) {
        getters.ws.send({
          t: "fileChunkGet",
          d: {
            hash,
          },
        });

        while (!chunk) {
          const offer = await dispatch("getWsMessage", {
            timeout: 1000 * 15,
            filter: (msg) =>
              msg.t === "fileChunkRtc" &&
              msg.d.hash === hash &&
              msg.d.payloadType === "offer",
          });

          if (!offer) {
            break;
          }

          await new Promise((resolve) => {
            let peer = new RTCPeerConnection({ iceServers });
            let parts = [];

            peer.addEventListener("icecandidate", ({ candidate }) => {
              if (candidate) {
                getters.ws.send({
                  t: "fileChunkRtc",
                  d: {
                    hash,
                    socketId: offer.d.socketId,
                    payload: JSON.stringify(candidate),
                    payloadType: "ice",
                  },
                });
              }
            });

            peer.addEventListener("datachannel", ({ channel }) => {
              channel.addEventListener("message", ({ data }) => {
                if (data) {
                  parts.push(new Uint8Array(data));
                } else {
                  chunk = new Uint8Array(
                    parts.map((p) => p.length).reduce((a, b) => a + b)
                  );

                  for (let i = 0; i < parts.length; i++) {
                    chunk.set(parts[i], i * parts[0].length);
                  }

                  peer.close();
                  resolve();
                }
              });
            });

            peer.addEventListener("connectionstatechange", () => {
              if (
                ["disconnected", "failed"].indexOf(peer.connectionState) !== -1
              ) {
                peer.close();
                resolve();
              }
            });

            (async () => {
              await peer.setRemoteDescription({
                type: "offer",
                sdp: offer.d.payload,
              });

              await peer.setLocalDescription(await peer.createAnswer());

              getters.ws.send({
                t: "fileChunkRtc",
                d: {
                  hash,
                  socketId: offer.d.socketId,
                  payload: peer.localDescription.sdp,
                  payloadType: "answer",
                },
              });

              for (;;) {
                const ice = await dispatch("getWsMessage", {
                  timeout: 1000 * 15,
                  filter: (msg) =>
                    msg.t === "fileChunkRtc" &&
                    msg.d.hash === hash &&
                    msg.d.socketId === offer.d.socketId &&
                    msg.d.payloadType === "ice",
                });

                if (ice) {
                  await peer.addIceCandidate(JSON.parse(ice.d.payload));
                } else {
                  break;
                }
              }
            })();
          });

          if (chunk) {
            //the chunk was retreived successfully. (somehow)
            const gotHash = sodium.to_base64(sodium.crypto_hash(chunk));

            if (gotHash === hash) {
              await dispatch("storeFileChunk", {
                hash,
                data: chunk,
              });
            } else {
              console.warn(`Invalid hash for chunk ${hash}`);
              chunk = null;
            }
          }
        }
      }

      return chunk;
    },
    getWsMessage({ commit }, opts) {
      return new Promise((resolve) => {
        if (opts.timeout) {
          setTimeout(resolve, opts.timeout);
        }

        commit("addWsFilterCallback", {
          filter: opts.filter,
          resolve,
        });
      });
    },
    async handleFileChunkRequest({ getters, dispatch }, { hash, socketId }) {
      let peer = new RTCPeerConnection({ iceServers });

      peer.addEventListener("icecandidate", ({ candidate }) => {
        if (candidate) {
          getters.ws.send({
            t: "fileChunkRtc",
            d: {
              hash,
              socketId,
              payload: JSON.stringify(candidate),
              payloadType: "ice",
            },
          });
        }
      });

      const channel = peer.createDataChannel("");

      let i = 0;
      const chunk = await idb.get(`file:${hash}`);
      const msgSize = 1024 * 16;
      //for whatever reason, 256k (peer.sctp.maxMessageSize) doesn't work sometimes.
      //so, we have to do this shit- oh & yes this is literally what the webrtc demos do too btw! :)

      const send = async () => {
        const j = i - Math.ceil(chunk.length / msgSize);

        //this just pisses me off.
        if (!j) {
          channel.send("");
          channel.send(new Uint8Array(1024 * 1024 * 256)); //forces RTCDataChannel to flush it's buffer.
          peer.close();
          peer = null;
        }

        if (j < 0) {
          channel.send(chunk.slice(i * msgSize, i * msgSize + msgSize).buffer);
        }

        ++i;
      };

      channel.addEventListener("open", send);
      channel.addEventListener("bufferedamountlow", send);

      await peer.setLocalDescription(await peer.createOffer());

      getters.ws.send({
        t: "fileChunkRtc",
        d: {
          hash,
          socketId,
          payload: peer.localDescription.sdp,
          payloadType: "offer",
        },
      });

      const answer = await dispatch("getWsMessage", {
        timeout: 1000 * 15,
        filter: (msg) =>
          msg.t === "fileChunkRtc" &&
          msg.d.hash === hash &&
          msg.d.socketId === socketId &&
          msg.d.payloadType === "answer",
      });

      if (!answer) {
        return;
      }

      await peer.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: answer.d.payload,
        })
      );

      while (peer) {
        const ice = await dispatch("getWsMessage", {
          timeout: 1000 * 15,
          filter: (msg) =>
            msg.t === "fileChunkRtc" &&
            msg.d.hash === hash &&
            msg.d.socketId === socketId &&
            msg.d.payloadType === "ice",
        });

        if (ice) {
          await peer.addIceCandidate(
            new RTCIceCandidate(JSON.parse(ice.d.payload))
          );
        }
      }
    },
    async startLocalTrack(
      { getters, commit, dispatch },
      { type, track = null, sound = false, desktopOpts = null }
    ) {
      if (type === "audio") {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: {
              ideal: getters.localConfig.audioInput,
            },
            autoGainControl: {
              ideal: getters.localConfig.voiceRtcGain,
            },
            echoCancellation: {
              ideal: getters.localConfig.voiceRtcEcho,
            },
            noiseSuppression: {
              ideal: getters.localConfig.voiceRtcNoise,
            },
          },
        });

        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        const dest = ctx.createMediaStreamDestination();
        src.connect(gain);
        gain.gain.value = getters.localConfig.audioOutputGain / 100;

        let inMem;
        let outMem;
        let rnnoiseState;
        if (getters.localConfig.voiceRnnoise) {
          const sampleLength = 480;
          inMem = rnnoise._malloc(sampleLength * 4);
          outMem = rnnoise._malloc(sampleLength * 4);
          rnnoiseState = rnnoise._rnnoise_create();
          const rnnoiseProc = ctx.createScriptProcessor(4096, 1, 1);
          const rnnoiseDelay = ctx.createDelay();
          const rnnoiseGainIn = ctx.createGain();
          const rnnoiseGainOut = ctx.createGain();

          let pendingIn = new Float32Array([]);
          let closeTimeout;

          rnnoiseProc.addEventListener("audioprocess", async (e) => {
            const bufIn = new Float32Array([
              ...pendingIn,
              ...e.inputBuffer.getChannelData(0),
            ]);
            let results = [];
            let i = 0;

            for (; i + sampleLength < bufIn.length; i += sampleLength) {
              const sample = bufIn.slice(i, i + sampleLength);

              for (let j = 0; j < sample.length; j++) {
                sample[j] = sample[j] * 0x7fff;
              }

              rnnoise.HEAPF32.set(sample, inMem / 4);

              try {
                results.push(
                  rnnoise._rnnoise_process_frame(rnnoiseState, outMem, inMem)
                );
              } catch {
                // sometimes, rnnoise gets into a broken/erroring state.
                // rather than fixing weird WASM memory bugs, let's just quietly restart it.
                await dispatch("stopLocalTrack", { type: "audio" });
                await dispatch("startLocalTrack", { type: "audio" });
                return;
              }
            }

            pendingIn = bufIn.slice(i);

            if (results.reduce((a, b) => a + b) / results.length > 0.25) {
              if (closeTimeout) {
                clearTimeout(closeTimeout);
              }

              rnnoiseGainOut.gain.value = 1;

              closeTimeout = setTimeout(() => {
                rnnoiseGainOut.gain.linearRampToValueAtTime(
                  0,
                  ctx.currentTime + 0.2
                );
              }, 200);
            }
          });

          rnnoiseGainIn.gain.value = 2;
          rnnoiseGainOut.gain.value = 0;
          rnnoiseDelay.delayTime.value = 0.2;

          [
            [gain, rnnoiseProc, ctx.destination],
            [gain, rnnoiseDelay, rnnoiseGainOut, dest],
          ].map((c) => c.reduce((a, b) => a.connect(b)));
        } else {
          gain.connect(dest);
        }

        track = dest.stream.getTracks()[0];
        track.gain = gain;

        track._stop = track.stop;
        track.stop = () => {
          track._stop();
          stream.getTracks()[0].stop();
          ctx.close();
          if (rnnoiseState) {
            rnnoise._rnnoise_destroy(rnnoiseState);
            rnnoise._free(inMem);
            rnnoise._free(outMem);
          }
        };
      }

      if (type === "video") {
        const [height, fps] = getters.localConfig.videoMode.split("p");

        track = (
          await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: {
                ideal: getters.localConfig.videoInput,
              },
              height: {
                ideal: +height,
              },
              frameRate: {
                ideal: +fps,
              },
            },
          })
        ).getTracks()[0];
      }

      if (type === "desktop") {
        const [height, fps] = getters.localConfig.videoMode.split("p");
        let stream;

        if (!desktopOpts) {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              height: {
                ideal: +height,
              },
              frameRate: {
                ideal: +fps,
              },
            },
            audio: {
              echoCancellation: {
                ideal: true,
              },
              noiseSuppression: {
                ideal: false,
              },
              autoGainControl: {
                ideal: false,
              },
            },
          });
        } else {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: desktopOpts.sourceId,
                  maxHeight: +height,
                  maxFrameRate: +fps,
                },
              },
              audio: desktopOpts.audio && {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: desktopOpts.sourceId,
                  autoGainControl: false,
                  noiseSuppression: false,
                  echoCancellation: true,
                },
              },
            });
          } catch (e) {
            if (desktopOpts.audio) {
              console.warn("Failed to capture desktop audio");

              await dispatch("startLocalTrack", {
                type: "desktop",
                sound,
                desktopOpts: {
                  ...desktopOpts,
                  audio: false,
                },
              });

              return;
            }

            throw e;
          }
        }

        for (const track of stream.getTracks()) {
          await dispatch("startLocalTrack", {
            type: `desktop${track.kind}`,
            track,
          });
        }

        return;
      }

      track.addEventListener("ended", async () => {
        await dispatch("stopLocalTrack", {
          type,
        });
      });

      track.type = type;

      commit("setVoiceTrack", {
        track,
      });

      for (const peer of getters.voice.peers) {
        peer.addTrack(track);
      }

      if (sound) {
        new Audio(sndNavForward).play();
      }
    },
    async stopLocalTrack(
      { getters, commit, dispatch },
      { type, sound = false }
    ) {
      if (type === "desktop") {
        await dispatch("stopLocalTrack", {
          type: "desktopaudio",
        });
        return await dispatch("stopLocalTrack", {
          type: "desktopvideo",
        });
      }

      const track = getters.voice.tracks.find((t) => t.type === type);

      if (!track) {
        return;
      }

      track.stop();

      commit("deleteVoiceTrack", {
        type,
      });

      for (const peer of getters.voice.peers) {
        for (const sender of peer.getSenders()) {
          if (sender.track === track) {
            peer.removeTrack(sender);
          }
        }
      }

      if (sound) {
        new Audio(sndNavBackward).play();
      }

      return true;
    },
    async createVoicePeer(
      { getters, commit, dispatch },
      { userId, polite = false }
    ) {
      const user = getters
        .channelById(getters.voice.channelId)
        .users.find((u) => u.id === userId);

      if (!user) {
        return;
      }

      const peer = new RTCPeerConnection({ iceServers });

      peer.userId = userId;
      peer.tracks = [];
      peer.polite = polite;
      peer.makingOffer = false;
      peer.ignoreOffer = false;
      peer.isSettingRemoteAnswerPending = false;

      peer.sendPayload = (msg) => {
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

        getters.ws.send({
          t: "voiceRtc",
          d: {
            userId,
            payload: sodium.to_base64(
              new Uint8Array([
                ...nonce,
                ...sodium.crypto_box_easy(
                  JSON.stringify(msg),
                  nonce,
                  user.publicKey,
                  getters.userKeys.privateKey
                ),
              ])
            ),
          },
        });
      };

      peer.decryptPayload = (payload) => {
        let res;

        try {
          const data = sodium.from_base64(payload);

          res = JSON.parse(
            sodium.to_string(
              sodium.crypto_box_open_easy(
                data.slice(sodium.crypto_box_NONCEBYTES),
                data.slice(0, sodium.crypto_box_NONCEBYTES),
                user.publicKey,
                getters.userKeys.privateKey
              )
            )
          );
        } catch {
          console.warn(`Failed to decrypt payload from ${userId}`);
        }

        return res;
      };

      peer.getTrackMap = () => {
        const trackMap = [];

        for (const transceiver of peer.getTransceivers()) {
          const idIdx = getters.voice.tracks.indexOf(transceiver.sender.track);

          if (idIdx !== -1) {
            trackMap[transceiver.mid] = transceiver.sender.track.type;
          }
        }

        return trackMap;
      };

      peer.addEventListener("negotiationneeded", async () => {
        try {
          peer.makingOffer = true;
          await peer.setLocalDescription(
            await peer.createOffer({
              voiceActivityDetection: true,
            })
          );
          peer.sendPayload({
            desc: peer.localDescription,
            trackMap: peer.getTrackMap(),
          });
        } catch (e) {
          console.warn(e);
        }

        peer.makingOffer = false;
      });

      peer.addEventListener("icecandidate", ({ candidate }) => {
        peer.sendPayload({ candidate });
      });

      peer.addEventListener("connectionstatechange", () => {
        if (peer.connectionState === "disconnected") {
          peer.restartIce();
        }
      });

      peer.addEventListener("track", async ({ track }) => {
        track.addEventListener("unmute", () => {
          track.type =
            peer.trackMap[
              peer.getTransceivers().find((t) => t.receiver.track === track).mid
            ];

          commit("setVoicePeerTrack", {
            userId,
            track,
          });

          if (track.kind === "audio") {
            const audio = new Audio();

            //i have no idea why this works. only need it with tracks from wRTC!
            audio.addEventListener("loadedmetadata", async () => {
              const ctx = new AudioContext();
              const src = ctx.createMediaStreamSource(audio.srcObject);
              const gain = ctx.createGain();
              const dest = ctx.createMediaStreamDestination();
              [src, gain, dest].reduce((a, b) => a.connect(b));

              const el = new Audio();
              el.srcObject = dest.stream;
              el.volume = 0;
              el.play();

              track.gain = gain;
              track.el = el;

              await dispatch("updateVoiceAudio");
            });

            audio.srcObject = new MediaStream([track]);
            audio.volume = 0;
            audio.play();
          }
        });

        track.addEventListener("mute", () => {
          commit("deleteVoicePeerTrack", {
            userId,
            id: track.id,
          });
        });
      });

      commit("setVoicePeer", {
        peer,
      });

      for (const track of getters.voice.tracks) {
        peer.addTrack(track);
      }

      if (!peer.getTransceivers().length) {
        peer.createDataChannel(""); //makes things work even if we have no tracks.
      }

      return peer;
    },
    async handleVoiceUserJoin(
      { getters, dispatch },
      { userId, sound = false }
    ) {
      if (new Date() - getters.voice.resetTime < 1000 * 5) {
        sound = false;
      }

      await dispatch("handleVoiceUserLeave", {
        userId,
      });

      await dispatch("createVoicePeer", {
        userId,
      });

      if (sound) {
        new Audio(sndStateUp).play();
      }
    },
    async handleVoiceUserLeave({ getters, commit }, { userId, sound = false }) {
      if (new Date() - getters.voice.resetTime < 1000 * 5) {
        sound = false;
      }

      const peer = getters.voice.peers.find((p) => p.userId === userId);

      if (!peer) {
        return;
      }

      peer.close();

      commit("deleteVoicePeer", {
        userId,
      });

      if (sound) {
        new Audio(sndStateDown).play();
      }
    },
    async handleVoiceUserRtc({ getters, dispatch }, { userId, payload }) {
      let peer = getters.voice.peers.find((p) => p.userId === userId);

      if (!peer) {
        peer = await dispatch("createVoicePeer", {
          userId,
          polite: true,
        });
      }

      if (!peer) {
        return; //createVoicePeer must've failed somehow.
      }

      payload = peer.decryptPayload(payload);

      if (!payload) {
        return;
      }

      if (payload.trackMap) {
        peer.trackMap = payload.trackMap;
      }

      if (payload.desc) {
        const readyForOffer =
          !peer.makingOffer &&
          (peer.signalingState == "stable" ||
            peer.isSettingRemoteAnswerPending);
        const offerCollision = payload.desc.type == "offer" && !readyForOffer;

        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) {
          return;
        }

        peer.isSettingRemoteAnswerPending = payload.desc.type == "answer";
        await peer.setRemoteDescription(payload.desc);
        peer.isSettingRemoteAnswerPending = false;
        if (payload.desc.type === "offer") {
          await peer.setLocalDescription();
          peer.sendPayload({
            desc: peer.localDescription,
            trackMap: peer.getTrackMap(),
          });
        }
      }

      if (payload.candidate) {
        try {
          await peer.addIceCandidate(payload.candidate);
        } catch (e) {
          if (!peer.ignoreOffer) {
            console.warn(e);
          }
        }
      }
    },
    async setVoiceDeaf({ commit, dispatch }, val) {
      commit("setVoiceDeaf", val);
      await dispatch("updateVoiceAudio");

      if (val) {
        new Audio(sndNavBackwardMin).play();
      } else {
        new Audio(sndNavForwardMin).play();
      }
    },
    async updateVoiceAudio({ getters }) {
      for (const track of getters.voice.tracks) {
        if (track.gain) {
          track.gain.gain.value = getters.localConfig.audioInputGain / 100;
        }
      }

      for (const peer of getters.voice.peers) {
        for (const track of peer.tracks) {
          if (track.gain) {
            track.gain.gain.value = getters.voice.deaf
              ? 0
              : getters.localConfig.audioOutputGain / 100;

            track.el.volume = 1;

            try {
              await track.el.setSinkId(getters.localConfig.audioOutput);
            } catch {
              //audioOutput might not be a valid one, so it'll fallback.
            }
          }
        }
      }
    },
  },
});

export default store;
