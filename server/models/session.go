package models

import "time"

type Session struct {
	ID        []byte    `bson:"_id"`
	UserID    []byte    `bson:"userId"`
	Token     []byte    `bson:"token"`
	Created   time.Time `bson:"created"`
	LastStart time.Time `bson:"lastStart"`
	Agent     string    `bson:"agent"`
	IP        string    `bson:"ip"`
}
