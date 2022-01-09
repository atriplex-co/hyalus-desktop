export const SocketProtocol = 5;
export const PushProtocol = 1;
export const MaxAvatarWidth = 256;
export const MaxAvatarFPS = 30;
export const MaxAvatarDuration = 10;
export const MaxFileSize = 1024 * 1024 * 200;
export const MaxFileChunkSize = 1024 * 1024 * 2;

export enum ChannelType {
  Private,
  Group,
}

export enum MessageType {
  Text,
  Attachment,
  FriendAccept,
  GroupCreate,
  GroupAdd,
  GroupRemove,
  GroupName,
  GroupAvatar,
  GroupLeave,
}

export enum SocketMessageType {
  CStart,
  CChannelTyping,
  CFileChunkOwned,
  CFileChunkLost,
  CFileChunkRequest,
  CFileChunkRTC,
  CCallStart,
  CCallStop,
  CCallRTC,
  CSetAway,
  CSetPushSubscription,
  SReset,
  SReady,
  SSelfUpdate,
  SSessionCreate,
  SSessionUpdate,
  SSessionDelete,
  SFriendCreate,
  SFriendUpdate,
  SFriendDelete,
  SChannelCreate,
  SChannelUpdate,
  SChannelDelete,
  SChannelUserCreate,
  SChannelUserUpdate,
  SForeignUserUpdate,
  SMessageCreate,
  SMessageDelete,
  SMessageUpdate,
  SFileChunkRequest,
  SFileChunkRTC,
  SCallReset,
  SCallRTC,
}

export enum ColorTheme {
  Red,
  Orange,
  Amber,
  Yellow,
  Lime,
  Green,
  Emerald,
  Teal,
  Cyan,
  Sky,
  Blue,
  Indigo,
  Violet,
  Purple,
  Fuchsia,
  Pink,
  Rose,
}

export enum Status {
  Online,
  Away,
  Busy,
  Offline,
}

export enum FileChunkRTCType {
  SDP,
  ICECandidate,
}

export enum CallRTCType {
  RemoteTrackOffer,
  RemoteTrackICECandidate, // (for tx's localTrack, rx's remoteTrack)
  LocalTrackAnswer,
  LocalTrackICECandidate, // (for tx's remoteTrack, rx's localTrack)
}

export enum CallStreamType {
  Audio,
  Video,
  Display,
  DisplayAudio,
}
