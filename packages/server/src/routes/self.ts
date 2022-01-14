import express from "express";
import Joi from "joi";
import {
  authKeyValidator,
  authRequest,
  checkTotpCode,
  colorThemeValidator,
  encryptedPrivateKeyValidator,
  nameValidator,
  wantStatusValidator,
  processAvatar,
  saltValidator,
  Session,
  totpCodeValidator,
  totpSecretValidator,
  typingEventsValidator,
  User,
  usernameValidator,
  validateRequest,
  dispatchSocket,
  cleanObject,
  propagateStatusUpdate,
} from "../util";
import sodium from "libsodium-wrappers";
import { SocketMessageType } from "common";

const app = express.Router();

app.post(
  "/",
  async (req: express.Request, res: express.Response): Promise<void> => {
    const session = await authRequest(req, res);

    if (
      !session ||
      !validateRequest(req, res, {
        body: {
          username: usernameValidator,
          name: nameValidator,
          typingEvents: typingEventsValidator,
          colorTheme: colorThemeValidator,
          wantStatus: wantStatusValidator,
          authKey: Joi.object({
            authKey: authKeyValidator.required(),
            new: authKeyValidator.required(),
            salt: saltValidator.required(),
            encryptedPrivateKey: encryptedPrivateKeyValidator.required(),
          }),
          totp: Joi.object({
            authKey: authKeyValidator.required(),
            totpSecret: totpSecretValidator,
            totpCode: totpCodeValidator,
          }),
        },
      })
    ) {
      return;
    }

    const user = await User.findOne({
      _id: session.userId,
    });

    if (!user) {
      return;
    }

    if (req.body.username) {
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

      user.username = req.body.username;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.typingEvents !== undefined) {
      user.typingEvents = req.body.typingEvents;
    }

    if (req.body.colorTheme !== undefined) {
      user.colorTheme = req.body.colorTheme;
    }

    if (req.body.wantStatus !== undefined) {
      user.wantStatus = req.body.wantStatus;
    }

    if (req.body.authKey) {
      if (
        user.authKey.compare(
          Buffer.from(sodium.from_base64(req.body.authKey.authKey))
        )
      ) {
        res.status(400).json({
          error: "Invalid password",
        });

        return;
      }

      user.authKey = Buffer.from(sodium.from_base64(req.body.authKey.new));
      user.salt = Buffer.from(sodium.from_base64(req.body.authKey.salt));
      user.encryptedPrivateKey = Buffer.from(
        sodium.from_base64(req.body.authKey.encryptedPrivateKey)
      );

      for (const session2 of await Session.find({
        userId: user._id,
        _id: {
          $ne: session._id,
        },
      })) {
        await session2.delete();

        await dispatchSocket({
          sessionId: session2._id,
          message: {
            t: SocketMessageType.SReset,
          },
        });
      }
    }

    if (req.body.totp) {
      if (
        user.authKey.compare(
          Buffer.from(sodium.from_base64(req.body.totp.authKey))
        )
      ) {
        res.status(400).json({
          error: "Invalid password",
        });

        return;
      }

      if (req.body.totp.totpSecret) {
        const totpSecret = Buffer.from(
          sodium.from_base64(req.body.totp.totpSecret)
        );

        if (!checkTotpCode(totpSecret, req.body.totp.totpCode)) {
          res.status(400).json({
            error: "Invalid TOTP code",
          });

          return;
        }

        user.totpSecret = totpSecret;
      } else {
        user.totpSecret = undefined;
      }
    }

    await user.save();
    res.end();

    const selfUpdate = cleanObject({
      username: req.body.username,
      name: req.body.name,
      typingEvents: req.body.typingEvents,
      colorTheme: req.body.colorTheme,
      totpEnabled: req.body.totp && !!user.totpSecret,
      wantStatus: req.body.wantStatus,
    });

    if (Object.keys(selfUpdate).length) {
      await dispatchSocket({
        userId: user._id,
        message: {
          t: SocketMessageType.SSelfUpdate,
          d: selfUpdate,
        },
      });
    }

    const relatedUserUpdate = cleanObject({
      id: sodium.to_base64(user._id),
      username: req.body.username,
      name: req.body.name,
    });

    if (Object.keys(relatedUserUpdate).length) {
      await dispatchSocket({
        related: {
          userId: user._id,
          channels: true,
          friends: true,
        },
        message: {
          t: SocketMessageType.SForeignUserUpdate,
          d: relatedUserUpdate,
        },
      });
    }

    if (req.body.wantStatus !== undefined) {
      await propagateStatusUpdate(user._id);
    }
  }
);

app.post(
  "/avatar",
  async (req: express.Request, res: express.Response): Promise<void> => {
    const session = await authRequest(req, res);

    if (!session) {
      return;
    }

    const avatarId = await processAvatar(req, res);

    if (!avatarId) {
      return;
    }

    const user = await User.findOne({
      _id: session.userId,
    });

    if (!user) {
      return;
    }

    user.avatarId = avatarId;

    await user.save();
    res.end();

    await dispatchSocket({
      userId: user._id,
      message: {
        t: SocketMessageType.SSelfUpdate,
        d: {
          avatarId: sodium.to_base64(avatarId),
        },
      },
    });

    await dispatchSocket({
      related: {
        userId: user._id,
        friends: true,
        channels: true,
      },
      message: {
        t: SocketMessageType.SForeignUserUpdate,
        d: {
          id: sodium.to_base64(user._id),
          avatarId: sodium.to_base64(avatarId),
        },
      },
    });
  }
);

export default app;
