import { ColorTheme, Status } from "common";
import mongoose from "mongoose";
import { generateId } from "../util";

export interface IUser {
  _id: Buffer;
  created: Date;
  username: string;
  name: string;
  salt: Buffer;
  authKey: Buffer;
  authKeyUpdated: Date;
  publicKey: Buffer;
  encryptedPrivateKey: Buffer;
  avatarId?: Buffer;
  typingEvents: boolean;
  colorTheme: ColorTheme;
  wantStatus: Status;
  totpSecret?: Buffer;
}

export const UserSchema = new mongoose.Schema<IUser>({
  _id: {
    type: Buffer.alloc(0), //idk why tf we have to do this.
    required: true,
    default() {
      return generateId();
    },
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    default(): string {
      return (this as unknown as IUser).username; //this is the IDE-recommended solution- no really, it is.
    },
  },
  salt: {
    type: Buffer.alloc(0),
    required: true,
  },
  authKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  authKeyUpdated: {
    type: Date,
    required: true,
    default(): Date {
      return (this as unknown as IUser).created;
    },
  },
  publicKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  encryptedPrivateKey: {
    type: Buffer.alloc(0),
    required: true,
  },
  avatarId: {
    type: Buffer.alloc(0),
  },
  typingEvents: {
    type: Boolean,
    required: true,
    default() {
      return true;
    },
  },
  colorTheme: {
    type: Number,
    required: true,
    default() {
      return ColorTheme.Green;
    },
  },
  wantStatus: {
    type: Number,
    required: true,
    default() {
      return Status.Online;
    },
  },
  totpSecret: {
    type: Buffer.alloc(0),
  },
});

export const UserModel = mongoose.model<IUser>("User", UserSchema);
