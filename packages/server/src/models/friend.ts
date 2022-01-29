import mongoose from "mongoose";
import { generateId } from "../util";

export interface IFriend {
  _id: Buffer;
  user1Id: Buffer;
  user2Id: Buffer;
  accepted: boolean;
}

export const FriendSchema = new mongoose.Schema<IFriend>({
  _id: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateId();
    },
  },
  user1Id: {
    type: Buffer.alloc(0),
    required: true,
    ref: "User",
  },
  user2Id: {
    type: Buffer.alloc(0),
    required: true,
    ref: "User",
  },
  accepted: {
    type: Boolean,
    required: true,
    default() {
      return false;
    },
  },
});

export const FriendModel = mongoose.model<IFriend>("Friend", FriendSchema);
