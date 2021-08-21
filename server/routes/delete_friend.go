package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type DeleteFriendUri struct {
	FriendID string `uri:"friendId" binding:"required,base64urlexact=16"`
}

func DeleteFriend(c *gin.Context) {
	var uri DeleteFriendUri
	if !util.BindUri(c, &uri) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	friendID := util.DecodeBinary(uri.FriendID)

	var friend models.Friend
	if util.FriendCollection.FindOneAndDelete(util.Context, bson.M{
		"$or": bson.A{
			bson.M{
				"user1Id": cUser.ID,
				"user2Id": friendID,
			},
			bson.M{
				"user1Id": friendID,
				"user2Id": cUser.ID,
			},
		},
	}).Decode(&friend) != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Friend not found",
		})

		return
	}

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OFriendDeleteType,
		Data: events.OFriendDelete{
			ID: util.EncodeBinary(friendID),
		},
	})

	util.BroadcastToUser(friendID, events.O{
		Type: events.OFriendDeleteType,
		Data: events.OFriendDelete{
			ID: util.EncodeBinary(cUser.ID),
		},
	})
}
