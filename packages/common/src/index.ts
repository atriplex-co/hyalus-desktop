export const SocketProtocol = 6;
export const PushProtocol = 1;
export const MaxAvatarWidth = 256;
export const MaxAvatarFPS = 30;
export const MaxAvatarDuration = 10;
export const MaxFileSize = 1024 * 1024 * 200;
export const MaxFileChunkSize = 1024 * 1024 * 2;

export enum ChannelType {
  Private = 0,
  Group = 1,
}

export enum MessageType {
  Text = 0,
  Attachment = 1,
  FriendAccept = 2,
  GroupCreate = 3,
  GroupAdd = 4,
  GroupRemove = 5,
  GroupName = 6,
  GroupAvatar = 7,
  GroupLeave = 8,
}

export enum SocketMessageType {
  CStart = 0,
  CChannelTyping = 1,
  CFileChunkOwned = 2,
  CFileChunkLost = 3,
  CFileChunkRequest = 4,
  CFileChunkRTC = 5,
  CCallStart = 6,
  CCallStop = 7,
  CCallRTC = 8,
  CSetAway = 9,
  CSetPushSubscription = 10,
  SReset = 11,
  SReady = 12,
  SSelfUpdate = 13,
  SSessionCreate = 14,
  SSessionUpdate = 15,
  SSessionDelete = 16,
  SFriendCreate = 17,
  SFriendUpdate = 18,
  SFriendDelete = 19,
  SChannelCreate = 20,
  SChannelUpdate = 21,
  SChannelDelete = 22,
  SChannelUserCreate = 23,
  SChannelUserUpdate = 24,
  SForeignUserUpdate = 25,
  SMessageCreate = 26,
  SMessageDelete = 27,
  SMessageUpdate = 29,
  SFileChunkRequest = 30,
  SFileChunkRTC = 31,
  SCallReset = 32,
  SCallRTC = 33,
}

export enum ColorTheme {
  Red = 0,
  Orange = 1,
  Amber = 2,
  Yellow = 3,
  Lime = 4,
  Green = 5,
  Emerald = 6,
  Teal = 7,
  Cyan = 8,
  Sky = 9,
  Blue = 10,
  Indigo = 11,
  Violet = 12,
  Purple = 13,
  Fuchsia = 14,
  Pink = 15,
  Rose = 16,
}

export enum Status {
  Online = 0,
  Away = 1,
  Busy = 2,
  Offline = 3,
}

export enum FileChunkRTCType {
  SDP = 0,
  ICECandidate = 1,
}

export enum CallRTCDataType {
  RemoteTrackOffer = 0,
  RemoteTrackICECandidate = 1, // (for tx's localTrack, rx's remoteTrack)
  LocalTrackAnswer = 2,
  LocalTrackICECandidate = 3, // (for tx's remoteTrack, rx's localTrack)
}

export enum CallStreamType {
  Audio = 0,
  Video = 1,
  DisplayVideo = 2,
  DisplayAudio = 3,
}

export enum AvatarType {
  WEBP = 0,
  MP4 = 1,
}
