package routes

import (
	"bytes"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type CreateMessageUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

type CreateMessageBody struct {
	Type string `json:"type" binding:"required"`
	Body string `json:"body" binding:"required,base64url"`
	Keys []struct {
		UserID string `json:"userId" binding:"required,base64urlexact=16"`
		Key    string `json:"key" binding:"required,base64url=48"`
	} `json:"keys" binding:"required"`
}

func CreateMessage(c *gin.Context) {
	var uri CreateMessageUri
	var body CreateMessageBody
	if !util.BindUri(c, &uri) || !util.BindJSON(c, &body) {
		return
	}

	supportedTypes := []string{
		"text",
		"file",
	}
	supportedTypeFound := false
	for _, supportedType := range supportedTypes {
		if body.Type == supportedType {
			supportedTypeFound = true
			break
		}
	}
	if !supportedTypeFound {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid message type",
		})

		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID := util.DecodeBinary(uri.ChannelID)

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
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	if channel.Type == "private" {
		var friendUserInfo models.ChannelUser
		for _, userInfo := range channel.Users {
			if !bytes.Equal(userInfo.ID, cUser.ID) {
				friendUserInfo = userInfo
				break
			}
		}

		if found, _ := util.FriendCollection.CountDocuments(util.Context, bson.M{
			"$or": bson.A{
				bson.M{
					"user1Id": cUser.ID,
					"user2Id": friendUserInfo.ID,
				},
				bson.M{
					"user1Id": friendUserInfo.ID,
					"user2Id": cUser.ID,
				},
			},
			"accepted": true,
		}); found < 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Must be friends to send direct messages",
			})

			return
		}
	}

	keys := []models.MessageKey{}

	for _, userInfo := range channel.Users {
		if userInfo.Hidden {
			continue
		}

		keyFound := false

		for _, bodyKey := range body.Keys {
			userID := util.DecodeBinary(bodyKey.UserID)

			if bytes.Equal(userInfo.ID, userID) {
				keyFound = true
				key := util.DecodeBinary(bodyKey.Key)
				keys = append(keys, models.MessageKey{
					UserID: userID,
					Key:    key,
				})

				break
			}
		}

		if !keyFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Missing key for %s", util.EncodeBinary(userInfo.ID)),
			})

			return
		}
	}

	messageBody := util.DecodeBinary(body.Body)

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channelID,
		UserID:    cUser.ID,
		Type:      body.Type,
		Body:      messageBody,
		Created:   time.Now().UnixNano() / 1e6,
		Keys:      keys,
	}

	util.MessageCollection.InsertOne(util.Context, &message)

	for _, key := range keys {
		util.BroadcastToUser(key.UserID, events.O{
			Type: events.OMessageCreateType,
			Data: events.OMessageCreate{
				ID:        util.EncodeBinary(message.ID),
				ChannelID: util.EncodeBinary(channelID),
				UserID:    util.EncodeBinary(cUser.ID),
				Body:      util.EncodeBinary(messageBody),
				Key:       util.EncodeBinary(key.Key),
				Type:      message.Type,
				Created:   message.Created,
			},
		})
	}
}
