package models

type Avatar struct {
	ID   []byte `bson:"_id"`
	Data []byte `bson:"data"`
	Type string `bson:"type"`
}
