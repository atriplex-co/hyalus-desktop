package models

type Message struct {
	ID        []byte       `bson:"_id"`
	ChannelID []byte       `bson:"channelId"`
	UserID    []byte       `bson:"userId"`
	Type      string       `bson:"type"`
	Body      []byte       `bson:"body"`
	Created   int64        `bson:"created"`
	Keys      []MessageKey `bson:"keys"`
}

type MessageKey struct {
	UserID []byte `bson:"userId"`
	Key    []byte `bson:"key"`
}
