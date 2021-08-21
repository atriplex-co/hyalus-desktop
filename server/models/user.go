package models

type User struct {
	ID                  []byte `bson:"_id"`
	Username            string `bson:"username"`
	Name                string `bson:"name"`
	AvatarID            []byte `bson:"avatarId"`
	Salt                []byte `bson:"salt"`
	AuthKey             []byte `bson:"authKey"`
	AuthKeyUpdated      int64  `bson:"authKeyUpdated"`
	PublicKey           []byte `bson:"publicKey"`
	EncryptedPrivateKey []byte `bson:"encryptedPrivateKey"`
	Created             int64  `bson:"created"`
	TotpSecret          []byte `bson:"totpSecret"`
	ColorTheme          string `bson:"colorTheme"`
	TypingEvents        bool   `bson:"typingEvents"`
}
