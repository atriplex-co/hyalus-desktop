package routes

import (
	"bytes"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type GroupRemoveUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
	UserID    string `uri:"userId" binding:"required,base64urlexact=16"`
}

func GroupRemove(c *gin.Context) {
	var uri GroupRemoveUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID := util.DecodeBinary(uri.ChannelID)
	userID := util.DecodeBinary(uri.UserID)

	if bytes.Equal(cUser.ID, userID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Can't remove yourself",
		}) //use DELETE /api/channels/:channelId instead.

		return
	}

	var channel models.Channel

	if util.ChannelCollection.FindOne(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
				"owner":  true,
			},
		},
	}).Decode(&channel) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	if res, _ := util.ChannelCollection.UpdateOne(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     userID,
				"hidden": false,
			},
		},
	}, bson.M{
		"$set": bson.M{
			"users.$.hidden": true,
		},
	}); res.MatchedCount < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User not found",
		})

		return
	}

	voiceSocket := util.GetVoiceSocketFromUserID(userID)
	if voiceSocket != nil && bytes.Equal(voiceSocket.VoiceChannelID, channelID) {
		voiceSocket.WriteJSON(events.O{
			Type: events.OVoiceResetType,
		})

		voiceSocket.VoiceStop()
	}

	util.BroadcastToUser(userID, events.O{
		Type: events.OChannelDeleteType,
		Data: events.OChannelDelete{
			ID: uri.ChannelID,
		},
	})

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OChannelUserSetHiddenType,
		Data: events.OChannelUserSetHidden{
			ID:        uri.UserID,
			ChannelID: uri.ChannelID,
			Hidden:    true,
		},
	})

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channelID,
		UserID:    cUser.ID,
		Type:      "groupRemove",
		Body:      userID,
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
