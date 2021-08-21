package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type DeleteMessageUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
	MessageID string `uri:"messageId" binding:"required,base64urlexact=16"`
}

func DeleteMessage(c *gin.Context) {
	var uri DeleteMessageUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID := util.DecodeBinary(uri.ChannelID)
	messageID := util.DecodeBinary(uri.MessageID)

	var channel models.Channel
	if util.ChannelCollection.FindOne(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
			},
		},
	}).Decode(&channel) != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Channel not found",
		})

		return
	}

	if res, _ := util.MessageCollection.DeleteOne(util.Context, bson.M{
		"_id":       messageID,
		"channelId": channelID,
		"userId":    cUser.ID,
	}); res.DeletedCount < 1 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Message not found",
		})

		return
	}

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OMessageDeleteType,
		Data: events.OMessageDelete{
			ID:        uri.MessageID,
			ChannelID: uri.ChannelID,
		},
	})
}
