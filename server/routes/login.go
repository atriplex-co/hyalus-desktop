package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type LoginBody struct {
	Username string `json:"username" binding:"required,username"`
	AuthKey  string `json:"authKey" binding:"required,base64urlexact=32"`
	TotpCode string `json:"totpCode"`
}

func Login(c *gin.Context) {
	var body LoginBody
	if !util.BindJSON(c, &body) {
		return
	}

	authKey := util.DecodeBinary(body.AuthKey)

	var user models.User
	if util.UserCollection.FindOne(util.Context, bson.M{
		"username": strings.ToLower(body.Username),
		"authKey":  authKey,
	}).Decode(&user) != nil {
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
			ID:      util.EncodeBinary(session.ID),
			Agent:   session.Agent,
			IP:      session.IP,
			Created: session.Created,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"token":               util.EncodeBinary(session.Token),
		"publicKey":           util.EncodeBinary(user.PublicKey),
		"encryptedPrivateKey": util.EncodeBinary(user.EncryptedPrivateKey),
	})
}
