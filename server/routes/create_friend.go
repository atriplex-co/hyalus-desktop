package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type CreateFriendBody struct {
	Username string `json:"username" binding:"required,username"`
}

func CreateFriend(c *gin.Context) {
	var body CreateFriendBody
	if !util.BindJSON(c, &body) {
		return
	}

	if strings.ToLower(body.Username) == "deleted" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Can't add deleted users",
		})

		return
	}

	cUser := c.MustGet("user").(models.User)
	if cUser.Username == strings.ToLower(body.Username) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Are you really that lonely?",
		})

		return
	}

	var user models.User
	if util.UserCollection.FindOne(util.Context, bson.M{
		"username": strings.ToLower(body.Username),
	}).Decode(&user) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Username not found",
		})

		return
	}

	var friend models.Friend
	if err := util.FriendCollection.FindOne(util.Context, bson.M{
		"$or": bson.A{
			bson.M{
				"user1Id": cUser.ID,
				"user2Id": user.ID,
			},
			bson.M{
				"user1Id": user.ID,
				"user2Id": cUser.ID,
			},
		},
	}).Decode(&friend); err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Already friends or have a pending request",
		})

		return
	}

	friend = models.Friend{
		User1ID:  cUser.ID,
		User2ID:  user.ID,
		Accepted: false,
		Created:  time.Now(),
	}

	util.FriendCollection.InsertOne(util.Context, &friend)

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OFriendCreateType,
		Data: events.OFriendCreate{
			ID:        util.EncodeBinary(user.ID),
			Username:  user.Username,
			Name:      user.Name,
			AvatarID:  util.EncodeBinary(user.AvatarID),
			Accepted:  false,
			CanAccept: false,
		},
	})

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OFriendCreateType,
		Data: events.OFriendCreate{
			ID:        util.EncodeBinary(cUser.ID),
			Username:  cUser.Username,
			Name:      cUser.Name,
			AvatarID:  util.EncodeBinary(cUser.AvatarID),
			Accepted:  false,
			CanAccept: true,
		},
	})
}
