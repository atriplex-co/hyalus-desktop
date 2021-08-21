package routes

import (
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type LoginBody struct {
	Username string `json:"username" binding:"required,regexp=^[a-zA-Z0-9_-]{3,32}$"`
	AuthKey  string `json:"authKey" binding:"required,base64urlexact=32"`
	TotpCode string `json:"totpCode"`
}

func Login(c *gin.Context) {
	var body LoginBody
	if !util.BindJSON(c, &body) {
		return
	}

	authKey, _ := base64.RawURLEncoding.DecodeString(body.AuthKey)

	var user models.User
	if err := util.UserCollection.FindOne(util.Context, bson.M{
		"username": body.Username,
		"authKey":  authKey,
	}).Decode(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid password",
		})

		return
	}

	if len(user.TotpSecret) != 0 {
		if body.TotpCode == "" {
			c.JSON(http.StatusOK, gin.H{
				"totpRequired": true,
			})

			return
		}

		if !util.CheckTOTPCode(body.TotpCode, user.TotpSecret) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid 2FA code",
			})

			return
		}
	}

	session := &models.Session{
		ID:        util.GenerateID(),
		UserID:    user.ID,
		Token:     util.GenerateToken(),
		Agent:     c.Request.UserAgent(),
		IP:        c.ClientIP(),
		Created:   time.Now().UnixNano() / 1e6,
		LastStart: time.Now().UnixNano() / 1e6,
	}

	util.SessionCollection.InsertOne(util.Context, &session)

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OSessionCreateType,
		Data: events.OSessionCreate{
			ID:      base64.RawURLEncoding.EncodeToString(session.ID),
			Agent:   session.Agent,
			IP:      session.IP,
			Created: session.Created,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"token":               base64.RawURLEncoding.EncodeToString(session.Token),
		"publicKey":           base64.RawURLEncoding.EncodeToString(user.PublicKey),
		"encryptedPrivateKey": base64.RawURLEncoding.EncodeToString(user.EncryptedPrivateKey),
	})
}
