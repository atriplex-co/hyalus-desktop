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

type SetUsernameBody struct {
	Username string `json:"username" binding:"required,alphanum,min=3,max=32"`
}

func SetUsername(c *gin.Context) {
	var body SetUsernameBody

	if !util.BindJSON(c, &body) {
		return
	}

	conflict, _ := util.UserCollection.CountDocuments(util.Context, bson.M{
		"username": body.Username,
	})

	if conflict > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Username already in use",
		})

		return
	}

	cUser := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"username": body.Username,
		},
	})

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OSetUsernameType,
		Data: events.OSetUsername{
			Username: body.Username,
		},
	})

	util.BroadcastToRelated(cUser.ID, events.O{
		Type: events.OForeignUserSetUsernameType,
		Data: events.OForeignUserSetUsername{
			ID:       base64.RawURLEncoding.EncodeToString(cUser.ID),
			Username: body.Username,
		},
	})
}
