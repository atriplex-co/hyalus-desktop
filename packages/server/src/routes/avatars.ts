import express from "express";
import { Avatar, avatarIdSchema, validateRequest } from "../util";
import sodium from "libsodium-wrappers";

const app = express.Router();

app.get(
  "/:avatarId",
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (
      !validateRequest(req, res, {
        params: {
          avatarId: avatarIdSchema.required(),
        },
      })
    ) {
      return;
    }

    const avatar = await Avatar.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.avatarId)),
    });

    if (!avatar) {
      res.status(404).json({
        error: "Invalid avatar",
      });

      return;
    }

    res.header("cache-control", "public, max-age=31536000");
    res.header("content-type", avatar.type);
    res.send(avatar.data);
  }
);

export default app;
