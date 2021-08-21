package routes

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type DeleteSessionUri struct {
	SessionID string `uri:"sessionId" binding:"required,base64urlexact=16"`
}

func DeleteSession(c *gin.Context) {
	var uri DeleteSessionUri
	if !util.BindUri(c, &uri) {
		return
	}

	sessionID, _ := base64.RawURLEncoding.DecodeString(uri.SessionID)

	var session models.Session
	if err := util.SessionCollection.FindOneAndDelete(util.Context, bson.M{
		"_id":    sessionID,
		"userId": c.MustGet("session").(models.Session).UserID,
	}).Decode(&session); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Session not found",
		})

		return
	}

	util.BroadcastToSession(session.ID, events.O{
		Type: events.OResetType,
	})

	util.BroadcastToUser(session.UserID, events.O{
		Type: events.OSessionDeleteType,
		Data: events.OSessionDelete{
			ID: base64.RawURLEncoding.EncodeToString(session.ID),
		},
	})
}
