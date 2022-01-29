import { ChannelType } from "common";
import mongoose from "mongoose";
import { generateId } from "../util";

export interface IChannel {
  _id: Buffer;
  type: ChannelType;
  created: Date;
  name?: string;
  avatarId?: Buffer;
  users: IChannelUser[];
}

export interface IChannelUser {
  id: Buffer;
  owner: boolean;
  hidden: boolean;
  added: Date;
}

export const ChannelSchema = new mongoose.Schema<IChannel>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  type: {
    type: Number,
    required: true,
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  name: {
    type: String,
  },
  avatarId: {
    type: Buffer.alloc(0),
  },
  users: [
    new mongoose.Schema<IChannelUser>({
      id: {
        type: Buffer.alloc(0),
        required: true,
      },
      owner: {
        type: Boolean,
        required: true,
        default() {
          return false;
        },
      },
      hidden: {
        type: Boolean,
        required: true,
        default() {
          return false;
        },
      },
      added: {
        type: Date,
        required: true,
        default() {
          return new Date();
        },
      },
    }),
  ],
});

export const ChannelModel = mongoose.model<IChannel>("Channel", ChannelSchema);
