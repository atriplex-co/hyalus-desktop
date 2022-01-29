import { AvatarType } from "common";
import mongoose from "mongoose";
import { generateId } from "../util";

export interface IAvatar {
  _id: Buffer;
  versions: IAvatarVersion[];
}

export interface IAvatarVersion {
  type: AvatarType;
  data: Buffer;
}

export const AvatarSchema = new mongoose.Schema<IAvatar>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  versions: {
    type: [
      {
        type: {
          type: Number,
          required: true,
        },
        data: {
          type: Buffer.alloc(0),
          required: true,
        },
      },
    ],
    required: true,
  },
});

export const AvatarModel = mongoose.model<IAvatar>("Avatar", AvatarSchema);
