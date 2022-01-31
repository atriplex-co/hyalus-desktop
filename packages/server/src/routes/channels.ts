import express from "express";
import {
  authRequest,
  channelNameValidator,
  cleanObject,
  dispatchSocket,
  getStatus,
  idValidator,
  messageDataValidator,
  messageKeysValidator,
  messageTypeValidator,
  processAvatar,
  validateRequest,
} from "../util";
import sodium from "libsodium-wrappers";
import { ChannelType, MessageType, SocketMessageType } from "common";
import Joi from "joi";
import { sockets } from "./ws";
import { ChannelModel, IChannelUser } from "../models/channel";
import { IMessage, MessageModel } from "../models/message";
import { FriendModel } from "../models/friend";
import { IUser, UserModel } from "../models/user";

const app = express.Router();

app.get(
  "/:id/messages",
  async (req: express.Request, res: express.Response) => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        params: {
          id: idValidator.required(),
        },
      })
    ) {
      return;
    }

    const channel = await ChannelModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.id)),
      users: {
        $elemMatch: {
          id: session.userId,
          hidden: false,
        },
      },
    });

    if (!channel) {
      res.status(400).json({
        error: "Invalid channel",
      });

      return;
    }

    const { added } = channel.users.find(
      (user) => !user.id.compare(session.userId)
    ) as IChannelUser;

    const messages = [];

    for (const message of await MessageModel.find({
      channelId: channel._id,
      created: {
        $lte: new Date(Number(req.query.before) || 1e8 * 24 * 60 * 60 * 1e3), //apparently, this is the max safe JS date.
        $gte: new Date(Math.max(Number(req.query.after) || 0, +added)),
      },
    })
      .sort({
        created: -1,
      })
      .limit(Math.min(Number(req.query.limit) || 100, 100))) {
      const key =
        message.keys &&
        message.keys.find((key) => !key.userId.compare(session.userId))?.data;

      messages.push({
        id: sodium.to_base64(message._id),
        userId: sodium.to_base64(message.userId),
        type: message.type,
        created: +message.created,
        updated: message.updated && +message.updated,
        data: message.data && sodium.to_base64(message.data),
        key: key && sodium.to_base64(key),
      });
    }

    res.json(messages);
  }
);

app.post(
  "/:id/messages",
  async (req: express.Request, res: express.Response) => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        params: {
          id: idValidator.required(),
        },
        body: {
          type: messageTypeValidator.required(),
          data: messageDataValidator.required(),
          keys: messageKeysValidator.required(),
        },
      })
    ) {
      return;
    }

    const channel = await ChannelModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.id)),
      users: {
        $elemMatch: {
          id: session.userId,
          hidden: false,
        },
      },
    });

    if (!channel) {
      res.status(400).json({
        error: "Invalid channel",
      });

      return;
    }

    if (
      new Set(req.body.keys.map((key: { userId: string }) => key.userId))
        .size !== req.body.keys.length
    ) {
      res.status(400).json({
        error: "Duplicated message keys",
      });

      return;
    }

    const keys: {
      userId: Buffer;
      data: Buffer;
    }[] = [];

    for (const key of req.body.keys) {
      keys.push({
        userId: Buffer.from(sodium.from_base64(key.userId)),
        data: Buffer.from(sodium.from_base64(key.data)),
      });
    }

    for (const user of channel.users.filter((u) => !u.hidden)) {
      if (!keys.find((k) => !k.userId.compare(user.id))) {
        res.status(400).json({
          error: `Missing keys for user ${sodium.to_base64(user.id)}`,
        });

        return;
      }
    }

    const message = await MessageModel.create({
      channelId: channel._id,
      userId: session.userId,
      type: req.body.type,
      data: Buffer.from(sodium.from_base64(req.body.data)),
      keys,
    });

    res.end();

    await Promise.all(
      keys.map((key) =>
        dispatchSocket({
          userId: key.userId,
          message: {
            t: SocketMessageType.SMessageCreate,
            d: {
              id: sodium.to_base64(message._id),
              channelId: sodium.to_base64(message.channelId),
              userId: sodium.to_base64(message.userId),
              type: message.type,
              created: +message.created,
              data: req.body.data,
              key: sodium.to_base64(key.data),
            },
          },
        })
      )
    );
  }
);

app.delete(
  "/:channelId/messages/:messageId",
  async (req: express.Request, res: express.Response) => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        params: {
          channelId: idValidator.required(),
          messageId: idValidator.required(),
        },
      })
    ) {
      return;
    }

    const channel = await ChannelModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.channelId)),
      users: {
        $elemMatch: {
          id: session.userId,
          hidden: false,
        },
      },
    });

    if (!channel) {
      res.status(400).json({
        error: "Invalid channel",
      });

      return;
    }

    const message = await MessageModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.messageId)),
      channelId: channel._id,
      userId: session.userId,
      type: {
        $in: [MessageType.Text, MessageType.Attachment],
      },
    });

    if (!message) {
      res.status(400).json({
        error: "Invalid message",
      });

      return;
    }

    await message.delete();
    res.end();

    const lastMessage = (await MessageModel.findOne({
      channelId: channel._id,
    }).sort({
      created: -1,
    })) as IMessage;

    for (const user of channel.users.filter((u) => !u.hidden)) {
      const key =
        lastMessage.keys &&
        lastMessage.keys.find((key) => !key.userId.compare(user.id))?.data;

      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SMessageDelete,
          d: {
            id: sodium.to_base64(message._id),
            channelId: sodium.to_base64(message.channelId),
            lastMessage: {
              id: sodium.to_base64(lastMessage._id),
              userId: sodium.to_base64(lastMessage.userId),
              type: lastMessage.type,
              created: +lastMessage.created,
              updated: lastMessage.updated && +lastMessage.updated,
              data: lastMessage.data && sodium.to_base64(lastMessage.data),
              key: key && sodium.to_base64(key),
            },
          },
        },
      });
    }
  }
);

app.post("/", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      body: {
        name: channelNameValidator.required(),
        userIds: Joi.array().items(idValidator).max(50).required(),
      },
    })
  ) {
    return;
  }

  const users = [];

  for (const _userId of req.body.userIds) {
    const userId = Buffer.from(sodium.from_base64(_userId));

    if (!session.userId.compare(userId)) {
      continue;
    }

    if (
      !(await FriendModel.findOne({
        $or: [
          {
            user1Id: session.userId,
            user2Id: userId,
          },
          {
            user1Id: userId,
            user2Id: session.userId,
          },
        ],
        accepted: true,
      }))
    ) {
      res.status(400).json({
        error: `Must be friends with user: ${userId}`,
      });

      return;
    }

    users.push(
      (await UserModel.findOne({
        _id: userId,
      })) as IUser
    );
  }

  users.push(
    (await UserModel.findOne({
      _id: session.userId,
    })) as IUser
  );

  const channel = await ChannelModel.create({
    type: ChannelType.Group,
    name: req.body.name,
    users: users.map((user) => ({
      id: user._id,
      owner: !user._id.compare(session.userId),
    })),
  });

  const groupCreateMessage = await MessageModel.create({
    channelId: channel._id,
    userId: session.userId,
    type: MessageType.GroupCreate,
  });

  for (const user of users) {
    await dispatchSocket({
      userId: user._id,
      message: {
        t: SocketMessageType.SChannelCreate,
        d: {
          id: sodium.to_base64(channel._id),
          type: channel.type,
          created: +channel.created,
          name: channel.name,
          owner: !user._id.compare(session.userId),
          users: await Promise.all(
            users
              .filter((user2) => user2._id.compare(user._id))
              .map(async (user2) => ({
                id: sodium.to_base64(user2._id),
                username: user2.username,
                name: user2.name,
                avatarId: user2.avatarId && sodium.to_base64(user2.avatarId),
                status: await getStatus(user2._id, user._id),
                publicKey: sodium.to_base64(user2.publicKey),
                hidden: false,
                inCall: false,
              }))
          ),
          lastMessage: {
            id: sodium.to_base64(groupCreateMessage._id),
            userId: sodium.to_base64(groupCreateMessage.userId),
            type: groupCreateMessage.type,
            created: +groupCreateMessage.created,
          },
        },
      },
    });
  }

  for (const user of users.slice(0, -1)) {
    const groupAddMessage = await MessageModel.create({
      channelId: channel._id,
      userId: session.userId,
      type: MessageType.GroupAdd,
      data: user._id,
    });

    for (const user2 of users) {
      await dispatchSocket({
        userId: user2._id,
        message: {
          t: SocketMessageType.SMessageCreate,
          d: {
            id: sodium.to_base64(groupAddMessage._id),
            channelId: sodium.to_base64(groupAddMessage.channelId),
            userId: sodium.to_base64(groupAddMessage.userId),
            type: groupAddMessage.type,
            created: +groupAddMessage.created,
            data: sodium.to_base64(user._id),
          },
        },
      });
    }
  }

  res.end();
});

app.post("/:id", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      params: {
        id: idValidator.required(),
      },
      body: {
        name: channelNameValidator,
      },
    })
  ) {
    return;
  }

  const channel = await ChannelModel.findOne({
    _id: Buffer.from(sodium.from_base64(req.params.id)),
    type: ChannelType.Group,
    users: {
      $elemMatch: {
        id: session.userId,
        hidden: false,
        owner: true,
      },
    },
  });

  if (!channel) {
    res.status(400).json({
      error: "Invalid channel",
    });

    return;
  }

  if (req.body.name) {
    channel.name = req.body.name;
    await channel.save();

    const groupNameMessage = await MessageModel.create({
      channelId: channel._id,
      userId: session.userId,
      type: MessageType.GroupName,
      data: Buffer.from(req.body.name),
    });

    for (const user of channel.users.filter((user) => !user.hidden)) {
      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SMessageCreate,
          d: {
            id: sodium.to_base64(groupNameMessage._id),
            channelId: sodium.to_base64(groupNameMessage.channelId),
            userId: sodium.to_base64(groupNameMessage.userId),
            type: groupNameMessage.type,
            created: +groupNameMessage.created,
            data: sodium.to_base64(req.body.name),
          },
        },
      });
    }
  }

  const publicUpdate = cleanObject({
    name: req.body.name,
  });

  if (Object.keys(publicUpdate).length) {
    for (const user of channel.users.filter((user) => !user.hidden)) {
      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SChannelUpdate,
          d: {
            id: sodium.to_base64(channel._id),
            ...publicUpdate,
          },
        },
      });
    }
  }

  res.end();
});

app.post("/:id/avatar", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      params: {
        id: idValidator.required(),
      },
    })
  ) {
    return;
  }

  const channel = await ChannelModel.findOne({
    _id: Buffer.from(sodium.from_base64(req.params.id)),
    type: ChannelType.Group,
    users: {
      $elemMatch: {
        id: session.userId,
        hidden: false,
        owner: true,
      },
    },
  });

  if (!channel) {
    res.status(400).json({
      error: "Invalid channel",
    });

    return;
  }

  channel.avatarId = await processAvatar(req, res);

  if (!channel.avatarId) {
    return;
  }

  await channel.save();

  const groupAvatarMessage = await MessageModel.create({
    channelId: channel._id,
    userId: session.userId,
    type: MessageType.GroupAvatar,
  });

  for (const user of channel.users.filter((user) => !user.hidden)) {
    await dispatchSocket({
      userId: user.id,
      message: {
        t: SocketMessageType.SChannelUpdate,
        d: {
          id: sodium.to_base64(channel._id),
          avatarId: sodium.to_base64(channel.avatarId),
        },
      },
    });

    await dispatchSocket({
      userId: user.id,
      message: {
        t: SocketMessageType.SMessageCreate,
        d: {
          id: sodium.to_base64(groupAvatarMessage._id),
          channelId: sodium.to_base64(groupAvatarMessage.channelId),
          userId: sodium.to_base64(groupAvatarMessage.userId),
          type: groupAvatarMessage.type,
          created: +groupAvatarMessage.created,
        },
      },
    });
  }
});

app.post("/:id/users", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      params: {
        id: idValidator.required(),
      },
      body: {
        id: idValidator.required(),
      },
    })
  ) {
    return;
  }

  const channel = await ChannelModel.findOne({
    _id: Buffer.from(sodium.from_base64(req.params.id)),
    type: ChannelType.Group,
    users: {
      $elemMatch: {
        id: session.userId,
        hidden: false,
      },
    },
  });

  if (!channel) {
    res.status(400).json({
      error: "Invalid channel",
    });

    return;
  }

  const targetUser = await UserModel.findOne({
    _id: Buffer.from(sodium.from_base64(req.body.id)),
  });

  if (
    !targetUser ||
    channel.users.find(
      (user) => !user.id.compare(targetUser._id) && !user.hidden
    ) ||
    !(await FriendModel.findOne({
      $or: [
        {
          user1Id: session.userId,
          user2Id: targetUser._id,
        },
        {
          user1Id: targetUser._id,
          user2Id: session.userId,
        },
      ],
      accepted: true,
    }))
  ) {
    res.status(400).json({
      error: "Invalid user",
    });

    return;
  }

  const oldChannelUser = channel.users.find(
    (user) => !user.id.compare(targetUser._id)
  );

  if (oldChannelUser) {
    oldChannelUser.hidden = false;
    oldChannelUser.added = new Date();

    await channel.save();

    for (const channelUser of channel.users.filter(
      (user) => !user.hidden && user.id.compare(targetUser._id)
    )) {
      await dispatchSocket({
        userId: channelUser.id,
        message: {
          t: SocketMessageType.SChannelUserUpdate,
          d: {
            id: sodium.to_base64(oldChannelUser.id),
            channelId: sodium.to_base64(channel._id),
            hidden: false,
          },
        },
      });
    }
  } else {
    channel.users.push({
      id: targetUser._id,
      hidden: false,
      owner: false,
      added: new Date(),
    });

    await channel.save();

    for (const channelUser of channel.users.filter(
      (user) => !user.hidden && user.id.compare(targetUser._id)
    )) {
      await dispatchSocket({
        userId: channelUser.id,
        message: {
          t: SocketMessageType.SChannelUserCreate,
          d: {
            id: sodium.to_base64(targetUser._id),
            channelId: sodium.to_base64(channel._id),
            username: targetUser.username,
            name: targetUser.name,
            avatarId:
              targetUser.avatarId && sodium.to_base64(targetUser.avatarId),
            status: await getStatus(targetUser._id, channelUser.id),
            publicKey: sodium.to_base64(targetUser.publicKey),
            hidden: false,
            lastTyping: 0,
            inCall: false,
          },
        },
      });
    }
  }

  const groupAddMessage = await MessageModel.create({
    channelId: channel._id,
    userId: session.userId,
    type: MessageType.GroupAdd,
    data: targetUser._id,
  });

  for (const channelUser of channel.users.filter(
    (user) => !user.hidden && user.id.compare(targetUser._id)
  )) {
    await dispatchSocket({
      userId: channelUser.id,
      message: {
        t: SocketMessageType.SMessageCreate,
        d: {
          id: sodium.to_base64(groupAddMessage._id),
          channelId: sodium.to_base64(groupAddMessage.channelId),
          userId: sodium.to_base64(groupAddMessage.userId),
          type: groupAddMessage.type,
          created: +groupAddMessage.created,
          data: req.body.id,
        },
      },
    });
  }

  const channelUsers = [];

  for (const channelUser of channel.users.filter((user) =>
    user.id.compare(targetUser._id)
  )) {
    const user = (await UserModel.findOne({
      _id: channelUser.id,
    })) as IUser;

    channelUsers.push({
      id: sodium.to_base64(user._id),
      username: user.username,
      name: user.name,
      avatarId: user.avatarId && sodium.to_base64(user.avatarId),
      publicKey: sodium.to_base64(user.publicKey),
      status: await getStatus(user._id, targetUser._id),
      hidden: channelUser.hidden,
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

  await dispatchSocket({
    userId: targetUser._id,
    message: {
      t: SocketMessageType.SChannelCreate,
      d: {
        id: sodium.to_base64(channel._id),
        type: channel.type,
        created: +channel.created,
        name: channel.name,
        avatarId: channel.avatarId && sodium.to_base64(channel.avatarId),
        users: channelUsers,
        lastMessage: {
          id: sodium.to_base64(groupAddMessage._id),
          userId: sodium.to_base64(groupAddMessage.userId),
          type: groupAddMessage.type,
          created: +groupAddMessage.created,
          data: req.body.id,
        },
      },
    },
  });

  res.end();
});

app.delete(
  "/:channelId/users/:userId",
  async (req: express.Request, res: express.Response) => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        params: {
          channelId: idValidator.required(),
          userId: idValidator.required(),
        },
      })
    ) {
      return;
    }

    const channel = await ChannelModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.channelId)),
      type: ChannelType.Group,
      users: {
        $elemMatch: {
          id: session.userId,
          hidden: false,
          owner: true,
        },
      },
    });

    if (!channel) {
      res.status(400).json({
        error: "Invalid channel",
      });

      return;
    }

    const channelUser = channel.users.find(
      (user) =>
        user.id.compare(session.userId) &&
        !user.id.compare(Buffer.from(sodium.from_base64(req.params.userId)))
    );

    if (!channelUser) {
      res.status(400).json({
        error: "Invalid user",
      });

      return;
    }

    channelUser.hidden = true;
    await channel.save();

    const groupRemoveMessage = await MessageModel.create({
      channelId: channel._id,
      userId: session.userId,
      type: MessageType.GroupRemove,
      data: channelUser.id,
    });

    const callSocket = sockets.find(
      (socket) =>
        socket.session &&
        !socket.session.userId.compare(channelUser.id) &&
        socket.callChannelId &&
        !socket.callChannelId.compare(channel._id)
    );

    if (callSocket) {
      callSocket.send({
        t: SocketMessageType.SCallReset,
      });
    }

    await dispatchSocket({
      userId: channelUser.id,
      message: {
        t: SocketMessageType.SChannelDelete,
        d: {
          id: sodium.to_base64(channel._id),
        },
      },
    });

    for (const user of channel.users.filter((user) => !user.hidden)) {
      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SChannelUserUpdate,
          d: {
            id: sodium.to_base64(channelUser.id),
            channelId: sodium.to_base64(channel._id),
            hidden: true,
          },
        },
      });

      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SMessageCreate,
          d: {
            id: sodium.to_base64(groupRemoveMessage._id),
            channelId: sodium.to_base64(groupRemoveMessage.channelId),
            userId: sodium.to_base64(groupRemoveMessage.userId),
            type: groupRemoveMessage.type,
            created: +groupRemoveMessage.created,
            data: sodium.to_base64(channelUser.id),
          },
        },
      });
    }

    res.end();
  }
);

app.delete("/:id", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      params: {
        id: idValidator.required(),
      },
    })
  ) {
    return;
  }

  const channel = await ChannelModel.findOne({
    _id: Buffer.from(sodium.from_base64(req.params.id)),
    type: ChannelType.Group,
    users: {
      $elemMatch: {
        id: session.userId,
        hidden: false,
      },
    },
  });

  if (!channel) {
    res.status(400).json({
      error: "Invalid channel",
    });

    return;
  }

  const channelUser = channel.users.find(
    (user) => !user.id.compare(session.userId)
  ) as IChannelUser;

  channelUser.hidden = true;
  await channel.save();

  const callSocket = sockets.find(
    (socket) =>
      socket.session &&
      !socket.session.userId.compare(channelUser.id) &&
      socket.callChannelId &&
      !socket.callChannelId.compare(channel._id)
  );

  if (callSocket) {
    callSocket.send({
      t: SocketMessageType.SCallReset,
    });
  }

  await dispatchSocket({
    userId: channelUser.id,
    message: {
      t: SocketMessageType.SChannelDelete,
      d: {
        id: sodium.to_base64(channel._id),
      },
    },
  });

  if (channel.users.find((user) => !user.hidden)) {
    const groupLeaveMessage = await MessageModel.create({
      channelId: channel._id,
      userId: channelUser.id,
      type: MessageType.GroupLeave,
    });

    for (const user of channel.users.filter((user) => !user.hidden)) {
      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SChannelUserUpdate,
          d: {
            id: sodium.to_base64(channelUser.id),
            channelId: sodium.to_base64(groupLeaveMessage.channelId),
            hidden: true,
          },
        },
      });

      await dispatchSocket({
        userId: user.id,
        message: {
          t: SocketMessageType.SMessageCreate,
          d: {
            id: sodium.to_base64(groupLeaveMessage._id),
            channelId: sodium.to_base64(groupLeaveMessage.channelId),
            userId: sodium.to_base64(groupLeaveMessage.userId),
            type: groupLeaveMessage.type,
            created: +groupLeaveMessage.created,
          },
        },
      });
    }

    if (channelUser.owner) {
      const newOwner = channel.users
        .filter((user) => !user.hidden)
        .sort((a, b) => (a.added > b.added ? 1 : -1))[0] as IChannelUser;

      newOwner.owner = true;
      await channel.save();

      await dispatchSocket({
        userId: newOwner.id,
        message: {
          t: SocketMessageType.SChannelUpdate,
          d: {
            id: sodium.to_base64(channel._id),
            owner: true,
          },
        },
      });
    }
  } else {
    await channel.delete();
    await MessageModel.deleteMany({
      channelId: channel._id,
    });
  }

  res.end();
});

app.post(
  "/:channelId/messages/:messageId/data",
  async (req: express.Request, res: express.Response) => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        params: {
          channelId: idValidator.required(),
          messageId: idValidator.required(),
        },
        body: {
          data: messageDataValidator.required(),
          keys: messageKeysValidator.required(),
        },
      })
    ) {
      return;
    }

    const channel = await ChannelModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.channelId)),
      users: {
        $elemMatch: {
          id: session.userId,
          hidden: false,
        },
      },
    });

    if (!channel) {
      res.status(400).json({
        error: "Invalid channel",
      });

      return;
    }

    const message = await MessageModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.messageId)),
      userId: session.userId,
      channelId: channel._id,
      type: {
        $in: [MessageType.Text],
      },
    });

    if (!message) {
      res.status(400).json({
        error: "Invalid message",
      });

      return;
    }

    if (
      new Set(req.body.keys.map((key: { userId: string }) => key.userId))
        .size !== req.body.keys.length
    ) {
      res.status(400).json({
        error: "Duplicated message keys",
      });

      return;
    }

    const keys: {
      userId: Buffer;
      data: Buffer;
    }[] = [];

    for (const key of req.body.keys) {
      keys.push({
        userId: Buffer.from(sodium.from_base64(key.userId)),
        data: Buffer.from(sodium.from_base64(key.data)),
      });
    }

    for (const user of channel.users.filter((u) => !u.hidden)) {
      if (!keys.find((k) => !k.userId.compare(user.id))) {
        res.status(400).json({
          error: `Missing keys for user ${sodium.to_base64(user.id)}`,
        });

        return;
      }
    }

    message.updated = new Date();
    message.data = Buffer.from(sodium.from_base64(req.body.data));
    message.keys = keys;

    await message.save();

    res.end();

    for (const key of keys) {
      await dispatchSocket({
        userId: key.userId,
        message: {
          t: SocketMessageType.SMessageUpdate,
          d: {
            id: sodium.to_base64(message._id),
            channelId: sodium.to_base64(message.channelId),
            updated: +message.updated,
            data: req.body.data,
            key: sodium.to_base64(key.data),
          },
        },
      });
    }
  }
);

export default app;
