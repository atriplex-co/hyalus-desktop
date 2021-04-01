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

Vue.use(Vuex);

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

export default new Vuex.Store({
  state: {
    user: null,
    salt: null,
    publicKey: null,
    privateKey: null,
    token: localStorage.getItem("token"),
    betaBanner: localStorage.getItem("betaBanner") != null,
    audioOutput: localStorage.getItem("audioOutput"),
    audioInput: localStorage.getItem("audioInput"),
    videoInput: localStorage.getItem("videoInput"),
    friends: [],
    channels: [],
    ws: null,
    voice: null,
    totpInitData: null,
    totpLoginTicket: null,
    symKey: null,
    baseUrl: null,
    ready: false,
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
  },
  mutations: {
    setUser(state, user) {
      state.user = { ...state.user, ...user };
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
      const oldFriend = state.friends.find((f) => f.id === friend.id);
      state.friends = state.friends.filter((f) => f.id !== friend.id);
      if (!friend.delete) {
        state.friends.push({ ...oldFriend, ...friend });
      }
    },
    setChannel(state, channel) {
      const merged = {
        ...state.channels.find((c) => c.id === channel.id),
        ...channel,
      };

      state.channels = state.channels.filter((c) => c.id !== channel.id);

      if (!merged.delete) {
        if (merged.type === "dm") {
          merged.name = merged.users[0].name;
          merged.avatar = merged.users[0].avatar;
        }

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
      }

      state.channels = state.channels.filter((c) => c.id !== channel.id);
      state.channels.push(channel);
    },
    setMessage(state, message) {
      const channel = state.channels.find((c) => c.id === message.channel);

      const merged = {
        ...channel.messages.find((m) => m.id === message.id),
        ...message,
      };

      channel.messages = channel.messages.filter((m) => m.id !== message.id);

      // has to be above merged.type === text so a notification can be sent without a redundant if
      // statement
      const sender =
        channel.users.find((u) => u.id === merged.sender) || state.user;

      if (!message.delete) {
        if (merged.type === "text") {
          if (typeof merged.body === "string") {
            merged.body = nacl.from_base64(
              merged.body,
              nacl.base64_variants.ORIGINAL
            );
          }

          if (typeof merged.key === "string") {
            merged.key = nacl.from_base64(
              merged.key,
              nacl.base64_variants.ORIGINAL
            );
          }

          if (!merged.decrypted) {
            let senderPublicKey;

            if (merged.sender === state.user.id) {
              senderPublicKey = state.publicKey;
            } else {
              senderPublicKey = channel.users.find(
                (u) => u.id === merged.sender
              ).publicKey;
            }

            const decryptedKey = nacl.crypto_box_open_easy(
              merged.key.slice(24),
              merged.key.slice(0, 24),
              senderPublicKey,
              state.privateKey
            );

            const decryptedBody = nacl.crypto_secretbox_open_easy(
              merged.body.slice(24),
              merged.body.slice(0, 24),
              decryptedKey
            );

            merged.decrypted = nacl.to_string(decryptedBody);
          }

          //check if we are supposed to send a push notif and if so send it
          if (localStorage.getItem("pushNotification") === "true") {
            new Notification(`New Message from ${sender.name}`, {
              "body": `${truncateString(merged.decrypted, 150)}`,
              "icon": "/a31d8dafc822eefc1f4dd1d28e4a097e.webp",
            })
          }

        }


        const target =
          channel.users.find((u) => u.id === merged.body) || state.user;

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

        if (state.ready && merged.sender !== state.user.id) {
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

          if (!merged.decrypted || localStorage.getItem("soundNotification") == "true") {
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
      state.voice.queuedIce = state.voice.queuedIce.filter((i) => i !== ice);
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
    clearTotpTicket({commit}) {
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
      ws.send = (data) => ws._send(msgpack.encode(data));

      ws.onmessage = ({ data }) => {
        data = msgpack.decode(new Uint8Array(data));

        if (Vue.config.devtools && data.t !== "keepaliveAck") {
          console.log(data);
        }

        if (data.t === "hello") {
          ws.keepaliveSender = setInterval(() => {
            ws.send({
              t: "keepalive",
            });
          }, data.d.keepalive);

          ws.idleTimeout = setInterval(() => {
            if (Date.now() - ws.lastKeepalive > data.d.keepalive * 2) {
              ws.close();
            }
          }, 1000);

          ws.lastKeepalive = Date.now();

          ws.send({
            t: "start",
            d: {
              token: getters.token,
            },
          });
        }

        if (data.t === "keepaliveAck") {
          ws.lastKeepalive = Date.now();
        }

        if (data.t === "close") {
          if (data.d.reset) {
            dispatch("reset");
          }
        }

        if (data.t === "ready") {
          commit("setUser", data.d.user);

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
              });
            }
          });

          commit("setReady", true);
        }

        if (data.t === "user") {
          commit("setUser", data.d);
        }

        if (data.t === "friend") {
          commit("setFriend", data.d);
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
              try {
                new Audio(sndStateUp).play();
              } catch {}

              dispatch("handleVoiceUserJoin", data.d.id);
            }

            if (data.d.voiceConnected === false) {
              try {
                new Audio(sndStateDown).play();
              } catch {}

              dispatch("handleVoiceUserLeave", data.d.id);
            }
          }

          commit("setChannelUser", data.d);
        }

        if (data.t === "message") {
          commit("setMessage", data.d);

          //check if you should make a sound
          if (!data.d.delete && data.d.sender !== getters.user.id) {
            let playSound = false;

            if (document.visibilityState === "hidden") {
              playSound = true;
            }

            if (document.visibilityState === "visible") {
              if (router.currentRoute.name === "channel") {
                if (router.currentRoute.params.channel !== data.d.channel) {
                  playSound = true;
                }
              } else {
                playSound = true;
              }
            }

            if (playSound === true && localStorage.getItem("soundNotification") == "true") {
              try {
                new Audio(sndNotification).play();
              } catch {}
            }
          }
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
          dispatch("voiceLeave");
        }

        //TODO: voice stream pausing/resuming capabilities.

        // if (data.t === "voiceStreamPause") {
        //   dispatch("handleVoiceStreamPause", data.d)
        // }

        // if (data.t === "voiceStreamResume") {
        //   dispatch("handleVoiceStreamResume", data.d)
        // }
      };

      ws.onclose = () => {
        clearInterval(ws.idleTimeout);
        clearInterval(ws.keepaliveSender);

        commit("setReady", false);

        setTimeout(() => {
          dispatch("wsConnect");
        }, 1000 * 5); //5s
      };

      commit("setWs", ws);
    },
    setName: ({}, name) => axios.post("/api/me", { name }),
    setUsername: ({}, username) => axios.post("/api/me", { username }),
    setBetaBanner: ({ commit }, betaBanner) =>
      commit("setBetaBanner", betaBanner),
    setAudioOutput: ({ commit }, audioOutput) =>
      commit("setAudioOutput", audioOutput),
    setVideoInput: ({ commit }, videoInput) =>
      commit("setVideoInput", videoInput),
    setAudioInput: ({ commit }, audioInput) =>
      commit("setAudioInput", audioInput),
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
      await axios.delete(`/api/channels/${data.channel}/${data.id}`);
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
      for (const stream of getters.voice.localStreams) {
        await dispatch("stopLocalStream", stream.type);
      }

      for (const stream of getters.voice.remoteStreams) {
        await dispatch("stopRemoteStream", {
          user: stream.user,
          type: stream.type,
        });
      }

      commit("setVoice", null);

      getters.ws.send({
        t: "voiceLeave",
        d: {},
      });

      try {
        new Audio(sndStateDown).play();
      } catch {}
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
        if (Vue.config.devtools) {
          console.log(track);
        }

        commit("setRemoteStream", {
          user: data.user,
          type: data.type,
          track,
          peer,
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
        const peer = stream.peers[data.user];

        if (!peer) {
          return;
        }

        await peer.addIceCandidate(candidate);
      }
    },
    async handleVoiceUserJoin({ getters, commit, dispatch }, user) {
      getters.voice.localStreams.map((stream) => {
        dispatch("sendLocalStream", {
          type: stream.type,
          user,
        });
      });
    },
    async handleVoiceUserLeave({ getters, commit, dispatch }, user) {
      getters.voice.localStreams.map((stream) => {
        const peer = stream.peers[user];

        if (peer) {
          peer.close();
        }

        commit("setLocalStreamPeer", {
          user,
          type: stream.type,
          peer: null,
        });
      });

      getters.voice.remoteStreams
        .filter((stream) => stream.user === user)
        .map((stream) => {
          dispatch("stopRemoteStream", {
            user,
            type: stream.type,
          });
        });
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
    async stopLocalStream({ getters, commit, dispatch }, type) {
      const stream = getters.localStream(type);

      if (!stream) {
        return;
      }

      stream.track.stop();

      Object.entries(stream.peers).map(([user, peer]) => {
        peer.close();

        commit("setLocalStreamPeer", {
          user,
          type,
          peer: null,
        });
      });

      commit("setLocalStream", {
        type,
        delete: true,
      });

      getters.ws.send({
        t: "voiceStreamEnd",
        d: type,
      });
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
        dispatch("stopLocalStream", "audio");

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: getters.audioInput,
        },
      });

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
        dispatch("stopLocalStream", "video");

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            max: 1280,
          },
          height: {
            max: 720,
          },
          frameRate: {
            max: 30,
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
        dispatch("stopLocalStream", "displayVideo");
        dispatch("stopLocalStream", "displayAudio");

        if (!params?.silent) {
          try {
            new Audio(sndNavBackward).play();
          } catch {}
        }

        return;
      }

      let stream;

      if (params) {
        if (params.audio) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: params.sourceId,
                  maxWidth: 1280,
                  maxHeight: 720,
                  maxFrameRate: 30,
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
                maxWidth: 1280,
                maxHeight: 720,
                maxFrameRate: 30,
              },
            },
          });
        }
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: {
              max: 1280,
            },
            height: {
              max: 720,
            },
            frameRate: {
              max: 30,
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
  },
});

function truncateString(str, num) {
  //console.log(str)
  // If the length of str is less than or equal to num
  // just return str--don't truncate it.
  if (str.length <= num) {
    return str
  }
  // Return str truncated with '...' concatenated to the end of str.
  return str.slice(0, num) + '...'
}