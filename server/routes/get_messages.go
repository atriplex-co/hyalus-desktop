package routes

import (
	"bytes"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type GetChannelMessagesUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

func GetMessages(c *gin.Context) {
	var uri GetChannelMessagesUri
	if !util.BindUri(c, &uri) {
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
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Channel not found",
		})

		return
	}

	var ownUserInfo models.ChannelUser
	for _, userInfo := range channel.Users {
		if bytes.Equal(userInfo.ID, cUser.ID) {
			ownUserInfo = userInfo
			break
		}
	}

	before, _ := strconv.Atoi(c.Query("before"))
	after, _ := strconv.Atoi(c.Query("after"))

	query := bson.M{}
	sort := bson.M{
		"created": -1,
	}

	if int64(before) != 0 && int64(before) > ownUserInfo.Added {
		query["$lte"] = int64(before)
	}

	if after != 0 {
		sort["created"] = 1
		query["$gte"] = int64(math.Max(float64(ownUserInfo.Added), float64(after)))
	} else {
		query["$gte"] = ownUserInfo.Added
	}

	cursor, _ := util.MessageCollection.Find(util.Context, bson.M{
		"channelId": channelID,
		"created":   query,
	}, options.Find().SetSort(sort).SetLimit(50))

	formatted := []gin.H{}

	for cursor.Next(util.Context) {
		var message models.Message
		cursor.Decode(&message)

		var ownKey []byte
		for _, key := range message.Keys {
			if bytes.Equal(key.UserID, cUser.ID) {
				ownKey = key.Key
			}
		}

		formatted = append(formatted, gin.H{
			"id":      util.EncodeBinary(message.ID),
			"userId":  util.EncodeBinary(message.UserID),
			"body":    util.EncodeBinary(message.Body),
			"key":     util.EncodeBinary(ownKey),
			"type":    message.Type,
			"created": message.Created,
		})
	}

	c.JSON(http.StatusOK, formatted)
}
