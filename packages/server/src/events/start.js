const Joi = require("joi");
const { ObjectId } = require("mongodb");

module.exports = async (ws, msg) => {
  if (
    Joi.string()
      .required()
      .length(44)
      .base64()
      .validate(msg.token).error
  ) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-data",
      },
    });

    return ws.close();
  }

  const session = await ws.deps.db.collection("sessions").findOne({
    token: Buffer.from(msg.token, "base64"),
  });

  if (!session) {
    ws.send({
      t: "close",
      d: {
        reason: "invalid-auth",
        reset: true,
      },
    });

    return ws.close();
  }

  ws.session = session;

  const user = await ws.deps.db.collection("users").findOne({
    _id: session.user,
  });

  const formattedUser = {
    id: user._id.toString(),
    name: user.name,
    avatar: user.avatar?.toString(),
    username: user.username,
    totpEnabled: Boolean(user.totpSecret),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accentColor: user.accentColor,
  };

  const friends = await (
    await ws.deps.db.collection("friends").find({
      $or: [
        {
          initiator: ws.session.user,
        },
        {
          target: ws.session.user,
        },
      ],
    })
  ).toArray();

  const formattedFriends = [];

  for (const friend of friends) {
    let userId;

    if (friend.initiator.equals(ws.session.user)) {
      userId = friend.target;
    }

    if (friend.target.equals(ws.session.user)) {
      userId = friend.initiator;
    }

    const user = await ws.deps.db.collection("users").findOne({
      _id: userId,
    });

    formattedFriends.push({
      id: friend._id.toString(),
      user: {
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar?.toString(),
        username: user.username,
      },
      accepted: friend.accepted,
      acceptable: !friend.accepted && friend.target.equals(ws.session.user),
      updatedAt: friend.updatedAt,
    });
  }

  const channels = await (
    await ws.deps.db.collection("channels").find({
      users: {
        $elemMatch: {
          id: ws.session.user,
          removed: false,
        },
      },
    })
  ).toArray();

  const formattedChannels = [];

  for (const channel of channels) {
    const users = [];

    for (const channelUserMeta of channel.users) {
      if (ws.session.user.equals(channelUserMeta.id)) {
        continue;
      }

      const user = await ws.deps.db.collection("users").findOne({
        _id: channelUserMeta.id,
      });

      const voiceWs = [...ws.deps.wss.clients].find(
        (w) =>
          w.voiceChannel &&
          w.voiceChannel.equals(channel._id) &&
          w.session.user.equals(user._id)
      );

      const typingChannel = await ws.deps.redis.get(
        `typing_channel:${user._id}`
      );

      let lastTyping;

      if (channel._id.equals(typingChannel)) {
        lastTyping = await ws.deps.redis.get(`typing_time:${user._id}`);
      }

      users.push({
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar?.toString(),
        username: user.username,
        publicKey: user.publicKey.buffer,
        removed: channelUserMeta.removed,
        voiceConnected: Boolean(voiceWs),
        lastTyping: lastTyping ? Number(lastTyping) : 0,
      });
    }

    const lastMessage = await ws.deps.db.collection("messages").findOne(
      {
        channel: channel._id,
        $or: [
          {
            keys: null,
          },
          {
            keys: {
              $elemMatch: {
                id: ws.session.user,
              },
            },
          },
        ],
      },
      {
        sort: {
          time: -1,
        },
      }
    );

    if (lastMessage?.keys) {
      lastMessage.key = lastMessage.keys.find((k) =>
        k.id.equals(ws.session.user)
      ).key.buffer;
    }

    let body = lastMessage?.body;

    if (body?.buffer) {
      body = body.toString("base64");
    }

    if (body instanceof ObjectId) {
      body = body.toString();
    }

    formattedChannels.push({
      id: channel._id.toString(),
      type: channel.type,
      name: channel.name,
      avatar: channel.avatar?.toString(),
      writable: channel.writable,
      created: channel.created,
      admin: channel.users.find((u) => u.id.equals(ws.session.user)).admin,
      users: users,
      lastMessage: lastMessage && {
        id: lastMessage._id.toString(),
        time: lastMessage.time,
        type: lastMessage.type,
        sender: lastMessage.sender.toString(),
        body,
        fileName: lastMessage.fileName?.buffer,
        fileType: lastMessage.fileType?.buffer,
        fileLength: lastMessage.fileLength,
        key: lastMessage.key,
      },
    });
  }

  ws.send({
    t: "ready",
    d: {
      user: formattedUser,
      friends: formattedFriends,
      channels: formattedChannels,
    },
  });

  ws.deps.redisSub.subscribe(`ws:${ws.id}`);
  ws.deps.redisSub.subscribe(`user:${ws.session.user}`);
  ws.deps.redisSub.subscribe(`session:${ws.session._id}`);
};
