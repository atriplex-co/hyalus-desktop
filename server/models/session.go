package models

type Session struct {
	ID        []byte `bson:"_id"`
	UserID    []byte `bson:"userId"`
	Token     []byte `bson:"token"`
	Created   int64  `bson:"created"`
	LastStart int64  `bson:"lastStart"`
	Agent     string `bson:"agent"`
	IP        string `bson:"ip"`
}
