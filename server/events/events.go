package events

import "encoding/json"

const (
	IStartType                  = "start"
	ITypingType                 = "typing"
	OReadyType                  = "ready"
	OResetType                  = "reset"
	OSetUsernameType            = "setUsername"
	OSetNameType                = "setName"
	OSetAvatarIDType            = "setAvatarId"
	OSetTotpEnabledType         = "setTotpEnabled"
	OSetColorThemeType          = "setColorTheme"
	OSetTypingEventsType        = "setTypingEvents"
	OSetWantStatusType          = "setWantStatus"
	OSessionCreateType          = "sessionCreate"
	OSessionDeleteType          = "sessionDelete"
	OSessionStartType           = "sessionStart"
	OFriendCreateType           = "friendCreate"
	OFriendDeleteType           = "friendDelete"
	OFriendAcceptType           = "friendAccept"
	OChannelCreateType          = "channelCreate"
	OChannelDeleteType          = "channelDelete"
	OChannelSetNameType         = "channelSetName"
	OChannelSetAvatarIDType     = "channelSetAvatarId"
	OChannelSetOwnerType        = "channelSetOwner"
	OChannelUserCreateType      = "channelUserCreate"
	OChannelUserSetHiddenType   = "channelUserSetHidden"
	OChannelUserSetInVoiceType  = "channelUserSetInVoice"
	OChannelUserTypingType      = "channelUserTyping"
	OMessageCreateType          = "messageCreate"
	OMessageDeleteType          = "messageDelete"
	OForeignUserSetUsernameType = "foreignUserSetUsername"
	OForeignUserSetNameType     = "foreignUserSetName"
	OForeignUserSetAvatarIDType = "foreignUserSetAvatarId"
	OForeignUserSetStatusType   = "foreignUserSetStatus"
	IFileChunkOwnedType         = "fileChunkOwned"
	IFileChunkLostType          = "fileChunkLost"
	IFileChunkGetType           = "fileChunkGet"
	OFileChunkRequestType       = "fileChunkRequest"
	IFileChunkRTCType           = "fileChunkRtc"
	OFileChunkRTCType           = "fileChunkRtc"
	IVoiceStartType             = "voiceStart"
	IVoiceStopType              = "voiceStop"
	IVoiceRTCType               = "voiceRtc"
	OVoiceResetType             = "voiceReset"
	OVoiceRTCType               = "voiceRtc"
	ISetAwayType                = "setAway"
)

// before we begin, i'll take this time to complain about naming conventions.
// why is everything in go so opinionated?
// why does my IDE try and force messageId->messageID on me so aggressively.
// anyway, the _'s in the names, mean that they belong to the parent event before the _.
// ik some go devs are probably equiping their pitchforks already.
// leave me the fuck alone.

type I struct {
	Type string          `json:"t"`
	Data json.RawMessage `json:"d"`
}

type IStart struct {
	Token          string   `json:"token"`
	FileChunks     []string `json:"fileChunks"`
	VoiceChannelID string   `json:"voiceChannelId"`
	Away           bool     `json:"away"`
}

type O struct {
	Type string      `json:"t"`
	Data interface{} `json:"d"`
}

type OReady struct {
	Proto    int64            `json:"proto"`
	User     OReady_User      `json:"user"`
	Friends  []OReady_Friend  `json:"friends"`
	Channels []OReady_Channel `json:"channels"`
	Sessions []OReady_Session `json:"sessions"`
}

type OReady_User struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Name           string `json:"name"`
	AvatarID       string `json:"avatarId"`
	TotpEnabled    bool   `json:"totpEnabled"`
	Created        int64  `json:"created"`
	AuthKeyUpdated int64  `json:"authKeyUpdated"`
	ColorTheme     string `json:"colorTheme"`
	TypingEvents   bool   `json:"typingEvents"`
	WantStatus     string `json:"wantStatus"`
}

type OReady_Friend struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	Accepted  bool   `json:"accepted"`
	CanAccept bool   `json:"canAccept"`
	Status    string `json:"status"`
}

type OReady_Channel struct {
	ID          string                    `json:"id"`
	Name        string                    `json:"name"`
	AvatarID    string                    `json:"avatarId"`
	Type        string                    `json:"type"`
	Created     int64                     `json:"created"`
	Owner       bool                      `json:"owner"`
	Users       []OReady_ChannelUser      `json:"users"`
	LastMessage OReady_ChannelLastMessage `json:"lastMessage"`
}

type OReady_ChannelUser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	PublicKey string `json:"publicKey"`
	InVoice   bool   `json:"inVoice"`
	Hidden    bool   `json:"hidden"`
	Status    string `json:"status"`
}

type OReady_ChannelLastMessage struct {
	ID      string `json:"id"`
	UserID  string `json:"userId"`
	Body    string `json:"body"`
	Key     string `json:"key"`
	Type    string `json:"type"`
	Created int64  `json:"created"`
}

type OReady_Session struct {
	ID        string `json:"id"`
	Agent     string `json:"agent"`
	IP        string `json:"ip"`
	Created   int64  `json:"created"`
	LastStart int64  `json:"lastStart"`
	Self      bool   `json:"self"`
}

type OSetAvatarID struct {
	AvatarID string `json:"avatarId"`
}

type OSetColorTheme struct {
	ColorTheme string `json:"colorTheme"`
}

type OSetName struct {
	Name string `json:"name"`
}

type OSetTotpEnabled struct {
	TotpEnabled bool `json:"totpEnabled"`
}

type OSetTypingEvents struct {
	TypingEvents bool `json:"typingEvents"`
}

type OSetUsername struct {
	Username string `json:"username"`
}

type OSessionCreate struct {
	ID      string `json:"id"`
	Agent   string `json:"agent"`
	IP      string `json:"ip"`
	Created int64  `json:"created"`
}

type OSessionDelete struct {
	ID string `json:"id"`
}

type OSessionStarted struct {
	ID    string `json:"id"`
	Agent string `json:"agent"`
	IP    string `json:"ip"`
}

type OFriendCreate struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	Accepted  bool   `json:"accepted"`
	CanAccept bool   `json:"canAccept"`
}

type OFriendAccept struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type OFriendDelete struct {
	ID string `json:"id"`
}

type OChannelCreate struct {
	ID          string                     `json:"id"`
	Name        string                     `json:"name"`
	AvatarID    string                     `json:"avatarId"`
	Type        string                     `json:"type"`
	Created     int64                      `json:"created"`
	Owner       bool                       `json:"owner"`
	Users       []OChannelCreate_User      `json:"users"`
	LastMessage OChannelCreate_LastMessage `json:"lastMessage"`
}

type OChannelCreate_User struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	PublicKey string `json:"publicKey"`
	InVoice   bool   `json:"inVoice"`
	Hidden    bool   `json:"hidden"`
	Status    string `json:"status"`
}

type OChannelCreate_LastMessage struct {
	ID      string `json:"id"`
	UserID  string `json:"userId"`
	Body    string `json:"body"`
	Key     string `json:"key"`
	Type    string `json:"type"`
	Created int64  `json:"created"`
}

type OMessageCreate struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
	UserID    string `json:"userId"`
	Body      string `json:"body"`
	Key       string `json:"key"`
	Type      string `json:"type"`
	Created   int64  `json:"created"`
}

type OMessageDelete struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
}

type OChannelUserCreate struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarID  string `json:"avatarId"`
	PublicKey string `json:"publicKey"`
	InVoice   bool   `json:"inVoice"`
	Hidden    bool   `json:"hidden"`
	Status    string `json:"status"`
}

type OForeignUserSetAvatarID struct {
	ID       string `json:"id"`
	AvatarID string `json:"avatarId"`
}

type OForeignUserSetName struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type OForeignUserSetUsername struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

type OChannelDelete struct {
	ID string `json:"id"`
}

type OChannelSetOwner struct {
	ID    string `json:"id"`
	Owner bool   `json:"owner"`
}

type OChannelUserSetHidden struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
	Hidden    bool   `json:"hidden"`
}

type OChannelSetName struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type OChannelSetAvatarID struct {
	ID       string `json:"id"`
	AvatarID string `json:"avatarId"`
}

type IFileChunkOwned struct {
	Hash string `json:"hash"`
}

type IFileChunkLost struct {
	Hash string `json:"hash"`
}

type IFileChunkGet struct {
	Hash string `json:"hash"`
}

type OFileChunkRequest struct {
	Hash     string `json:"hash"`
	SocketID string `json:"socketId"`
}

type IFileChunkRTC struct {
	Hash        string `json:"hash"`
	SocketID    string `json:"socketId"`
	Payload     string `json:"payload"`
	PayloadType string `json:"payloadType"`
}

type OFileChunkRTC struct {
	Hash        string `json:"hash"`
	SocketID    string `json:"socketId"`
	Payload     string `json:"payload"`
	PayloadType string `json:"payloadType"`
}

type OChannelUserSetInVoice struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
	InVoice   bool   `json:"inVoice"`
}

type IVoiceRTC struct {
	UserID  string `json:"userId"`
	Payload string `json:"payload"`
}

type OVoiceRTC struct {
	UserID  string `json:"userId"`
	Payload string `json:"payload"`
}

type IVoiceStart struct {
	ChannelID string `json:"channelId"`
}

type OSetWantStatus struct {
	WantStatus string `json:"wantStatus"`
}

type OForeignUserSetStatus struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type ISetAway struct {
	Away bool `json:"away"`
}

type ITyping struct {
	ChannelID string `json:"channelId"`
}

type OChannelUserTyping struct {
	ID        string `json:"id"`
	ChannelID string `json:"channelId"`
}
