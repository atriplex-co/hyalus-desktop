package models

import "time"

type Friend struct {
	User1ID  []byte    `bson:"user1Id"`
	User2ID  []byte    `bson:"user2Id"`
	Accepted bool      `bson:"accepted"`
	Created  time.Time `bson:"created"`
}
