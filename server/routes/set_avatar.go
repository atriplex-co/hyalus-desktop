package routes

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

func SetAvatar(c *gin.Context) {
	header, err := c.FormFile("avatar")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing avatar",
		})

		return
	}

	if header.Size > 20*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Avatar is too large",
		})

		return
	}

	file, err := header.Open()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to open avatar",
		})

		return
	}

	avatar := util.ProcessAvatar(file)

	if avatar == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid avatar data",
		})

		return
	}

	cUser := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"avatarId": avatar,
		},
	})

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OSetAvatarIDType,
		Data: events.OSetAvatarID{
			AvatarID: base64.RawURLEncoding.EncodeToString(avatar),
		},
	})

	util.BroadcastToRelated(cUser.ID, events.O{
		Type: events.OForeignUserSetAvatarIDType,
		Data: events.OForeignUserSetAvatarID{
			ID:       base64.RawURLEncoding.EncodeToString(cUser.ID),
			AvatarID: base64.RawURLEncoding.EncodeToString(avatar),
		},
	})
}
