import { MessageType } from "common";
import mongoose from "mongoose";
import { generateId } from "../util";

export interface IMessage {
  _id: Buffer;
  channelId: Buffer;
  userId: Buffer;
  type: MessageType;
  created: Date;
  updated?: Date;
  data?: Buffer;
  keys: IMessageKey[];
}

export interface IMessageKey {
  userId: Buffer;
  data: Buffer;
}

export const MessageSchema = new mongoose.Schema<IMessage>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  channelId: {
    type: Buffer.alloc(0),
    required: true,
  },
  userId: {
    type: Buffer.alloc(0),
    required: true,
  },
  type: {
    type: Number,
    required: true,
  },
  created: {
    type: Date,
    default() {
      return new Date();
    },
  },
  updated: {
    type: Date,
  },
  data: {
    type: Buffer.alloc(0),
  },
  keys: {
    type: [
      new mongoose.Schema<IMessageKey>({
        userId: {
          type: Buffer.alloc(0),
          required: true,
        },
        data: {
          type: Buffer.alloc(0),
          required: true,
        },
      }),
    ],
    default: undefined,
  },
});

export const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
