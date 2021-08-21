package routes

import (
	"encoding/base64"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type AcceptFriendUri struct {
	FriendID string `uri:"friendId" binding:"required,base64urlexact=16"`
}

func AcceptFriend(c *gin.Context) {
	var uri AcceptFriendUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	friendID, _ := base64.RawURLEncoding.DecodeString(uri.FriendID)

	var friend models.Friend
	if err := util.FriendCollection.FindOneAndUpdate(util.Context, bson.M{
		"user1Id":  friendID,
		"user2Id":  cUser.ID,
		"accepted": false,
	}, bson.M{
		"$set": bson.M{
			"accepted": true,
		},
	}).Decode(&friend); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No friend request found",
		})

		return
	}

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OFriendAcceptType,
		Data: events.OFriendAccept{
			ID: base64.RawURLEncoding.EncodeToString(friendID),
		},
	})

	util.BroadcastToUser(friendID, events.O{
		Type: events.OFriendAcceptType,
		Data: events.OFriendAccept{
			ID: base64.RawURLEncoding.EncodeToString(cUser.ID),
		},
	})

	var channel models.Channel
	channelCreated := false
	if err := util.ChannelCollection.FindOne(util.Context, bson.M{
		"$and": bson.A{
			bson.M{
				"users": bson.M{
					"$elemMatch": bson.M{
						"id": cUser.ID,
					},
				},
			},
			bson.M{
				"users": bson.M{
					"$elemMatch": bson.M{
						"id": friendID,
					},
				},
			},
		},
	}).Decode(&channel); err != nil {
		channelCreated = true
		channel = models.Channel{
			ID:      util.GenerateID(),
			Type:    "private",
			Created: time.Now().UnixNano() / 1e6,
			Users: []models.ChannelUser{
				{
					ID:     cUser.ID,
					Added:  time.Now().UnixNano() / 1e6,
					Owner:  false,
					Hidden: false,
				},
				{
					ID:     friendID,
					Added:  time.Now().UnixNano() / 1e6,
					Owner:  false,
					Hidden: false,
				},
			},
		}

		util.ChannelCollection.InsertOne(util.Context, &channel)
	}

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channel.ID,
		UserID:    cUser.ID,
		Type:      "friendAccept",
		Created:   time.Now().UnixNano() / 1e6,
	}

	util.MessageCollection.InsertOne(util.Context, &message)

	if channelCreated {
		var friendUser models.User
		util.UserCollection.FindOne(util.Context, bson.M{
			"_id": friendID,
		}).Decode(&friendUser)

		util.BroadcastToUser(cUser.ID, events.O{
			Type: events.OChannelCreateType,
			Data: events.OChannelCreate{
				ID:      base64.RawURLEncoding.EncodeToString(channel.ID),
				Type:    channel.Type,
				Created: channel.Created,
				Owner:   true,
				Users: []events.OChannelCreate_User{
					{
						ID:        base64.RawURLEncoding.EncodeToString(friendUser.ID),
						Username:  friendUser.Username,
						Name:      friendUser.Name,
						AvatarID:  base64.RawURLEncoding.EncodeToString(friendUser.AvatarID),
						PublicKey: base64.RawURLEncoding.EncodeToString(friendUser.PublicKey),
						InVoice:   false,
						Hidden:    false,
					},
				},
				LastMessage: events.OChannelCreate_LastMessage{
					ID:      base64.RawURLEncoding.EncodeToString(message.ID),
					UserID:  base64.RawURLEncoding.EncodeToString(cUser.ID),
					Type:    message.Type,
					Created: message.Created,
				},
			},
		})

		util.BroadcastToUser(friendID, events.O{
			Type: events.OChannelCreateType,
			Data: events.OChannelCreate{
				ID:      base64.RawURLEncoding.EncodeToString(channel.ID),
				Type:    channel.Type,
				Created: channel.Created,
				Owner:   false,
				Users: []events.OChannelCreate_User{
					{
						ID:        base64.RawURLEncoding.EncodeToString(cUser.ID),
						Username:  cUser.Username,
						Name:      cUser.Name,
						AvatarID:  base64.RawURLEncoding.EncodeToString(cUser.AvatarID),
						PublicKey: base64.RawURLEncoding.EncodeToString(cUser.PublicKey),
						InVoice:   false,
						Hidden:    false,
					},
				},
				LastMessage: events.OChannelCreate_LastMessage{
					ID:      base64.RawURLEncoding.EncodeToString(message.ID),
					UserID:  base64.RawURLEncoding.EncodeToString(cUser.ID),
					Type:    message.Type,
					Created: message.Created,
				},
			},
		})
	} else {
		util.BroadcastToChannel(channel.ID, events.O{
			Type: events.OMessageCreateType,
			Data: events.OMessageCreate{
				ID:        base64.RawURLEncoding.EncodeToString(message.ID),
				ChannelID: base64.RawURLEncoding.EncodeToString(channel.ID),
				UserID:    base64.RawURLEncoding.EncodeToString(cUser.ID),
				Type:      message.Type,
				Created:   message.Created,
			},
		})
	}
}
