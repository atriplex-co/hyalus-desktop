package models

import "time"

type User struct {
	ID                  []byte    `bson:"_id"`
	Username            string    `bson:"username"`
	Name                string    `bson:"name"`
	AvatarID            []byte    `bson:"avatarId"`
	Salt                []byte    `bson:"salt"`
	AuthKey             []byte    `bson:"authKey"`
	AuthKeyUpdated      time.Time `bson:"authKeyUpdated"`
	PublicKey           []byte    `bson:"publicKey"`
	EncryptedPrivateKey []byte    `bson:"encryptedPrivateKey"`
	Created             time.Time `bson:"created"`
	TotpSecret          []byte    `bson:"totpSecret"`
	ColorTheme          string    `bson:"colorTheme"`
	TypingEvents        bool      `bson:"typingEvents"`
	WantStatus          string    `bson:"wantStatus"`
}
