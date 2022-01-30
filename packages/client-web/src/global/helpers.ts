import { AxiosError } from "axios";
import { computed } from "vue";
import { store } from "./store";
import Axios from "axios";
import sodium from "libsodium-wrappers";
import { AvatarType, MessageType, Status } from "common";
import SoundNotification from "../assets/sounds/notification_simple-01.ogg";
import ImageIcon from "../assets/images/icon-background.png";
import { ICallPersist, IChannel, IChannelUser, IMessage, IUser } from "./types";
import { messageFormatter } from "./config";

export const axios = Axios.create();

export const prettyError = (e: unknown): string => {
  return (
    (
      (e as AxiosError).response?.data as {
        error?: string;
      }
    )?.error || (e as Error).message
  );
};

export const configToComputed = <T>(k: string) => {
  return computed({
    get() {
      return (store.state.value.config as Record<string, unknown>)[k] as T;
    },
    async set(v: T) {
      await store.writeConfig(k, v);
    },
  });
};

export const getWorkerUrl = (val: new () => Worker) => {
  return String(val).split('("')[1].split('"')[0];
};

export const processMessage = (opts: {
  channel: IChannel;
  id: string;
  userId: string;
  type: MessageType;
  created: number | Date;
  updated?: number | Date;
  data?: string;
  key?: string;
}): IMessage | undefined => {
  let sender: IUser | IChannelUser | undefined;
  let publicKey: Uint8Array | undefined;
  let dataString: string | undefined;
  let dataFormatted: string | undefined;

  const data = opts.data ? sodium.from_base64(opts.data) : undefined;
  const key = opts.key ? sodium.from_base64(opts.key) : undefined;

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

  if (opts.data) {
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
      opts.data
    ) {
      let target: IChannelUser | IUser | undefined;

      if (store.state.value.user && opts.data === store.state.value.user?.id) {
        target = store.state.value.user;
      } else {
        target = opts.channel.users.find((user) => user.id === opts.data);
      }

      if (!target) {
        console.warn(`processMessageVersions for invalid target: ${opts.data}`);
        return;
      }

      if (opts.type === MessageType.GroupAdd) {
        dataString = `${sender.name} added ${target.name}`;
      }

      if (opts.type === MessageType.GroupRemove) {
        dataString = `${sender.name} removed ${target.name}`;
      }
    }
  } else {
    if (opts.type === MessageType.GroupCreate) {
      dataString = `${sender.name} created a group`;
    }

    if (opts.type === MessageType.FriendAccept) {
      if (sender === store.state.value.user) {
        dataString = `You accepted ${opts.channel.users[0].name}'s friend request`;
      } else {
        dataString = `${opts.channel.users[0].name} accepted your friend request`;
      }
    }

    if (opts.type === MessageType.GroupAvatar) {
      dataString = `${sender.name} set the group avatar`;
    }

    if (opts.type === MessageType.GroupLeave) {
      dataString = `${sender.name} left the group`;
    }
  }

  return {
    id: opts.id,
    userId: opts.userId,
    type: opts.type,
    created: new Date(opts.created),
    updated: opts.updated ? new Date(opts.updated) : undefined,
    data,
    dataString,
    dataFormatted,
    key,
  };
};

export const notifySend = (opts: {
  icon: string;
  title: string;
  body: string;
}) => {
  if (store.state.value.user?.wantStatus === Status.Busy) {
    return;
  }

  if (store.state.value.config.notifySound) {
    try {
      const el = document.createElement("audio");
      el.src = SoundNotification;
      el.volume = 0.2;
      el.play();
    } catch {
      //
    }
  }

  if (store.state.value.config.notifySystem) {
    try {
      new Notification(opts.title, {
        icon: opts.icon,
        body: opts.body,
        silent: true,
      });
    } catch {
      //
    }
  }
};

export const notifyGetAvatarUrl = async (
  avatarId: string | undefined
): Promise<string> => {
  if (!avatarId) {
    return ImageIcon;
  }

  return `/api/avatars/${avatarId}/${AvatarType.WEBP}`;
};

export const callUpdatePersist = async () => {
  await store.writeConfig(
    "callPersist",
    store.state.value.call &&
      JSON.stringify({
        // idk why we JSON'd it but otherwise, IDB will shit itself.
        updated: +new Date(),
        channelId: store.state.value.call.channelId,
        localStreams: store.state.value.call.localStreams.map(
          (stream) => stream.type
        ),
      } as ICallPersist)
  );
};

export const callCheckStreams = async () => {
  const channel = store.state.value.channels.find(
    (channel) => channel.id === store.state.value.call?.channelId
  );

  if (!store.state.value.call || !channel) {
    return;
  }

  for (const stream of store.state.value.call.localStreams) {
    for (const user of channel.users.filter((user) => user.inCall)) {
      const peer = stream.peers.find((peer) => peer.userId === user.id);

      if (peer) {
        if (peer.pc.connectionState === "failed") {
          stream.peers = stream.peers.filter((peer2) => peer2 !== peer);
        } else {
          continue;
        }
      }

      await store.callSendLocalStream(stream, user.id);
    }
  }
};

export const isDesktop = !!window.HyalusDesktop;
export const isMobile = navigator.userAgent.includes("Mobile");
