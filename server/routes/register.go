package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type RegisterBody struct {
	Username            string `json:"username" binding:"required,username"`
	Salt                string `json:"salt" binding:"required,base64urlexact=16"`
	AuthKey             string `json:"authKey" binding:"required,base64urlexact=32"`
	PublicKey           string `json:"publicKey" binding:"required,base64urlexact=32"`
	EncryptedPrivateKey string `json:"encryptedPrivateKey" binding:"required,base64urlexact=72"`
}

func Register(c *gin.Context) {
	var body RegisterBody
	if !util.BindJSON(c, &body) {
		return
	}

	conflict, _ := util.UserCollection.CountDocuments(util.Context, bson.M{
		"username": strings.ToLower(body.Username),
	})

	if conflict > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Username already in use",
		})

		return
	}

	salt := util.DecodeBinary(body.Salt)
	authKey := util.DecodeBinary(body.AuthKey)
	publicKey := util.DecodeBinary(body.PublicKey)
	encryptedPrivateKey := util.DecodeBinary(body.EncryptedPrivateKey)
	now := time.Now()

	user := models.User{
		ID:                  util.GenerateID(),
		Username:            strings.ToLower(body.Username),
		Name:                body.Username,
		AvatarID:            nil,
		Salt:                salt,
		AuthKey:             authKey,
		AuthKeyUpdated:      now,
		PublicKey:           publicKey,
		EncryptedPrivateKey: encryptedPrivateKey,
		Created:             now,
		TotpSecret:          nil,
		ColorTheme:          "green",
		TypingEvents:        true,
	}

	session := &models.Session{
		ID:        util.GenerateID(),
		UserID:    user.ID,
		Token:     util.GenerateToken(),
		Agent:     c.Request.UserAgent(),
		IP:        c.ClientIP(),
		Created:   now,
		LastStart: now,
	}

	util.UserCollection.InsertOne(util.Context, &user)
	util.SessionCollection.InsertOne(util.Context, &session)

	c.JSON(http.StatusOK, gin.H{
		"token": util.EncodeBinary(session.Token),
	})
}
