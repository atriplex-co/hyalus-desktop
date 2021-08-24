package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetGroupAvatarUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

func SetGroupAvatar(c *gin.Context) {
	var uri SetGroupAvatarUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID := util.DecodeBinary(uri.ChannelID)

	if count, _ := util.ChannelCollection.CountDocuments(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
				"owner":  true,
			},
		},
	}); count < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	header, err := c.FormFile("avatar")

	if err != nil || header.Size > 20*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid avatar",
		})

		return
	}

	file, err := header.Open()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to open avatar",
		})

		return
	}

	avatar := util.ProcessAvatar(file)

	if avatar == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid avatar data",
		})

		return
	}

	util.ChannelCollection.UpdateByID(util.Context, channelID, bson.M{
		"$set": bson.M{
			"avatarId": avatar,
		},
	})

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OChannelSetAvatarIDType,
		Data: events.OChannelSetAvatarID{
			ID:       uri.ChannelID,
			AvatarID: util.EncodeBinary(avatar),
		},
	})

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channelID,
		UserID:    cUser.ID,
		Type:      "groupAvatar",
		Created:   time.Now(),
	}

	util.MessageCollection.InsertOne(util.Context, &message)

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OMessageCreateType,
		Data: events.OMessageCreate{
			ID:        util.EncodeBinary(message.ID),
			ChannelID: util.EncodeBinary(message.ChannelID),
			UserID:    util.EncodeBinary(message.UserID),
			Body:      util.EncodeBinary(message.Body),
			Type:      message.Type,
			Created:   message.Created.UnixNano() / 1e6,
		},
	})
}
