package routes

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type GetUserUri struct {
	Username string `uri:"username" binding:"required,required,alphanum,min=3,max=32"`
}

func GetUser(c *gin.Context) {
	var uri GetUserUri
	if !util.BindUri(c, &uri) {
		return
	}

	var user models.User

	if err := util.UserCollection.FindOne(util.Context, bson.M{
		"username": uri.Username,
	}).Decode(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid username",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        base64.RawURLEncoding.EncodeToString(user.ID),
		"username":  user.Username,
		"name":      user.Name,
		"avatarId":  base64.RawURLEncoding.EncodeToString(user.AvatarID),
		"publicKey": base64.RawURLEncoding.EncodeToString(user.PublicKey),
	})
}
