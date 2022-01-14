import express, { Request, Response } from "express";
import sodium from "libsodium-wrappers";
import {
  authKeyValidator,
  encryptedPrivateKeyValidator,
  publicKeyValidator,
  saltValidator,
  Session,
  User,
  usernameValidator,
  validateRequest,
} from "../util";

const app = express.Router();

app.post("/", async (req: Request, res: Response): Promise<void> => {
  if (
    !validateRequest(req, res, {
      body: {
        username: usernameValidator.required(),
        salt: saltValidator.required(),
        authKey: authKeyValidator.required(),
        publicKey: publicKeyValidator.required(),
        encryptedPrivateKey: encryptedPrivateKeyValidator.required(),
      },
    })
  ) {
    return;
  }

  req.body.username = req.body.username.toLowerCase();

  if (
    await User.findOne({
      username: req.body.username,
    })
  ) {
    res.status(400).json({
      error: "Username already in use",
    });

    return;
  }

  const user = await User.create({
    username: req.body.username,
    salt: Buffer.from(sodium.from_base64(req.body.salt)),
    authKey: Buffer.from(sodium.from_base64(req.body.authKey)),
    publicKey: Buffer.from(sodium.from_base64(req.body.publicKey)),
    encryptedPrivateKey: Buffer.from(
      sodium.from_base64(req.body.encryptedPrivateKey)
    ),
  });

  const session = await Session.create({
    userId: user._id,
    ip: req.ip,
    agent: req.headers["user-agent"],
  });

  res.json({
    token: sodium.to_base64(session.token),
  });
});

app.get("/:username", async (req: Request, res: Response): Promise<void> => {
  if (
    !validateRequest(req, res, {
      params: {
        username: usernameValidator.required(),
      },
    })
  ) {
    return;
  }

  const user = await User.findOne({
    username: req.params.username,
  });

  if (!user) {
    res.status(404).json({
      error: "Invalid username",
    });

    return;
  }

  res.json({
    id: sodium.to_base64(user._id),
    username: user.username,
    name: user.name,
    avatarId: user.avatarId ? sodium.to_base64(user.avatarId) : null,
    publicKey: sodium.to_base64(user.publicKey),
  });
});

export default app;
