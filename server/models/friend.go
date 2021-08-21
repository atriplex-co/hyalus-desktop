package models

type Friend struct {
	User1ID  []byte `bson:"user1Id"`
	User2ID  []byte `bson:"user2Id"`
	Accepted bool   `bson:"accepted"`
	Created  int64  `bson:"created"`
}
