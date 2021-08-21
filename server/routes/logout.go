package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

func Logout(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	session := c.MustGet("session").(models.Session)

	util.SessionCollection.DeleteOne(util.Context, bson.M{
		"_id": session.ID,
	})

	util.BroadcastToSession(session.ID, events.O{
		Type: events.OResetType,
	})

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OSessionDeleteType,
		Data: events.OSessionDelete{
			ID: util.EncodeBinary(session.ID),
		},
	})
}
