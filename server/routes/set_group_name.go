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

type SetGroupNameUri struct {
	ChannelID string `uri:"channelId" binding:"required,base64urlexact=16"`
}

type SetGroupNameBody struct {
	Name string `json:"name" binding:"required,min=1,max=32"`
}

func SetGroupName(c *gin.Context) {
	var uri SetGroupNameUri
	var body SetGroupNameBody
	if !util.BindUri(c, &uri) || !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	channelID := util.DecodeBinary(uri.ChannelID)

	res, _ := util.ChannelCollection.UpdateOne(util.Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     cUser.ID,
				"hidden": false,
				"owner":  true,
			},
		},
	}, bson.M{
		"$set": bson.M{
			"name": body.Name,
		},
	})

	if res.MatchedCount < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Channel not found",
		})

		return
	}

	util.BroadcastToChannel(channelID, events.O{
		Type: events.OChannelSetNameType,
		Data: events.OChannelSetName{
			ID:   uri.ChannelID,
			Name: body.Name,
		},
	})

	message := models.Message{
		ID:        util.GenerateID(),
		ChannelID: channelID,
		UserID:    cUser.ID,
		Type:      "groupName",
		Body:      []byte(body.Name),
		Created:   time.Now().UnixNano() / 1e6,
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
			Created:   message.Created,
		},
	})
}
