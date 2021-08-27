package routes

import (
	"bytes"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetAuthKeyBody struct {
	OldAuthKey          string `json:"oldAuthKey" binding:"required,base64urlexact=32"`
	Salt                string `json:"salt" binding:"required,base64urlexact=16"`
	AuthKey             string `json:"authKey" binding:"required,base64urlexact=32"`
	EncryptedPrivateKey string `json:"encryptedPrivateKey" binding:"required,base64urlexact=72"`
}

func SetAuthKey(c *gin.Context) {
	var body SetAuthKeyBody
	if !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	cSession := c.MustGet("session").(models.Session)
	oldAuthKey := util.DecodeBinary(body.OldAuthKey)
	salt := util.DecodeBinary(body.Salt)
	authKey := util.DecodeBinary(body.AuthKey)
	encryptedPrivateKey := util.DecodeBinary(body.EncryptedPrivateKey)

	if !bytes.Equal(oldAuthKey, cUser.AuthKey) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid password",
		})
		return
	}

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"salt":                salt,
			"authKey":             authKey,
			"encryptedPrivateKey": encryptedPrivateKey,
		},
	})

	sessionCursor, _ := util.SessionCollection.Find(util.Context, bson.M{
		"userId": cUser.ID,
		"_id": bson.M{
			"$ne": cSession.ID,
		},
	})

	for sessionCursor.Next(util.Context) {
		var session models.Session
		sessionCursor.Decode(&session)

		util.SessionCollection.DeleteOne(util.Context, bson.M{
			"_id": session.ID,
		})

		util.BroadcastToSession(session.ID, events.O{
			Type: events.OResetType,
		})

		util.BroadcastToUser(cUser.ID, events.O{
			Type: events.OSessionDeleteType,
			Data: events.OSessionDelete{
				ID: util.EncodeBinary(session.ID),
			},
		})
	}
}
