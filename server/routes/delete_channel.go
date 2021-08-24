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

type DeleteChannelUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

//ik it says "delete" but this is for leaving groups.
//however, if there's no one left in the group, it gets deleted.
func DeleteChannel(c *gin.Context) {
	var uri DeleteChannelUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	id := util.DecodeBinary(uri.ChannelID)
	var channel models.Channel

	if util.ChannelCollection.FindOneAndUpdate(util.Context, bson.M{
		"_id": id,
		"type": bson.M{
			"$ne": "private", //users can't leave DMs.
		},
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
			},
		},
	}, bson.M{
		"$set": bson.M{
			"users.$.hidden": true,
		},
	}).Decode(&channel) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OChannelDeleteType,
		Data: events.OChannelDelete{
			ID: util.EncodeBinary(channel.ID),
		},
	})

	delete := true
	for _, user := range channel.Users {
		if bytes.Equal(cUser.ID, user.ID) {
			continue
		}

		if !user.Hidden {
			delete = false
		}
	}

	if delete {
		util.ChannelCollection.DeleteOne(util.Context, bson.M{
			"_id": channel.ID,
		})

		util.MessageCollection.DeleteMany(util.Context, bson.M{
			"channelId": channel.ID,
		})

		return
	}

	groupLeaveMessage := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channel.ID,
		UserID:    cUser.ID,
		Type:      "groupLeave",
		Created:   time.Now(),
	}

	util.MessageCollection.InsertOne(util.Context, &groupLeaveMessage)

	util.BroadcastToChannel(channel.ID, events.O{
		Type: events.OMessageCreateType,
		Data: events.OMessageCreate{
			ID:        util.EncodeBinary(groupLeaveMessage.ID),
			ChannelID: util.EncodeBinary(groupLeaveMessage.ChannelID),
			UserID:    util.EncodeBinary(groupLeaveMessage.UserID),
			Type:      groupLeaveMessage.Type,
			Created:   groupLeaveMessage.Created.UnixNano() / 1e6,
		},
	})

	util.BroadcastToChannel(channel.ID, events.O{
		Type: events.OChannelUserSetHiddenType,
		Data: events.OChannelUserSetHidden{
			ID:        util.EncodeBinary(cUser.ID),
			ChannelID: util.EncodeBinary(channel.ID),
			Hidden:    true,
		},
	})
}
