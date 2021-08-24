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

type AcceptFriendUri struct {
	FriendID string `uri:"friendId" binding:"required,base64urlexact=16"`
}

func AcceptFriend(c *gin.Context) {
	var uri AcceptFriendUri
	if !util.BindUri(c, &uri) {
		return
	}

	now := time.Now()
	cUser := c.MustGet("user").(models.User)
	friendID := util.DecodeBinary(uri.FriendID)

	var friend models.Friend
	if util.FriendCollection.FindOneAndUpdate(util.Context, bson.M{
		"user1Id":  friendID,
		"user2Id":  cUser.ID,
		"accepted": false,
	}, bson.M{
		"$set": bson.M{
			"accepted": true,
		},
	}).Decode(&friend) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No friend request found",
		})

		return
	}

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OFriendAcceptType,
		Data: events.OFriendAccept{
			ID: util.EncodeBinary(friendID),
		},
	})

	util.BroadcastToUser(friendID, events.O{
		Type: events.OFriendAcceptType,
		Data: events.OFriendAccept{
			ID: util.EncodeBinary(cUser.ID),
		},
	})

	var channel models.Channel
	channelCreated := false
	if util.ChannelCollection.FindOne(util.Context, bson.M{
		"$and": bson.A{
			bson.M{
				"type": "private",
			},
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
	}).Decode(&channel) != nil {
		channelCreated = true
		channel = models.Channel{
			ID:      util.GenerateID(),
			Type:    "private",
			Created: now,
			Users: []models.ChannelUser{
				{
					ID:     cUser.ID,
					Added:  now,
					Owner:  false,
					Hidden: false,
				},
				{
					ID:     friendID,
					Added:  now,
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
		Created:   now,
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
				ID:      util.EncodeBinary(channel.ID),
				Type:    channel.Type,
				Created: channel.Created.UnixNano() / 1e6,
				Owner:   true,
				Users: []events.OChannelCreate_User{
					{
						ID:        util.EncodeBinary(friendUser.ID),
						Username:  friendUser.Username,
						Name:      friendUser.Name,
						AvatarID:  util.EncodeBinary(friendUser.AvatarID),
						PublicKey: util.EncodeBinary(friendUser.PublicKey),
						InVoice:   false,
						Hidden:    false,
					},
				},
				LastMessage: events.OChannelCreate_LastMessage{
					ID:      util.EncodeBinary(message.ID),
					UserID:  util.EncodeBinary(cUser.ID),
					Type:    message.Type,
					Created: message.Created.UnixNano() / 1e6,
				},
			},
		})

		util.BroadcastToUser(friendID, events.O{
			Type: events.OChannelCreateType,
			Data: events.OChannelCreate{
				ID:      util.EncodeBinary(channel.ID),
				Type:    channel.Type,
				Created: channel.Created.UnixNano() / 1e6,
				Owner:   false,
				Users: []events.OChannelCreate_User{
					{
						ID:        util.EncodeBinary(cUser.ID),
						Username:  cUser.Username,
						Name:      cUser.Name,
						AvatarID:  util.EncodeBinary(cUser.AvatarID),
						PublicKey: util.EncodeBinary(cUser.PublicKey),
						InVoice:   false,
						Hidden:    false,
					},
				},
				LastMessage: events.OChannelCreate_LastMessage{
					ID:      util.EncodeBinary(message.ID),
					UserID:  util.EncodeBinary(cUser.ID),
					Type:    message.Type,
					Created: message.Created.UnixNano() / 1e6,
				},
			},
		})

		return
	}

	util.BroadcastToChannel(channel.ID, events.O{
		Type: events.OMessageCreateType,
		Data: events.OMessageCreate{
			ID:        util.EncodeBinary(message.ID),
			ChannelID: util.EncodeBinary(channel.ID),
			UserID:    util.EncodeBinary(cUser.ID),
			Type:      message.Type,
			Created:   message.Created.UnixNano() / 1e6,
		},
	})
}
