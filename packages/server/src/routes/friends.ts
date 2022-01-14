import express from "express";
import {
  authRequest,
  validateRequest,
  usernameValidator,
  User,
  Friend,
  idValidator,
  Channel,
  IUser,
  getStatus,
  dispatchSocket,
  Message,
} from "../util";
import sodium from "libsodium-wrappers";
import Joi from "joi";
import { ChannelType, MessageType, SocketMessageType, Status } from "common";

const app = express.Router();

app.post("/", async (req: express.Request, res: express.Response) => {
  const session = await authRequest(req, res);

  if (
    !session ||
    !validateRequest(req, res, {
      body: {
        username: usernameValidator.required(),
      },
    })
  ) {
    return;
  }

  const reqUser = (await User.findOne({
    _id: session.userId,
  })) as IUser;

  const targetUser = await User.findOne({
    _id: {
      $ne: session.userId,
    },
    username: req.body.username.toLowerCase(),
  });

  if (!targetUser) {
    res.status(400).json({
      error: "User not found",
    });

    return;
  }

  if (
    await Friend.findOne({
      $or: [
        {
          user1Id: reqUser._id,
          user2Id: targetUser._id,
        },
        {
          user1Id: targetUser._id,
          user2Id: reqUser._id,
        },
      ],
    })
  ) {
    res.status(400).json({
      error: "Friend or friend request already exists",
    });

    return;
  }

  await Friend.create({
    user1Id: reqUser._id,
    user2Id: targetUser._id,
  });

  res.end();

  await dispatchSocket({
    userId: reqUser._id,
    message: {
      t: SocketMessageType.SFriendCreate,
      d: {
        id: sodium.to_base64(targetUser._id),
        username: targetUser.username,
        name: targetUser.name,
        publicKey: sodium.to_base64(targetUser.publicKey),
        avatarId: targetUser.avatarId && sodium.to_base64(targetUser.avatarId),
        status: Status.Offline,
        acceptable: false,
      },
    },
  });

  await dispatchSocket({
    userId: targetUser._id,
    message: {
      t: SocketMessageType.SFriendCreate,
      d: {
        id: sodium.to_base64(reqUser._id),
        username: reqUser.username,
        name: reqUser.name,
        publicKey: sodium.to_base64(reqUser.publicKey),
        avatarId: reqUser.avatarId && sodium.to_base64(reqUser.avatarId),
        status: Status.Offline,
        acceptable: true,
      },
    },
  });
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
        accepted: Joi.bool().required(),
      },
    })
  ) {
    return;
  }

  const friend = await Friend.findOne({
    $or: [
      {
        user1Id: session.userId,
        user2Id: Buffer.from(sodium.from_base64(req.params.id)),
      },
      {
        user1Id: Buffer.from(sodium.from_base64(req.params.id)),
        user2Id: session.userId,
      },
    ],
  });

  if (!friend) {
    res.status(404).json({
      error: "Invalid friend",
    });

    return;
  }

  if (!req.body.accepted) {
    await friend.delete();

    await dispatchSocket({
      userId: friend.user1Id,
      message: {
        t: SocketMessageType.SFriendDelete,
        d: {
          id: sodium.to_base64(friend.user2Id),
        },
      },
    });

    await dispatchSocket({
      userId: friend.user2Id,
      message: {
        t: SocketMessageType.SFriendDelete,
        d: {
          id: sodium.to_base64(friend.user1Id),
        },
      },
    });
  }

  if (
    req.body.accepted &&
    !friend.user2Id.compare(session.userId) &&
    !friend.accepted
  ) {
    friend.accepted = true;
    await friend.save();

    await dispatchSocket({
      userId: friend.user1Id,
      message: {
        t: SocketMessageType.SFriendUpdate,
        d: {
          id: sodium.to_base64(friend.user2Id),
          accepted: true,
          acceptable: false,
          status: await getStatus(friend.user2Id, friend.user1Id),
        },
      },
    });

    await dispatchSocket({
      userId: friend.user2Id,
      message: {
        t: SocketMessageType.SFriendUpdate,
        d: {
          id: sodium.to_base64(friend.user1Id),
          accepted: true,
          acceptable: false,
          status: await getStatus(friend.user1Id, friend.user2Id),
        },
      },
    });

    let channel = await Channel.findOne({
      type: ChannelType.Private,
      $and: [
        {
          users: {
            $elemMatch: {
              id: friend.user1Id,
            },
          },
        },
        {
          users: {
            $elemMatch: {
              id: friend.user2Id,
            },
          },
        },
      ],
    });
    const channelSynced = !!channel;

    if (!channel) {
      channel = await Channel.create({
        type: ChannelType.Private,
        users: [
          {
            id: friend.user1Id,
          },
          {
            id: friend.user2Id,
          },
        ],
      });
    }

    const friendAcceptMessage = await Message.create({
      channelId: channel._id,
      userId: session.userId,
      type: MessageType.FriendAccept,
    });

    if (channelSynced) {
      for (const user of channel.users) {
        await dispatchSocket({
          userId: user.id,
          message: {
            t: SocketMessageType.SMessageCreate,
            d: {
              id: sodium.to_base64(friendAcceptMessage._id),
              channelId: sodium.to_base64(friendAcceptMessage.channelId),
              userId: sodium.to_base64(friendAcceptMessage.userId),
              type: friendAcceptMessage.type,
              created: +friendAcceptMessage.created,
            },
          },
        });
      }
    } else {
      const user1 = (await User.findOne({
        _id: friend.user1Id,
      })) as IUser;

      const user2 = (await User.findOne({
        _id: friend.user2Id,
      })) as IUser;

      await dispatchSocket({
        userId: friend.user1Id,
        message: {
          t: SocketMessageType.SChannelCreate,
          d: {
            id: sodium.to_base64(channel._id),
            type: channel.type,
            created: channel.created,
            name: channel.name,
            avatarId: channel.avatarId,
            owner: false,
            users: [
              {
                id: sodium.to_base64(user2._id),
                name: user2.name,
                username: user2.username,
                avatarId: user2.avatarId && sodium.to_base64(user2.avatarId),
                publicKey: sodium.to_base64(user2.publicKey),
                status: await getStatus(user2._id, session.userId),
                hidden: false,
                lastTyping: 0,
                inCall: false,
              },
            ],
            lastMessage: {
              id: sodium.to_base64(friendAcceptMessage._id),
              userId: sodium.to_base64(friendAcceptMessage.userId),
              type: friendAcceptMessage.type,
              created: +friendAcceptMessage.created,
            },
          },
        },
      });

      await dispatchSocket({
        userId: friend.user2Id,
        message: {
          t: SocketMessageType.SChannelCreate,
          d: {
            id: sodium.to_base64(channel._id),
            type: channel.type,
            created: channel.created,
            name: channel.name,
            avatarId: channel.avatarId,
            owner: false,
            users: [
              {
                id: sodium.to_base64(user1._id),
                name: user1.name,
                username: user1.username,
                avatarId: user1.avatarId && sodium.to_base64(user1.avatarId),
                publicKey: sodium.to_base64(user1.publicKey),
                status: await getStatus(user1._id, session.userId),
                hidden: false,
                lastTyping: 0,
                inCall: false,
              },
            ],
            lastMessage: {
              id: sodium.to_base64(friendAcceptMessage._id),
              userId: sodium.to_base64(friendAcceptMessage.userId),
              type: friendAcceptMessage.type,
              created: +friendAcceptMessage.created,
            },
          },
        },
      });
    }
  }

  res.end();
});

export default app;
