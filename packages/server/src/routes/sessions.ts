import express, { Request, Response } from "express";
import sodium from "libsodium-wrappers";
import {
  User,
  Session,
  authKeySchema,
  authRequest,
  idSchema,
  totpCodeSchema,
  usernameSchema,
  validateRequest,
  checkTotpCode,
  dispatchSocket,
} from "../util";
import { SocketMessageType } from "common";

const app = express.Router();

app.post("/", async (req: Request, res: Response): Promise<void> => {
  if (
    !validateRequest(req, res, {
      body: {
        username: usernameSchema.required(),
        authKey: authKeySchema,
        totpCode: totpCodeSchema,
      },
    })
  ) {
    return;
  }

  const user = await User.findOne({
    username: req.body.username.toLowerCase(),
  });

  if (!user) {
    res.status(400).json({
      error: "Invalid username",
    });

    return;
  }

  if (!req.body.authKey) {
    res.json({
      salt: sodium.to_base64(user.salt),
    });

    return;
  }

  if (user.authKey.compare(sodium.from_base64(req.body.authKey))) {
    res.status(400).json({
      error: "Invalid password",
    });

    return;
  }

  if (user.totpSecret) {
    if (!req.body.totpCode) {
      res.json({
        totpRequired: true,
      });

      return;
    }

    if (!checkTotpCode(user.totpSecret, req.body.totpCode)) {
      res.status(400).json({
        error: "Invalid TOTP code",
      });

      return;
    }
  }

  const session = await Session.create({
    userId: user._id,
    ip: req.ip,
    agent: req.headers["user-agent"],
  });

  await dispatchSocket({
    userId: user._id,
    message: {
      t: SocketMessageType.SSessionCreate,
      d: {
        id: sodium.to_base64(session._id),
        ip: session.ip,
        agent: session.agent,
        created: +session.created,
      },
    },
  });

  res.json({
    token: sodium.to_base64(session.token),
    publicKey: sodium.to_base64(user.publicKey),
    encryptedPrivateKey: sodium.to_base64(user.encryptedPrivateKey),
  });
});

app.delete("/", async (req: Request, res: Response): Promise<void> => {
  const session = await authRequest(req, res);

  if (!session) {
    return;
  }

  await session.delete();

  await dispatchSocket({
    sessionId: session._id,
    message: {
      t: SocketMessageType.SReset,
    },
  });

  await dispatchSocket({
    userId: session.userId,
    message: {
      t: SocketMessageType.SSessionDelete,
      d: {
        id: sodium.to_base64(session._id),
      },
    },
  });
});

app.delete(
  "/:sessionId",
  async (req: Request, res: Response): Promise<void> => {
    const reqSession = await authRequest(req, res);

    if (
      !reqSession ||
      !validateRequest(req, res, {
        params: {
          sessionId: idSchema.required(),
        },
      })
    ) {
      return;
    }

    const session = await Session.findOneAndDelete({
      _id: Buffer.from(sodium.from_base64(req.params.sessionId)),
      userId: reqSession.userId,
    });

    if (!session) {
      res.status(404).json({
        error: "Invalid session",
      });

      return;
    }

    await dispatchSocket({
      sessionId: session._id,
      message: {
        t: SocketMessageType.SReset,
      },
    });

    await dispatchSocket({
      userId: session.userId,
      message: {
        t: SocketMessageType.SSessionDelete,
        d: {
          id: sodium.to_base64(session._id),
        },
      },
    });
  }
);

export default app;
