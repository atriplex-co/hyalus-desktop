import Vue from "vue";
import Vuex from "vuex";
import axios from "axios";
import nacl from "libsodium-wrappers";
import msgpack from "msgpack-lite";
import sndNotification from "../sounds/notification_simple-01.ogg";
import sndStateUp from "../sounds/state-change_confirm-up.ogg";
import sndStateDown from "../sounds/state-change_confirm-down.ogg";
import sndNavBackward from "../sounds/navigation_backward-selection.ogg";
import sndNavForward from "../sounds/navigation_forward-selection.ogg";
import router from "../router";
import userImage from "../images/user.webp";
import MarkdownIt from "markdown-it";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItLinkAttr from "markdown-it-link-attributes";
import sndNavBackwardMin from "../sounds/navigation_backward-selection-minimal.ogg";
import sndNavForwardMin from "../sounds/navigation_forward-selection-minimal.ogg";
import hljs from "highlight.js";

Vue.use(Vuex);

let rnnoise;

const iceServers = [
  {
    urls: ["stun:stun.l.google.com:19302"],
  },
  {
    urls: ["stun:stun1.l.google.com:19302"],
  },
  {
    urls: ["stun:stun2.l.google.com:19302"],
  },
  {
    urls: ["stun:stun3.l.google.com:19302"],
  },
  {
    urls: ["stun:stun4.l.google.com:19302"],
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
      } catch {}
    }

    return "";
  },
})
  .enable([
    //
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
      class: "font-medium underline",
    },
  });

const imageTypes = [
  //
  "image/png",
  "image/gif",
  "image/jpeg",
  "image/webp",
];

const audioTypes = [
  //
  "audio/mpeg",
  "audio/vorbis",
  "audio/mp4",
  "audio/ogg",
  "audio/opus",
  "audio/flac",
];

const videoTypes = [
  //
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default new Vuex.Store({
  state: {
    user: null,
    salt: null,
    publicKey: null,
    privateKey: null,
    token: localStorage.token,
    betaBanner: localStorage.betaBanner != null,
    audioOutput: localStorage.audioOutput,
    audioInput: localStorage.audioInput,
    videoInput: localStorage.videoInput,
    friends: [],
    channels: [],
    ws: null,
    voice: null,
    totpInitData: null,
    totpLoginTicket: null,
    symKey: null,
    baseUrl: null,
    ready: false,
    showSidebar: true,
    faviconEl: null,
    rtcEcho: localStorage.rtcEcho,
    rtcNoise: localStorage.rtcNoise,
    rtcGain: localStorage.rtcGain,
    videoQuality: localStorage.videoQuality,
    displayQuality: localStorage.displayQuality,
    sendTyping: localStorage.sendTyping,
    vadEnabled: localStorage.vadEnabled,
    messageSides: localStorage.messageSides,
    syntaxTheme: localStorage.syntaxTheme,
  },
  getters: {
    config: (state) => state.config,
    user: (state) => state.user,
    token: (state) => state.token,
    publicKey: (state) => state.publicKey,
    privateKey: (state) => state.privateKey,
    salt: (state) => state.salt,
    betaBanner: (state) => state.betaBanner,
    videoInput: (state) => state.videoInput || "default",
    audioOutput: (state) => state.audioOutput || "default",
    audioInput: (state) => state.audioInput || "default",
    friends: (state) => state.friends,
    channels: (state) => state.channels,
    channelById: (state) => (channelId) =>
      state.channels.find((channel) => channel.id === channelId),
    ws: (state) => state.ws,
    voice: (state) => state.voice,
    totpInitData: (state) => state.totpInitData,
    totpLoginTicket: (state) => state.totpLoginTicket,
    symKey: (state) => state.symKey,
    baseUrl: (state) => state.baseUrl,
    localStream: (state) => (type) =>
      state.voice?.localStreams.find((s) => s.type === type),
    localStreamPeer: (state) => (user, type) =>
      state.voice?.localStreams.find((s) => s.type === type)?.peers[user],
    remoteStream: (state) => (user, type) =>
      state.voice?.remoteStreams.find(
        (s) => s.user === user && s.type === type
      ),
    ready: (state) => state.ready,
    queuedIce: (state) => state.queuedIce,
    showSidebar: (state) => state.showSidebar,
    accentColor: (state) =>
      state.user?.accentColor || localStorage.accentColor || "green",
    rtcEcho: (state) => !state.rtcEcho,
    rtcNoise: (state) => !state.rtcNoise,
    rtcGain: (state) => !state.rtcGain,
    videoQuality: (state) => state.videoQuality || "720p30",
    displayQuality: (state) => state.displayQuality || "720p30",
    sendTyping: (state) => !state.sendTyping,
    vadEnabled: (state) => !state.vadEnabled,
    messageSides: (state) => state.messageSides,
    syntaxTheme: (state) => state.syntaxTheme || "tomorrow-night",
  },
  mutations: {
    setUser(state, user) {
      state.user = { ...state.user, ...user };

      if (user.accentColor) {
        localStorage.setItem("accentColor", user.accentColor);
      }
    },
    // toggleSidebar inverts the state of state.showSidebar, this is intended to be used with the addition
    // of sidebar toggling buttons on mobile clients that will allow a button to appear once the sidebar is hidden
    // and then for it to hide once the sidebar is opened. This state does directly affect the sidebar as well.
    toggleSidebar (state) {
      state.showSidebar = !state.showSidebar
    },
    setToken(state, token) {
      state.token = token;
      axios.defaults.headers.auth = token;

      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    },
    setPublicKey(state, publicKey) {
      state.publicKey = publicKey;

      if (publicKey) {
        localStorage.setItem(
          "publicKey",
          nacl.to_base64(publicKey, nacl.base64_variants.ORIGINAL)
        );
      } else {
        localStorage.removeItem("publicKey");
      }
    },
    setPrivateKey(state, privateKey) {
      state.privateKey = privateKey;

      if (privateKey) {
        localStorage.setItem(
          "privateKey",
          nacl.to_base64(privateKey, nacl.base64_variants.ORIGINAL)
        );
      } else {
        localStorage.removeItem("privateKey");
      }
    },
    setSalt(state, salt) {
      state.salt = salt;

      if (salt) {
        localStorage.setItem(
          "salt",
          nacl.to_base64(salt, nacl.base64_variants.ORIGINAL)
        );
      } else {
        localStorage.removeItem("salt");
      }
    },
    setWs(state, ws) {
      if (state.ws && state.ws.readyState === 1) {
        state.ws.close();
      }

      state.ws = ws;
    },
    setBetaBanner(state, betaBanner) {
      state.betaBanner = betaBanner;

      if (betaBanner) {
        localStorage.setItem("betaBanner", "");
      } else {
        localStorage.removeItem("betaBanner");
      }
    },
    setAudioOutput(state, audioOutput) {
      state.audioOutput = audioOutput;

      if (audioOutput) {
        localStorage.setItem("audioOutput", audioOutput);
      } else {
        localStorage.removeItem("audioOutput");
      }
    },
    setVideoInput(state, videoInput) {
      state.videoInput = videoInput;

      if (videoInput) {
        localStorage.setItem("videoInput", videoInput);
      } else {
        localStorage.removeItem("videoInput");
      }
    },
    setAudioInput(state, audioInput) {
      state.audioInput = audioInput;

      if (audioInput) {
        localStorage.setItem("audioInput", audioInput);
      } else {
        localStorage.removeItem("audioInput");
      }
    },
    setFriend(state, friend) {
      const merged = {
        ...state.friends.find((f) => f.id === friend.id),
        ...friend,
      };

      state.friends = state.friends.filter((f) => f.id !== friend.id);

      if (!merged.delete) {
        state.friends.push(merged);

        if (state.ready && merged.acceptable) {
          try {
            new Audio(sndNotification).play();
          } catch {}

          if (typeof process === "undefined") {
            let icon;

            if (merged.user.avatar === "default") {
              icon = userImage;
            } else {
              icon = `${state.baseUrl}/api/avatars/${merged.user.avatar}`;
            }

            new Notification(merged.user.name, {
              icon,
              silent: true,
              body: "Sent you a friend request",
            });
          }
        }
      }
    },
    setFriendUser(state, friendUser) {
      const friend = state.friends.find((f) => f.id === friendUser.friend);
      friend.user = {
        ...friend.user,
        ...friendUser,
      };
    },
    setChannel(state, channel) {
      const merged = {
        ...state.channels.find((c) => c.id === channel.id),
        ...channel,
      };

      state.channels = state.channels.filter((c) => c.id !== channel.id);

      if (!merged.delete) {
        if (!merged.messages) {
          merged.messages = [];
        }

        if (!merged.lastMessage) {
          merged.lastMessage = null; //forces Vue to update it for computed props.
        }

        state.channels.push(merged);
      }
    },
    setChannelUser(state, channelUser) {
      const channel = state.channels.find((c) => c.id === channelUser.channel);

      const merged = {
        ...channel.users.find((u) => u.id === channelUser.id),
        ...channelUser,
      };

      channel.users = channel.users.filter((u) => u.id !== channelUser.id);

      if (!channelUser.delete) {
        if (typeof merged.publicKey === "string") {
          merged.publicKey = nacl.from_base64(
            merged.publicKey,
            nacl.base64_variants.ORIGINAL
          );
        }

        channel.users.push(merged);

        if (channel.type === "dm") {
          channel.name = merged.name;
          channel.avatar = merged.avatar;
        }
      }
    },
    setMessage(state, message) {
      const channel = state.channels.find((c) => c.id === message.channel);

      const merged = {
        ...channel.messages.find((m) => m.id === message.id),
        ...message,
      };

      channel.messages = channel.messages.filter((m) => m.id !== message.id);

      if (!message.delete) {
        const sender =
          channel.users.find((u) => u.id === merged.sender) || state.user;

        const target =
          channel.users.find((u) => u.id === merged.body) || state.user;

        if (typeof merged.key === "string") {
          merged.key = nacl.from_base64(
            merged.key,
            nacl.base64_variants.ORIGINAL
          );
        }

        if (typeof merged.fileName === "string") {
          merged.fileName = nacl.from_base64(
            merged.fileName,
            nacl.base64_variants.ORIGINAL
          );
        }

        if (typeof merged.fileType === "string") {
          merged.fileType = nacl.from_base64(
            merged.fileType,
            nacl.base64_variants.ORIGINAL
          );
        }

        if (merged.key && !merged.decryptedKey) {
          merged.decryptedKey = nacl.crypto_box_open_easy(
            merged.key.slice(24),
            merged.key.slice(0, 24),
            sender.publicKey || state.publicKey,
            state.privateKey
          );
        }

        if (merged.fileName && !merged.decryptedFileName) {
          const decryptedFileName = nacl.crypto_secretbox_open_easy(
            merged.fileName.slice(24),
            merged.fileName.slice(0, 24),
            merged.decryptedKey
          );

          merged.decryptedFileName = nacl.to_string(decryptedFileName).trim();
          merged.decrypted = merged.decryptedFileName;
        }

        if (merged.fileType && !merged.decryptedFileType) {
          const decryptedFileType = nacl.crypto_secretbox_open_easy(
            merged.fileType.slice(24),
            merged.fileType.slice(0, 24),
            merged.decryptedKey
          );

          merged.decryptedFileType = nacl.to_string(decryptedFileType).trim();

          if (imageTypes.find((t) => t === merged.decryptedFileType)) {
            merged.fileMediaType = "img";
          }

          if (videoTypes.find((t) => t === merged.decryptedFileType)) {
            merged.fileMediaType = "video";
          }

          if (audioTypes.find((t) => t === merged.decryptedFileType)) {
            merged.fileMediaType = "audio";
          }
        }

        if (merged.type === "text") {
          if (typeof merged.body === "string") {
            merged.body = nacl.from_base64(
              merged.body,
              nacl.base64_variants.ORIGINAL
            );
          }

          if (!merged.decrypted) {
            const decryptedBody = nacl.crypto_secretbox_open_easy(
              merged.body.slice(24),
              merged.body.slice(0, 24),
              merged.decryptedKey
            );

            merged.decrypted = nacl.to_string(decryptedBody);
          }

          if (!merged.formatted && merged.decrypted) {
            merged.formatted = messageFormatter
              .render(merged.decrypted)
              .trim()
              .replaceAll("<pre>", '<pre class="hljs">');
          }
        }

        if (merged.type === "channelName") {
          merged.event = `${sender.name} renamed the group "${merged.body}"`;
        }

        if (merged.type === "channelAvatar") {
          merged.event = `${sender.name} changed the icon`;
        }

        if (merged.type === "channelUserAdd") {
          merged.event = `${sender.name} added ${target.name}`;
        }

        if (merged.type === "channelUserRemove") {
          merged.event = `${sender.name} removed ${target.name}`;
        }

        if (merged.type === "channelUserLeave") {
          merged.event = `${sender.name} left the group`;
        }

        channel.messages.push(merged);
        channel.messages = channel.messages.sort((a, b) => {
          return a.id > b.id ? 1 : -1;
        });

        if (
          !channel.lastMessage ||
          merged.id === channel.lastMessage.id ||
          merged.time > channel.lastMessage.time
        ) {
          channel.lastMessage = merged;
        }

        if (state.ready && merged.sender !== state.user.id && !message.silent) {
          sender.lastTyping = 0;

          let playSound = false;

          if (document.visibilityState === "hidden") {
            playSound = true;
          }

          if (document.visibilityState === "visible") {
            if (router.currentRoute.name === "channel") {
              if (router.currentRoute.params.channel !== merged.channel) {
                playSound = true;
              }
            } else {
              playSound = true;
            }
          }

          if (!merged.decrypted) {
            playSound = false;
          }

          if (playSound) {
            try {
              new Audio(sndNotification).play();
            } catch {}

            if (typeof process !== "undefined") {
              let icon;
              let title;

              if (sender.avatar === "default") {
                icon = userImage;
              } else {
                icon = `${state.baseUrl}/api/avatars/${sender.avatar}`;
              }

              if (channel.type === "dm") {
                title = sender.name;
              }

              if (channel.type === "group") {
                title = `${sender.name} (${channel.name})`;
              }

              new Notification(title, {
                icon,
                silent: true,
                body: merged.decrypted,
              });
            }
          }
        }
      } else {
        if (merged.id === channel.lastMessage.id) {
          let newLastMessage;

          channel.messages.map((msg) => {
            if (!newLastMessage) {
              newLastMessage = msg;
            }

            if (
              newLastMessage &&
              newLastMessage.id !== merged.id &&
              newLastMessage.time < merged.time
            ) {
              newLastMessage = msg;
            }
          });

          channel.lastMessage = newLastMessage;
        }
      }
    },
    setTotpInitData(state, totpInitData) {
      state.totpInitData = totpInitData;
    },
    setTotpLoginTicket(state, totpLoginTicket) {
      state.totpLoginTicket = totpLoginTicket;
    },
    setSymKey(state, symKey) {
      state.symKey = symKey;
    },
    setBaseUrl(state, baseUrl) {
      state.baseUrl = baseUrl;
      axios.defaults.baseURL = baseUrl;
    },
    setVoice(state, channel) {
      if (channel) {
        state.voice = {
          channel,
          localStreams: [],
          remoteStreams: [],
          started: Date.now(),
          queuedIce: [],
          deaf: false,
        };
      } else {
        state.voice = null;
      }
    },
    setLocalStream(state, localStream) {
      const old = state.voice.localStreams.find(
        (s) => s.type === localStream.type
      );

      const merged = {
        ...old,
        ...localStream,
      };

      state.voice.localStreams = state.voice.localStreams.filter(
        (s) => s !== old
      );

      if (!merged.delete) {
        state.voice.localStreams.push(merged);
      }
    },
    setLocalStreamPeer(state, localStreamPeer) {
      const stream = state.voice.localStreams.find(
        (s) => s.type === localStreamPeer.type
      );

      if (localStreamPeer.peer) {
        stream.peers[localStreamPeer.user] = localStreamPeer.peer;
      } else {
        delete stream.peers[localStreamPeer.user];
      }
    },
    setRemoteStream(state, remoteStream) {
      const old = state.voice.remoteStreams.find(
        (s) => s.user === remoteStream.user && s.type === remoteStream.type
      );

      const merged = {
        ...old,
        ...remoteStream,
      };

      state.voice.remoteStreams = state.voice.remoteStreams.filter(
        (s) => s !== old
      );

      if (!merged.delete) {
        state.voice.remoteStreams.push(merged);
      }
    },
    setReady(state, ready) {
      state.ready = ready;
    },
    queueIce(state, ice) {
      state.voice.queuedIce.push(ice);
    },
    removeQueuedIce(state, ice) {
      if (state.voice) {
        state.voice.queuedIce = state.voice.queuedIce.filter((i) => i !== ice);
      }
    },
    setFavicon(state, href) {
      if (!state.faviconEl) {
        state.faviconEl = document.createElement("link");
        state.faviconEl.rel = "shortcut icon";

        document.querySelector("head").appendChild(state.faviconEl);
      }

      state.faviconEl.href = href;
    },
    setDeaf(state, deaf) {
      if (state.voice) {
        state.voice.deaf = deaf;
      }
    },
    setRtcEcho(state, val) {
      state.rtcEcho = !val;

      if (val) {
        localStorage.removeItem("rtcEcho");
      } else {
        localStorage.setItem("rtcEcho", "a");
      }
    },
    setRtcNoise(state, val) {
      state.rtcNoise = !val;

      if (val) {
        localStorage.removeItem("rtcNoise");
      } else {
        localStorage.setItem("rtcNoise", "a");
      }
    },
    setRtcGain(state, val) {
      state.rtcGain = !val;

      if (val) {
        localStorage.removeItem("rtcGain");
      } else {
        localStorage.setItem("rtcGain", "a");
      }
    },
    setVideoQuality(state, val) {
      state.videoQuality = val;
      localStorage.setItem("videoQuality", val);
    },
    setDisplayQuality(state, val) {
      state.displayQuality = val;
      localStorage.setItem("displayQuality", val);
    },
    setSendTyping(state, val) {
      state.sendTyping = !val;

      if (val) {
        localStorage.removeItem("sendTyping");
      } else {
        localStorage.setItem("sendTyping", "a");
      }
    },
    setVadEnabled(state, val) {
      state.vadEnabled = !val;

      if (val) {
        localStorage.removeItem("vadEnabled");
      } else {
        localStorage.setItem("vadEnabled", "a");
      }
    },
    setMessageSides(state, val) {
      state.messageSides = val;

      if (val) {
        localStorage.setItem("messageSides", "a");
      } else {
        localStorage.removeItem("messageSides");
      }
    },
    setSyntaxTheme(state, val) {
      state.syntaxTheme = val;

      if (val) {
        localStorage.setItem("syntaxTheme", val);
      } else {
        localStorage.removeItem("syntaxTheme");
      }
    },
    resetUser(state) {
      state.user = null;
    },
    resetChannels(state) {
      state.channels = [];
    },
    resetFriends(state) {
      state.friends = [];
    },
  },
  actions: {
    async register({ commit, dispatch }, data) {
      const salt = nacl.randombytes_buf(nacl.crypto_pwhash_SALTBYTES);

      const symKey = nacl.crypto_pwhash(
        32,
        data.password,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = nacl.crypto_pwhash(
        32,
        symKey,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const { publicKey, privateKey } = nacl.crypto_box_keypair();

      const encryptedPrivateKeyNonce = nacl.randombytes_buf(
        nacl.crypto_secretbox_NONCEBYTES
      );

      const encryptedPrivateKey = new Uint8Array([
        ...encryptedPrivateKeyNonce,
        ...nacl.crypto_secretbox_easy(
          privateKey,
          encryptedPrivateKeyNonce,
          symKey
        ),
      ]);

      const res = await axios.post("/api/register", {
        username: data.username,
        salt: nacl.to_base64(salt, nacl.base64_variants.ORIGINAL),
        authKey: nacl.to_base64(authKey, nacl.base64_variants.ORIGINAL),
        publicKey: nacl.to_base64(publicKey, nacl.base64_variants.ORIGINAL),
        encryptedPrivateKey: nacl.to_base64(
          encryptedPrivateKey,
          nacl.base64_variants.ORIGINAL
        ),
      });

      commit("setSalt", salt);
      commit("setPublicKey", publicKey);
      commit("setPrivateKey", privateKey);

      await dispatch("refresh", res.data.token);
    },
    async login({ commit, dispatch }, data) {
      const { data: prelogin } = await axios.post("/api/prelogin", {
        username: data.username,
      });

      const salt = nacl.from_base64(
        prelogin.salt,
        nacl.base64_variants.ORIGINAL
      );

      commit("setSalt", salt);

      const symKey = nacl.crypto_pwhash(
        32,
        data.password,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = nacl.crypto_pwhash(
        32,
        symKey,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const { data: login } = await axios.post("/api/login", {
        username: data.username,
        authKey: nacl.to_base64(authKey, nacl.base64_variants.ORIGINAL),
      });

      if (login.totpRequired) {
        commit("setSymKey", symKey);
        commit("setTotpLoginTicket", login.ticket);
        return;
      }

      const encryptedPrivateKey = nacl.from_base64(
        login.encryptedPrivateKey,
        nacl.base64_variants.ORIGINAL
      );

      const privateKey = nacl.crypto_secretbox_open_easy(
        encryptedPrivateKey.slice(24),
        encryptedPrivateKey.slice(0, 24),
        symKey
      );

      const publicKey = nacl.from_base64(
        login.publicKey,
        nacl.base64_variants.ORIGINAL
      );

      commit("setPublicKey", publicKey);
      commit("setPrivateKey", privateKey);

      await dispatch("refresh", login.token);
    },
    async totpLogin({ commit, dispatch, getters }, { code }) {
      const { data: login } = await axios.post("/api/totp/login", {
        ticket: getters.totpLoginTicket,
        code,
      });

      const encryptedPrivateKey = nacl.from_base64(
        login.encryptedPrivateKey,
        nacl.base64_variants.ORIGINAL
      );

      const privateKey = nacl.crypto_secretbox_open_easy(
        encryptedPrivateKey.slice(24),
        encryptedPrivateKey.slice(0, 24),
        getters.symKey
      );

      const publicKey = nacl.from_base64(
        login.publicKey,
        nacl.base64_variants.ORIGINAL
      );

      commit("setSymKey", null);
      commit("setTotpLoginTicket", null);
      commit("setPublicKey", publicKey);
      commit("setPrivateKey", privateKey);

      await dispatch("refresh", login.token);
    },
    clearTotpTicket({ commit }) {
      commit("setTotpLoginTicket", null);
    },
    async refresh({ commit, dispatch }, token) {
      if (typeof process !== "undefined") {
        if (process.env.DEV) {
          commit("setBaseUrl", "http://localhost:3000");
        } else {
          commit("setBaseUrl", "https://hyalus.xyz");
        }
      } else {
        commit("setBaseUrl", location.origin);
      }

      await nacl.ready;

      if ("salt" in localStorage) {
        commit(
          "setSalt",
          nacl.from_base64(localStorage.salt, nacl.base64_variants.ORIGINAL)
        );
      }

      if ("publicKey" in localStorage) {
        commit(
          "setPublicKey",
          nacl.from_base64(
            localStorage.publicKey,
            nacl.base64_variants.ORIGINAL
          )
        );
      }

      if ("privateKey" in localStorage) {
        commit(
          "setPrivateKey",
          nacl.from_base64(
            localStorage.privateKey,
            nacl.base64_variants.ORIGINAL
          )
        );
      }

      commit("setToken", token);

      if (token) {
        dispatch("wsConnect");
      }
    },
    async logout({ dispatch }) {
      await axios.get("/api/logout");
      dispatch("reset");
    },
    reset({ commit }) {
      if (typeof process !== "undefined" && process.env.DEV) {
        console.log("Ignoring reset (DEV=1)");
        return;
      }

      commit("setWs", null);
      commit("setUser", null);
      commit("setToken", null);
      commit("setPublicKey", null);
      commit("setPrivateKey", null);
      location.reload();
    },
    wsConnect({ commit, dispatch, getters }) {
      const wsBaseUrl = getters.baseUrl.replace("http", "ws");
      const ws = new WebSocket(`${wsBaseUrl}/api/ws`);

      ws.binaryType = "arraybuffer";

      ws._send = ws.send;
      ws.send = (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws._send(msgpack.encode(data));
        }
      };

      ws.onopen = () => {
        ws.send({
          t: "start",
          d: {
            token: getters.token,
          },
        });
      };

      ws.onmessage = async ({ data }) => {
        data = msgpack.decode(new Uint8Array(data));

        if (Vue.config.devtools && data.t !== "ping") {
          console.log(data);
        }

        if (data.t === "ping") {
          ws.send({
            t: "pong",
          });
        }

        if (data.t === "close") {
          if (data.d.reset) {
            dispatch("reset");
          }
        }

        if (data.t === "ready") {
          commit("resetUser");
          commit("resetFriends");
          commit("resetChannels");

          commit("setUser", data.d.user);

          dispatch("updateFavicon");

          data.d.friends.map((friend) => {
            commit("setFriend", friend);
          });

          data.d.channels.map((channel) => {
            commit("setChannel", channel);

            channel.users.map((user) => {
              commit("setChannelUser", {
                channel: channel.id,
                ...user,
              });
            });

            if (channel.lastMessage) {
              commit("setMessage", {
                channel: channel.id,
                ...channel.lastMessage,
                silent: true,
              });
            }
          });

          if (getters.channelById(getters.voice?.channel)) {
            ws.send({
              t: "voiceJoin",
              d: getters.voice?.channel,
            });
          } else {
            dispatch("voiceLeave", {
              silent: true,
            });
          }

          if (router.currentRoute.name === "channel") {
            dispatch("updateChannel", router.currentRoute.params.channel);
          }

          commit("setReady", true);
        }

        if (data.t === "user") {
          commit("setUser", data.d);

          if (data.d.accentColor) {
            dispatch("updateFavicon");
          }
        }

        if (data.t === "friend") {
          commit("setFriend", data.d);
        }

        if (data.t === "friendUser") {
          commit("setFriendUser", data.d);
        }

        if (data.t === "channel") {
          commit("setChannel", data.d);

          if (data.d.users) {
            for (const channelUser of data.d.users) {
              commit("setChannelUser", {
                channel: data.d.id,
                ...channelUser,
              });
            }
          }
        }

        if (data.t === "channelUser") {
          if (getters.voice && data.d.channel === getters.voice.channel) {
            if (data.d.voiceConnected) {
              dispatch("handleVoiceUserJoin", data.d.id);
            } else {
              dispatch("handleVoiceUserLeave", {
                user: data.d.id,
              });
            }
          }

          commit("setChannelUser", data.d);
        }

        if (data.t === "message") {
          commit("setMessage", data.d);
        }

        if (data.t === "voiceStreamOffer") {
          dispatch("handleVoiceStreamOffer", data.d);
        }

        if (data.t === "voiceStreamAnswer") {
          dispatch("handleVoiceStreamAnswer", data.d);
        }

        if (data.t === "voiceStreamIce") {
          dispatch("handleVoiceStreamIce", data.d);
        }

        if (data.t === "voiceStreamEnd") {
          dispatch("stopRemoteStream", data.d);
        }

        if (data.t === "voiceKick") {
          await dispatch("voiceReset", {});
          commit("setVoice", null);
        }

        //TODO: voice stream pausing/resuming capabilities.

        // if (data.t === "voiceStreamPause") {
        //   dispatch("handleVoiceStreamPause", data.d)
        // }

        // if (data.t === "voiceStreamResume") {
        //   dispatch("handleVoiceStreamResume", data.d)
        // }
      };

      ws.onclose = async () => {
        setTimeout(() => {
          dispatch("wsConnect");
        }, 1000 * 3); //3s

        setTimeout(async () => {
          if (getters.ready && getters.ws?.readyState !== WebSocket.OPEN) {
            commit("setReady", false);

            if (getters.voice) {
              await dispatch("voiceReset", {
                onlyStopPeers: true,
              });
            }
          }
        }, 1000 * 5); //15s
      };

      commit("setWs", ws);
    },
    setName: ({}, name) => axios.post("/api/me", { name }),
    setUsername: ({}, username) => axios.post("/api/me", { username }),
    setBetaBanner: ({ commit }, betaBanner) =>
      commit("setBetaBanner", betaBanner),
    async setAudioOutput({ getters, commit, dispatch }, audioOutput) {
      commit("setAudioOutput", audioOutput);

      if (getters.voice) {
        getters.voice.remoteStreams
          .filter((s) => s.track.kind === "audio")
          .map((stream) => {
            stream.el.setSinkId(audioOutput);
          });
      }
    },
    async setVideoInput({ getters, commit, dispatch }, videoInput) {
      commit("setVideoInput", videoInput);
      await dispatch("restartLocalStream", "video");
    },
    async setAudioInput({ getters, commit, dispatch }, audioInput) {
      commit("setAudioInput", audioInput);
      await dispatch("restartLocalStream", "audio");
    },
    setAvatar({}) {
      const el = document.createElement("input");

      el.addEventListener("input", async () => {
        const form = new FormData();
        form.append("", el.files[0]);

        await axios.post("/api/avatars", form, {
          headers: {
            "content-type": "multipart/form-data",
          },
        });
      });

      el.type = "file";
      el.click();
    },
    async setPassword({ commit, getters }, data) {
      const oldSymKey = nacl.crypto_pwhash(
        32,
        data.oldPassword,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const oldAuthKey = nacl.crypto_pwhash(
        32,
        oldSymKey,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const salt = nacl.randombytes_buf(nacl.crypto_pwhash_SALTBYTES);

      const symKey = nacl.crypto_pwhash(
        32,
        data.newPassword,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = nacl.crypto_pwhash(
        32,
        symKey,
        salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const encryptedPrivateKeyNonce = nacl.randombytes_buf(
        nacl.crypto_secretbox_NONCEBYTES
      );

      const encryptedPrivateKey = new Uint8Array([
        ...encryptedPrivateKeyNonce,
        ...nacl.crypto_secretbox_easy(
          getters.privateKey,
          encryptedPrivateKeyNonce,
          symKey
        ),
      ]);

      await axios.post("/api/me", {
        salt: nacl.to_base64(salt, nacl.base64_variants.ORIGINAL),
        authKey: nacl.to_base64(authKey, nacl.base64_variants.ORIGINAL),
        oldAuthKey: nacl.to_base64(oldAuthKey, nacl.base64_variants.ORIGINAL),
        encryptedPrivateKey: nacl.to_base64(
          encryptedPrivateKey,
          nacl.base64_variants.ORIGINAL
        ),
      });

      commit("setSalt", salt);
    },
    async totpInit({ commit }) {
      const { data } = await axios.get("/api/totp/init");
      commit("setTotpInitData", data);
    },
    async totpEnable({ getters }, { password, code }) {
      const symKey = nacl.crypto_pwhash(
        32,
        password,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = nacl.crypto_pwhash(
        32,
        symKey,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      await axios.post("/api/totp/enable", {
        ticket: getters.totpInitData.ticket,
        authKey: nacl.to_base64(authKey, nacl.base64_variants.ORIGINAL),
        code,
      });
    },
    async totpDisable({ getters }, { password }) {
      const symKey = nacl.crypto_pwhash(
        32,
        password,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = nacl.crypto_pwhash(
        32,
        symKey,
        getters.salt,
        nacl.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        nacl.crypto_pwhash_ALG_ARGON2ID13
      );

      await axios.post("/api/totp/disable", {
        authKey: nacl.to_base64(authKey, nacl.base64_variants.ORIGINAL),
      });
    },
    async addFriend({}, username) {
      await axios.post("/api/friends", {
        username,
      });
    },
    async acceptFriend({}, id) {
      await axios.post("/api/friends/accept", {
        id,
      });
    },
    async removeFriend({}, id) {
      await axios.delete(`/api/friends/${id}`);
    },
    async updateChannel({ commit, getters }, id) {
      const channel = getters.channelById(id);

      const { data: messages } = await axios.get(
        `/api/channels/${id}/messages`
      );

      for (const message of messages) {
        commit("setMessage", {
          channel: id,
          ...message,
          silent: true,
        });
      }

      commit("setChannel", {
        ...channel,
        updated: true,
      });
    },
    async getChannelHistory({ getters, commit }, id) {
      const channel = getters.channelById(id);
      const lastMessageId = channel.messages[0].id;

      const { data: messages } = await axios.get(
        `/api/channels/${id}/messages?before=${lastMessageId}`
      );

      messages.map((message) => {
        commit("setMessage", {
          channel: id,
          ...message,
          silent: true,
        });
      });
    },
    async sendMessage({ commit, getters }, data) {
      const key = nacl.randombytes_buf(nacl.crypto_secretbox_KEYBYTES);
      const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);

      const body = new Uint8Array([
        ...nonce,
        ...nacl.crypto_secretbox_easy(data.body, nonce, key),
      ]);

      const channel = getters.channelById(data.channel);
      const userKeys = [];

      for (const user of channel.users.filter((u) => !u.removed)) {
        const userKeyNonce = nacl.randombytes_buf(
          nacl.crypto_secretbox_NONCEBYTES
        );

        const userKey = new Uint8Array([
          ...userKeyNonce,
          ...nacl.crypto_box_easy(
            key,
            userKeyNonce,
            user.publicKey,
            getters.privateKey
          ),
        ]);

        userKeys.push({
          id: user.id,
          key: nacl.to_base64(userKey, nacl.base64_variants.ORIGINAL),
        });
      }

      const selfKeyNonce = nacl.randombytes_buf(
        nacl.crypto_secretbox_NONCEBYTES
      );

      const selfKey = new Uint8Array([
        ...selfKeyNonce,
        ...nacl.crypto_box_easy(
          key,
          selfKeyNonce,
          getters.publicKey,
          getters.privateKey
        ),
      ]);

      userKeys.push({
        id: getters.user.id,
        key: nacl.to_base64(selfKey, nacl.base64_variants.ORIGINAL),
      });

      await axios.post(`/api/channels/${data.channel}/messages`, {
        body: nacl.to_base64(body, nacl.base64_variants.ORIGINAL),
        keys: userKeys,
      });
    },
    async sendMessageTyping({ getters, commit, dispatch }, channel) {
      getters.ws.send({
        t: "messageTyping",
        d: channel,
      });
    },
    async deleteMessage({}, data) {
      await axios.delete(`/api/channels/${data.channel}/messages/${data.id}`);
    },
    async createGroup({}, { name, users }) {
      await axios.post("/api/channels", {
        name,
        users,
      });
    },
    async setGroupName({}, { channel, name }) {
      await axios.post(`/api/channels/${channel}/meta`, {
        name,
      });
    },
    async setGroupAvatar({}, channel) {
      const el = document.createElement("input");

      el.addEventListener("input", async () => {
        const form = new FormData();
        form.append("", el.files[0]);

        await axios.post(`/api/channels/${channel}/avatar`, form, {
          headers: {
            "content-type": "multipart/form-data",
          },
        });
      });

      el.type = "file";
      el.click();
    },
    async groupAdd({}, { channel, user }) {
      await axios.post(`/api/channels/${channel}/users`, {
        user,
      });
    },
    async groupRemove({}, { channel, user }) {
      await axios.delete(`/api/channels/${channel}/users/${user}`);
    },
    async voiceJoin({ getters, commit, dispatch }, channel) {
      commit("setVoice", channel);

      getters.ws.send({
        t: "voiceJoin",
        d: channel,
      });

      try {
        new Audio(sndStateUp).play();
      } catch {}
    },
    async voiceLeave({ getters, commit, dispatch }) {
      if (!getters.voice) {
        return;
      }

      await dispatch("voiceReset", {});
      commit("setVoice", null);

      getters.ws.send({
        t: "voiceLeave",
        d: {},
      });

      try {
        new Audio(sndStateDown).play();
      } catch {}
    },
    async voiceReset({ getters, commit, dispatch }, params) {
      for (const stream of getters.voice.localStreams) {
        await dispatch("stopLocalStream", {
          type: stream.type,
          leaving: true,
          onlyStopPeers: params.onlyStopPeers,
        });
      }

      for (const stream of getters.voice.remoteStreams) {
        await dispatch("stopRemoteStream", {
          user: stream.user,
          type: stream.type,
        });
      }
    },
    async handleVoiceStreamOffer({ getters, commit, dispatch }, data) {
      const channel = getters.channelById(getters.voice.channel);
      const user = channel.users.find((user) => user.id === data.user);

      const decryptedSdp = nacl.crypto_box_open_easy(
        data.sdp.slice(24),
        data.sdp.slice(0, 24),
        user.publicKey,
        getters.privateKey
      );

      const peer = new RTCPeerConnection({
        iceServers,
      });

      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);

          const packed = msgpack.encode({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          });

          const encrypted = new Uint8Array([
            ...nonce,
            ...nacl.crypto_box_easy(
              packed,
              nonce,
              user.publicKey,
              getters.privateKey
            ),
          ]);

          getters.ws.send({
            t: "voiceStreamIce",
            d: {
              user: data.user,
              type: data.type,
              candidate: encrypted,
              initiator: false,
            },
          });
        }
      };

      peer.ontrack = ({ track }) => {
        const el = document.createElement(track.kind);
        el.srcObject = new MediaStream([track]);
        el.controls = false;
        el.play();

        if (track.kind === "audio") {
          el.setSinkId(getters.audioOutput);

          if (getters.voice.deaf) {
            track.enabled = false;
          }
        }

        commit("setRemoteStream", {
          user: data.user,
          type: data.type,
          track,
          peer,
          el,
        });
      };

      peer.onconnectionstatechange = () => {
        if (Vue.config.devtools) {
          console.log(`${data.user} -> ${data.type}: ${peer.connectionState}`);
        }

        if (peer.connectionState === "closed") {
          commit("setRemoteStream", {
            user: data.user,
            type: data.type,
            delete: true,
          });
        }
      };

      await peer.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: nacl.to_string(decryptedSdp),
        })
      );

      await peer.setLocalDescription(await peer.createAnswer());

      const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);

      const encryptedSdp = new Uint8Array([
        ...nonce,
        ...nacl.crypto_box_easy(
          peer.localDescription.sdp,
          nonce,
          user.publicKey,
          getters.privateKey
        ),
      ]);

      getters.ws.send({
        t: "voiceStreamAnswer",
        d: {
          user: data.user,
          type: data.type,
          sdp: encryptedSdp,
        },
      });

      for (const ice of getters.voice.queuedIce
        .filter((i) => i.user === data.user)
        .filter((i) => i.type === data.type)) {
        await peer.addIceCandidate(ice.candidate);
        commit("removeQueuedIce", ice);
      }
    },
    async handleVoiceStreamAnswer({ getters, commit, dispatch }, data) {
      const stream = getters.localStream(data.type);

      if (!stream) {
        return;
      }

      const peer = stream.peers[data.user];

      if (!peer) {
        return;
      }

      const channel = getters.channelById(getters.voice.channel);
      const user = channel.users.find((user) => user.id === data.user);

      const decryptedSdp = nacl.crypto_box_open_easy(
        data.sdp.slice(24),
        data.sdp.slice(0, 24),
        user.publicKey,
        getters.privateKey
      );

      await peer.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: nacl.to_string(decryptedSdp),
        })
      );
    },
    async handleVoiceStreamIce({ getters, commit, dispatch }, data) {
      const channel = getters.channelById(getters.voice.channel);
      const user = channel.users.find((u) => u.id === data.user);

      const decrypted = nacl.crypto_box_open_easy(
        data.candidate.slice(24),
        data.candidate.slice(0, 24),
        user.publicKey,
        getters.privateKey
      );

      if (!decrypted) {
        console.log(`error decrypting ice from ${data.user}/${data.type}`);
        return;
      }

      const unpacked = msgpack.decode(decrypted);
      const candidate = new RTCIceCandidate(unpacked);

      if (data.initiator) {
        const stream = getters.remoteStream(data.user, data.type);

        if (!stream) {
          const queuedIce = {
            user: data.user,
            type: data.type,
            candidate,
          };

          commit("queueIce", queuedIce);

          setTimeout(() => {
            commit("removeQueuedIce", queuedIce);
          }, 1000 * 30); //30s

          return;
        }

        await stream.peer.addIceCandidate(candidate);
      } else {
        const stream = getters.localStream(data.type);

        if (!stream) {
          return;
        }

        const peer = stream.peers[data.user];

        if (!peer) {
          return;
        }

        await peer.addIceCandidate(candidate);
      }
    },
    async handleVoiceUserJoin({ getters, commit, dispatch }, userId) {
      const channel = getters.channelById(getters.voice.channel);
      const user = channel.users.find((u) => u.id === userId);

      if (user.voiceConnected) {
        await dispatch("handleVoiceUserLeave", {
          user: userId,
          silent: true,
        });
      } else {
        try {
          new Audio(sndStateUp).play();
        } catch {}
      }

      getters.voice.localStreams.map((stream) => {
        dispatch("sendLocalStream", {
          type: stream.type,
          user: userId,
        });
      });
    },
    async handleVoiceUserLeave({ getters, commit, dispatch }, params) {
      for (const stream of getters.voice.localStreams) {
        const peer = stream.peers[params.user];

        if (peer) {
          peer.close();
        }

        commit("setLocalStreamPeer", {
          user: params.user,
          type: stream.type,
          peer: null,
        });
      }

      for (const stream of getters.voice.remoteStreams.filter(
        (stream) => stream.user === params.user
      )) {
        dispatch("stopRemoteStream", {
          user: params.user,
          type: stream.type,
        });
      }

      if (!params.silent) {
        try {
          new Audio(sndStateDown).play();
        } catch {}
      }
    },
    async startLocalStream({ getters, commit, dispatch }, { type, track }) {
      commit("setLocalStream", {
        type,
        track,
        peers: {},
      });

      const channel = getters.channelById(getters.voice.channel);

      channel.users
        .filter((user) => user.voiceConnected)
        .map((user) => {
          dispatch("sendLocalStream", {
            type,
            user: user.id,
          });
        });
    },
    async stopLocalStream({ getters, commit, dispatch }, params) {
      const stream = getters.localStream(params.type);

      if (!stream) {
        return;
      }

      Object.entries(stream.peers).map(([user, peer]) => {
        peer.close();

        commit("setLocalStreamPeer", {
          user,
          type: params.type,
          peer: null,
        });
      });

      if (!params.onlyStopPeers) {
        stream.track.stop();

        commit("setLocalStream", {
          type: params.type,
          delete: true,
        });
      }

      if (!params.leaving) {
        getters.ws.send({
          t: "voiceStreamEnd",
          d: params.type,
        });
      }
    },
    async sendLocalStream({ getters, commit, dispatch }, data) {
      const stream = getters.localStream(data.type);
      const channel = getters.channelById(getters.voice.channel);
      const user = channel.users.find((user) => user.id === data.user);
      const peer = new RTCPeerConnection({
        iceServers,
      });

      peer.onicecandidate = ({ candidate }) => {
        if (candidate) {
          const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);

          const packed = msgpack.encode({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
          });

          const encrypted = new Uint8Array([
            ...nonce,
            ...nacl.crypto_box_easy(
              packed,
              nonce,
              user.publicKey,
              getters.privateKey
            ),
          ]);

          getters.ws.send({
            t: "voiceStreamIce",
            d: {
              user: data.user,
              type: data.type,
              candidate: encrypted,
              initiator: true,
            },
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (Vue.config.devtools) {
          console.log(`${data.type} -> ${data.user}: ${peer.connectionState}`);
        }
      };

      peer.addTrack(stream.track);
      await peer.setLocalDescription(await peer.createOffer());

      const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);

      const encryptedSdp = new Uint8Array([
        ...nonce,
        ...nacl.crypto_box_easy(
          peer.localDescription.sdp,
          nonce,
          user.publicKey,
          getters.privateKey
        ),
      ]);

      getters.ws.send({
        t: "voiceStreamOffer",
        d: {
          user: data.user,
          type: data.type,
          sdp: encryptedSdp,
        },
      });

      commit("setLocalStreamPeer", {
        user: data.user,
        type: data.type,
        peer,
      });
    },
    async stopRemoteStream({ getters, commit, dispatch }, { user, type }) {
      const stream = getters.remoteStream(user, type);

      if (!stream) {
        return;
      }

      stream.peer.close();

      commit("setRemoteStream", {
        user,
        type,
        delete: true,
      });
    },
    async toggleAudio({ getters, commit, dispatch }, params) {
      if (getters.localStream("audio")) {
        dispatch("stopLocalStream", {
          type: "audio",
        });

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      let stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: getters.audioInput,
          echoCancellation: getters.rtcEcho,
          noiseSuppression: getters.rtcNoise,
          autoGainControl: getters.rtcGain,
        },
      });

      if (getters.vadEnabled) {
        if (!rnnoise) {
          //why not put the pkg name into a variable?
          //webpack! :)
          if (typeof process === "undefined") {
            const { default: Rnnoise } = await import("@hyalusapp/rnnoise");
            const { default: RnnoiseWasm } = await import(
              `@hyalusapp/rnnoise/dist/rnnoise.wasm`
            );

            rnnoise = await Rnnoise({
              locateFile: () => RnnoiseWasm,
            });
          } else {
            rnnoise = await eval("require('@hyalusapp/rnnoise')")();
          }

          await rnnoise.ready;
        }

        const origStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: getters.audioInput,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        const procSize = 4096;
        const sampleLength = 480;

        const origCtx = new AudioContext();
        const origSource = origCtx.createMediaStreamSource(origStream);
        const origGain = origCtx.createGain();
        const origProc = origCtx.createScriptProcessor(procSize, 1, 1);

        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const delay = ctx.createDelay();
        const gain = ctx.createGain();
        const dest = ctx.createMediaStreamDestination();

        const inMemp = rnnoise._malloc(sampleLength * 4);
        const outMemp = rnnoise._malloc(sampleLength * 4);
        const outMem = new Float32Array(
          rnnoise.HEAPF32.buffer,
          outMemp,
          sampleLength
        );

        const noise = rnnoise._rnnoise_create();

        let pendingIn = new Float32Array([]);

        let closeTimeout;

        origProc.addEventListener("audioprocess", (e) => {
          let detected;

          const bufIn = new Float32Array([
            ...pendingIn,
            ...e.inputBuffer.getChannelData(0),
          ]);

          let i = 0;

          for (; i + sampleLength < bufIn.length; i += sampleLength) {
            const sample = bufIn.slice(i, i + sampleLength);

            for (const [i, val] of sample.entries()) {
              sample[i] = val * 0x7fff;
            }

            rnnoise.HEAPF32.set(sample, inMemp / 4);

            const out = rnnoise._rnnoise_process_frame(noise, outMemp, inMemp);

            if (out > 0.4) {
              detected = true;
            }
          }

          pendingIn = bufIn.slice(i);

          if (detected) {
            if (closeTimeout) {
              clearTimeout(closeTimeout);
            }

            gain.gain.setValueAtTime(1, ctx.currentTime);

            closeTimeout = setTimeout(() => {
              gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            }, 100);
          }
        });

        origGain.gain.setValueAtTime(2, ctx.currentTime);
        delay.delayTime.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);

        [
          [origSource, origGain, origProc, origCtx.destination],
          [source, delay, gain, dest],
        ].map((c) => c.reduce((a, b) => a.connect(b)));

        stream = dest.stream;
      }

      dispatch("startLocalStream", {
        type: "audio",
        track: stream.getTracks()[0],
      });

      if (!params?.silent) {
        try {
          new Audio(sndNavForward).play();
        } catch {}
      }
    },
    async toggleVideo({ getters, commit, dispatch }, params) {
      if (getters.localStream("video")) {
        dispatch("stopLocalStream", {
          type: "video",
        });

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      const [height, fps] = getters.videoQuality.split("p");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          height: {
            max: Number(height),
          },
          frameRate: {
            max: Number(fps),
          },
          deviceId: getters.videoInput,
        },
      });

      dispatch("startLocalStream", {
        type: "video",
        track: stream.getTracks()[0],
      });

      if (!params?.silent) {
        try {
          new Audio(sndNavForward).play();
        } catch {}
      }
    },
    async toggleDisplay({ getters, commit, dispatch }, params) {
      if (getters.localStream("displayVideo")) {
        dispatch("stopLocalStream", {
          type: "displayVideo",
        });

        dispatch("stopLocalStream", {
          type: "displayAudio",
        });

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      let stream;

      const [height, fps] = getters.displayQuality.split("p");

      if (params) {
        if (params.audio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: params.sourceId,
                  maxHeight: Number(height),
                  maxFrameRate: Number(fps),
                },
              },
              audio: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: params.sourceId,
                },
              },
            });
          } catch (e) {
            console.log("Failed to get audio from desktopCapturer");
            console.log(e);
          }
        }

        //either we failed to get audio or the user didn't want it.
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: params.sourceId,
                maxHeight: Number(height),
                maxFrameRate: Number(fps),
              },
            },
          });
        }
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            height: {
              max: Number(height),
            },
            frameRate: {
              max: Number(fps),
            },
          },
          audio: true,
        });
      }

      stream.getTracks().map((track) => {
        if (track.kind === "video") {
          dispatch("startLocalStream", {
            type: "displayVideo",
            track,
          });
        }

        if (track.kind === "audio") {
          dispatch("startLocalStream", {
            type: "displayAudio",
            track,
          });
        }
      });

      if (!params?.silent) {
        try {
          new Audio(sndNavForward).play();
        } catch {}
      }
    },
    async setAccentColor({}, accentColor) {
      await axios.post("/api/me", { accentColor });
    },
    async updateFavicon({ getters, commit }) {
      const icon = await import(`../images/icon-${getters.accentColor}.webp`);
      commit("setFavicon", icon.default);
    },
    async leaveChannel({}, id) {
      await axios.post(`/api/channels/${id}/leave`);
    },
    toggleDeaf({ getters, commit, dispatch }) {
      if (getters.voice.deaf) {
        getters.voice.remoteStreams
          .filter((stream) => stream.track.kind === "audio")
          .map((stream) => {
            stream.track.enabled = true;
          });

        try {
          new Audio(sndNavForwardMin).play();
        } catch {}

        return commit("setDeaf", false);
      }

      getters.voice.remoteStreams
        .filter((stream) => stream.track.kind === "audio")
        .map((stream) => {
          stream.track.enabled = false;
        });

      if (getters.localStream("audio")) {
        dispatch("toggleAudio", {
          silent: true,
        });
      }

      try {
        new Audio(sndNavBackwardMin).play();
      } catch {}

      commit("setDeaf", true);
    },
    async uploadFile({ getters, commit, dispatch }, { file, channelId }) {
      const channel = getters.channelById(channelId);

      let data;
      let fileType = file.type;
      let fileName = file.name;

      if (fileType === "video/x-matroska") {
        fileType = "video/webm";
        fileName += ".mkv";
      }

      const reader = new FileReader();

      reader.addEventListener("load", async () => {
        if (!data) {
          data = new Uint8Array(reader.result);
        }

        if (data.length > 1024 * 1024 * 10) {
          //10mb
          //before you get excited, this is limited at the server as well.
          //TODO: present error to user.
          throw new Error("File size too large (10MB max).");
        }

        const nonce = nacl.randombytes_buf(nacl.crypto_secretbox_NONCEBYTES);
        const key = nacl.randombytes_buf(nacl.crypto_secretbox_KEYBYTES);
        const body = new Uint8Array([
          ...nonce,
          ...nacl.crypto_secretbox_easy(data, nonce, key),
        ]);
        fileName = new Uint8Array([
          ...nonce,
          ...nacl.crypto_secretbox_easy(fileName, nonce, key),
        ]);
        fileType = new Uint8Array([
          ...nonce,
          ...nacl.crypto_secretbox_easy(fileType, nonce, key),
        ]);

        const userKeys = [];

        for (const user of channel.users.filter((u) => !u.removed)) {
          const userKeyNonce = nacl.randombytes_buf(
            nacl.crypto_secretbox_NONCEBYTES
          );

          const userKey = new Uint8Array([
            ...userKeyNonce,
            ...nacl.crypto_box_easy(
              key,
              userKeyNonce,
              user.publicKey,
              getters.privateKey
            ),
          ]);

          userKeys.push({
            id: user.id,
            key: nacl.to_base64(userKey, nacl.base64_variants.ORIGINAL),
          });
        }

        const selfKeyNonce = nacl.randombytes_buf(
          nacl.crypto_secretbox_NONCEBYTES
        );

        const selfKey = new Uint8Array([
          ...selfKeyNonce,
          ...nacl.crypto_box_easy(
            key,
            selfKeyNonce,
            getters.publicKey,
            getters.privateKey
          ),
        ]);

        userKeys.push({
          id: getters.user.id,
          key: nacl.to_base64(selfKey, nacl.base64_variants.ORIGINAL),
        });

        await axios.post(`/api/channels/${channel.id}/files`, {
          body: nacl.to_base64(body, nacl.base64_variants.ORIGINAL),
          fileName: nacl.to_base64(fileName, nacl.base64_variants.ORIGINAL),
          fileType: nacl.to_base64(fileType, nacl.base64_variants.ORIGINAL),
          keys: userKeys,
        });
      });

      reader.readAsArrayBuffer(file);
    },
    async fetchFile({ getters, commit, dispatch }, message) {
      const channel = getters.channelById(message.channel);

      const { data: body } = await axios.get(
        `/api/channels/${channel.id}/files/${message.body}`,
        {
          responseType: "arraybuffer",
        }
      );

      const encrypted = new Uint8Array(body);

      const data = nacl.crypto_secretbox_open_easy(
        encrypted.slice(24),
        encrypted.slice(0, 24),
        message.decryptedKey
      );

      const blob = new Blob([data], {
        type: message.decryptedFileType,
      });

      commit("setMessage", {
        id: message.id,
        channel: message.channel,
        blob: URL.createObjectURL(blob),
        silent: true,
      });
    },
    async restartLocalStream({ getters, commit, dispatch }, type) {
      if (getters.voice && getters.localStream(type)) {
        let action;

        if (type === "audio") {
          action = "toggleAudio";
        }

        if (type === "video") {
          action = "toggleVideo";
        }

        if (type === "display") {
          action = "toggleDisplay";
        }

        for (let i = 0; i < 2; i++) {
          await dispatch(action, {
            silent: true,
          });
        }
      }
    },
    async setVideoQuality({ getters, commit, dispatch }, quality) {
      commit("setVideoQuality", quality);
      await dispatch("restartLocalStream", "video");
    },
    async setDisplayQuality({ getters, commit, dispatch }, quality) {
      commit("setDisplayQuality", quality);
    },
    async setRtcEcho({ getters, commit, dispatch }, val) {
      commit("setRtcEcho", val);
      await dispatch("restartLocalStream", "audio");
    },
    async setRtcNoise({ getters, commit, dispatch }, val) {
      commit("setRtcNoise", val);
      await dispatch("restartLocalStream", "audio");
    },
    async setRtcGain({ getters, commit, dispatch }, val) {
      commit("setRtcGain", val);
      await dispatch("restartLocalStream", "audio");
    },
    async setVadEnabled({ getters, commit, dispatch }, val) {
      commit("setVadEnabled", val);
      await dispatch("restartLocalStream", "audio");
    },
  },
});
