package routes

import (
	"bytes"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type GroupAddUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

type GroupAddBody struct {
	UserID string `json:"userId" binding:"required,base64urlexact=16"`
}

func GroupAdd(c *gin.Context) {
	var uri GroupAddUri
	var body GroupAddBody
	if !util.BindUri(c, &uri) || !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID, _ := base64.RawURLEncoding.DecodeString(uri.ChannelID)
	userID, _ := base64.RawURLEncoding.DecodeString(body.UserID)

	var channel models.Channel

	if err := util.ChannelCollection.FindOne(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
			},
		},
	}).Decode(&channel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	if found, _ := util.FriendCollection.CountDocuments(util.Context, bson.M{
		"$or": bson.A{
			bson.M{
				"user1Id": cUser.ID,
				"user2Id": userID,
			},
			bson.M{
				"user1Id": userID,
				"user2Id": cUser.ID,
			},
		},
		"accepted": true,
	}); found < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Must be friends to add to group",
		})

		return
	}

	found := false
	hidden := false
	for _, user := range channel.Users {
		if bytes.Equal(user.ID, userID) {
			found = true
			hidden = user.Hidden
		}
	}

	if found && !hidden {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User is already in the group",
		})

		return
	}

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channelID,
		UserID:    cUser.ID,
		Type:      "groupAdd",
		Body:      userID,
		Created:   time.Now().UnixNano() / 1e6,
	}

	util.MessageCollection.InsertOne(util.Context, &message)

	if found && hidden {
		util.BroadcastToChannel(channelID, events.O{
			Type: events.OChannelUserSetHiddenType,
			Data: events.OChannelUserSetHidden{
				ID:        body.UserID,
				ChannelID: uri.ChannelID,
				Hidden:    false,
			},
		})

		util.ChannelCollection.UpdateOne(util.Context, bson.M{
			"_id": channelID,
			"users": bson.M{
				"$elemMatch": bson.M{
					"id": userID,
				},
			},
		}, bson.M{
			"$set": bson.M{
				"users.$.hidden": false,
			},
		})
	}

	if !found {
		var user models.User
		util.UserCollection.FindOne(util.Context, bson.M{
			"_id": userID,
		}).Decode(&user)

		util.BroadcastToChannel(channelID, events.O{
			Type: events.OChannelUserCreateType,
			Data: events.OChannelUserCreate{
				ID:        body.UserID,
				ChannelID: uri.ChannelID,
				Username:  user.Username,
				Name:      user.Name,
				AvatarID:  base64.RawURLEncoding.EncodeToString(user.AvatarID),
				PublicKey: base64.RawURLEncoding.EncodeToString(user.PublicKey),
				InVoice:   false,
				Hidden:    false,
			},
		})

		util.ChannelCollection.UpdateByID(util.Context, channelID, bson.M{
			"$push": bson.M{
				"users": bson.M{
					"id":     userID,
					"hidden": false,
					"owner":  false,
				},
			},
		})
	}

	var eventUsers []events.OChannelCreate_User
	for _, userInfo := range channel.Users {
		if bytes.Equal(userID, userInfo.ID) {
			continue
		}

		var user models.User
		util.UserCollection.FindOne(util.Context, bson.M{
			"_id": userInfo.ID,
		}).Decode(&user)

		voiceSocket := util.GetVoiceSocketFromUserID(user.ID)

		eventUsers = append(eventUsers, events.OChannelCreate_User{
			ID:        base64.RawURLEncoding.EncodeToString(user.ID),
			AvatarID:  base64.RawURLEncoding.EncodeToString(user.AvatarID),
			PublicKey: base64.RawURLEncoding.EncodeToString(user.PublicKey),
			Username:  user.Username,
			Name:      user.Name,
			Hidden:    userInfo.Hidden,
			InVoice:   voiceSocket != nil && bytes.Equal(channel.ID, voiceSocket.VoiceChannelID),
		})
	}

	util.BroadcastToUser(userID, events.O{
		Type: events.OChannelCreateType,
		Data: events.OChannelCreate{
			ID:       base64.RawURLEncoding.EncodeToString(channel.ID),
			AvatarID: base64.RawURLEncoding.EncodeToString(channel.AvatarID),
			Name:     channel.Name,
			Type:     channel.Type,
			Created:  channel.Created,
			Owner:    false,
			Users:    eventUsers,
			LastMessage: events.OChannelCreate_LastMessage{
				ID:      base64.RawURLEncoding.EncodeToString(message.ID),
				UserID:  base64.RawURLEncoding.EncodeToString(message.UserID),
				Body:    base64.RawURLEncoding.EncodeToString(message.Body),
				Type:    message.Type,
				Created: message.Created,
			},
		},
	})

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OMessageCreateType,
		Data: events.OMessageCreate{
			ID:        base64.RawURLEncoding.EncodeToString(message.ID),
			ChannelID: base64.RawURLEncoding.EncodeToString(message.ChannelID),
			UserID:    base64.RawURLEncoding.EncodeToString(message.UserID),
			Body:      base64.RawURLEncoding.EncodeToString(message.Body),
			Type:      message.Type,
			Created:   message.Created,
		},
	})
}
