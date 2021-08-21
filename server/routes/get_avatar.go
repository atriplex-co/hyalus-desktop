package routes

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type GetAvatarURI struct {
	AvatarID string `uri:"avatarId" binding:"required,base64urlexact=32"`
}

func GetAvatar(c *gin.Context) {
	var uri GetAvatarURI
	if !util.BindUri(c, &uri) {
		return
	}

	id, _ := base64.RawURLEncoding.DecodeString(uri.AvatarID)

	var avatar models.Avatar
	if err := util.AvatarCollection.FindOne(util.Context, bson.M{
		"_id": id,
	}).Decode(&avatar); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Avatar not found",
		})

		return
	}

	c.Header("cache-control", "public, max-age=31536000")
	c.Data(http.StatusOK, avatar.Type, avatar.Data)
}
