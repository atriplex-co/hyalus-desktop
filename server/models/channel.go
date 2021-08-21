package models

type Channel struct {
	ID       []byte        `bson:"_id"`
	Type     string        `bson:"type"`
	Name     string        `bson:"name"`
	AvatarID []byte        `bson:"avatarId"`
	Created  int64         `bson:"created"`
	Users    []ChannelUser `bson:"users"`
}

type ChannelUser struct {
	ID     []byte `bson:"id"`
	Added  int64  `bson:"added"`
	Owner  bool   `bson:"owner"`
	Hidden bool   `bson:"hidden"`
}
