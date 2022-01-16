import {
  AvatarType,
  ChannelType,
  MessageType,
  PushProtocol,
  SocketMessageType,
} from "common";
import { idbGet } from "../global/idb";
import { IConfig } from "../global/types";
import sodium from "libsodium-wrappers";
import ImageIcon from "../assets/images/icon-background.png";

const _self = self as unknown as ServiceWorkerGlobalScope;

_self.addEventListener("fetch", () => {
  //
});

_self.addEventListener("push", (e: PushEvent) => {
  const main = async () => {
    const msg = e.data?.json() as {
      t: number;
      d: unknown;
      p: number;
      e: unknown;
    };

    console.debug("push/rx: %o", msg);

    if (msg.p !== PushProtocol) {
      return;
    }

    const config = await idbGet<IConfig>("config");

    if (!config || !config.privateKey) {
      return;
    }

    if (msg.t === SocketMessageType.SMessageCreate) {
      const data = msg.d as {
        id: string;
        channelId: string;
        userId: string;
        type: MessageType;
        created: number;
        data: string;
        key: string;
      };

      const extra = msg.e as {
        channel: {
          type: ChannelType;
          name?: string;
        };
        user: {
          name: string;
          avatarId?: string;
          publicKey: string;
        };
      };

      const messageData = sodium.from_base64(data.data);
      const messageKey = sodium.from_base64(data.key);

      const messageKeyDecrypted = sodium.crypto_box_open_easy(
        messageKey.slice(sodium.crypto_box_NONCEBYTES),
        messageKey.slice(0, sodium.crypto_box_NONCEBYTES),
        sodium.from_base64(extra.user.publicKey),
        config.privateKey
      );

      const messageDataDecrypted = sodium.crypto_secretbox_open_easy(
        messageData.slice(sodium.crypto_secretbox_NONCEBYTES),
        messageData.slice(0, sodium.crypto_secretbox_NONCEBYTES),
        messageKeyDecrypted,
        "text"
      );

      let title = extra.user.name;
      if (extra.channel.type === ChannelType.Group) {
        title += ` (${extra.channel.name})`;
      }

      let icon = ImageIcon;
      if (extra.user.avatarId) {
        icon = `/api/avatars/${extra.user.avatarId}/${AvatarType.WEBP}`;
      }

      await _self.registration.showNotification(title, {
        icon,
        body: messageDataDecrypted,
        silent: !config.notifySound,
        timestamp: data.created,
      });
    }
  };

  e.waitUntil(main());
});
