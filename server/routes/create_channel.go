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

type CreateChannelBody struct {
	Name    string   `json:"name" binding:"required,min=1,max=32"`
	UserIDs []string `json:"userIds" binding:"required,dive,base64urlexact=16"`
}

func CreateChannel(c *gin.Context) {
	var body CreateChannelBody
	if !util.BindJSON(c, &body) {
		return
	}

	now := time.Now().UnixNano() / 1e6
	cUser := c.MustGet("user").(models.User)

	channel := models.Channel{
		ID:      util.GenerateID(),
		Type:    "group",
		Name:    body.Name,
		Created: now,
		Users: []models.ChannelUser{
			{
				ID:     cUser.ID,
				Added:  now,
				Owner:  true,
				Hidden: false,
			},
		},
	}

	users := []models.User{cUser}

	for _, userID := range body.UserIDs {
		userID, _ := base64.RawURLEncoding.DecodeString(userID)

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
		}); found < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Must be friends to create a group",
			})

			return
		}

		var user models.User
		util.UserCollection.FindOne(util.Context, bson.M{
			"_id": userID,
		}).Decode(&user)

		users = append(users, user)

		channel.Users = append(channel.Users, models.ChannelUser{
			ID:     user.ID,
			Added:  now,
			Owner:  false,
			Hidden: false,
		})
	}

	util.ChannelCollection.InsertOne(util.Context, &channel)

	groupCreateMessage := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channel.ID,
		UserID:    cUser.ID,
		Type:      "groupCreate",
		Created:   now,
	}

	util.MessageCollection.InsertOne(util.Context, &groupCreateMessage)

	for _, user := range users {
		eventUsers := []events.OChannelCreate_User{}

		for _, user2 := range users {
			if bytes.Equal(user2.ID, user.ID) {
				continue
			}

			eventUsers = append(eventUsers, events.OChannelCreate_User{
				ID:        base64.RawURLEncoding.EncodeToString(user2.ID),
				Username:  user2.Username,
				Name:      user2.Name,
				AvatarID:  base64.RawURLEncoding.EncodeToString(user2.AvatarID),
				PublicKey: base64.RawURLEncoding.EncodeToString(user2.PublicKey),
				InVoice:   false,
				Hidden:    false,
			})
		}

		util.BroadcastToUser(user.ID, events.O{
			Type: events.OChannelCreateType,
			Data: events.OChannelCreate{
				ID:       base64.RawURLEncoding.EncodeToString(channel.ID),
				Name:     channel.Name,
				AvatarID: "",
				Type:     channel.Type,
				Created:  channel.Created,
				Owner:    bytes.Equal(user.ID, cUser.ID),
				Users:    eventUsers,
				LastMessage: events.OChannelCreate_LastMessage{
					ID:      base64.RawURLEncoding.EncodeToString(groupCreateMessage.ID),
					UserID:  base64.RawURLEncoding.EncodeToString(groupCreateMessage.UserID),
					Body:    "",
					Key:     "",
					Type:    groupCreateMessage.Type,
					Created: groupCreateMessage.Created,
				},
			},
		})
	}

	for i, user := range users {
		if bytes.Equal(user.ID, cUser.ID) {
			continue
		}

		groupAddMessage := models.Message{
			ID:        util.GenerateID(),
			ChannelID: channel.ID,
			UserID:    cUser.ID,
			Type:      "groupAdd",
			Body:      user.ID,
			Created:   now + int64(i),
		}

		util.MessageCollection.InsertOne(util.Context, &groupAddMessage)

		util.BroadcastToChannel(channel.ID, events.O{
			Type: events.OMessageCreateType,
			Data: events.OMessageCreate{
				ID:        base64.RawURLEncoding.EncodeToString(groupAddMessage.ID),
				ChannelID: base64.RawURLEncoding.EncodeToString(groupAddMessage.ChannelID),
				UserID:    base64.RawURLEncoding.EncodeToString(groupAddMessage.UserID),
				Body:      base64.RawURLEncoding.EncodeToString(groupAddMessage.Body),
				Key:       "",
				Type:      groupAddMessage.Type,
				Created:   groupAddMessage.Created,
			},
		})
	}
}
