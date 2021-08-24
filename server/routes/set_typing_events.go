package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetTypingEventsBody struct {
	TypingEvents bool `json:"typingEvents" binding:"required"`
}

func SetTypingEvents(c *gin.Context) {
	var body SetTypingEventsBody
	if !util.BindJSON(c, &body) {
		return
	}

	user := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, user.ID, bson.M{
		"$set": bson.M{
			"typingEvents": body.TypingEvents,
		},
	})

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OSetTypingEventsType,
		Data: events.OSetTypingEvents{
			TypingEvents: body.TypingEvents,
		},
	})
}
