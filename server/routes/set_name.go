package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetNameBody struct {
	Name string `json:"name" binding:"required,min=3,max=32,regexp=^[a-zA-Z0-9_-]$"`
}

func SetName(c *gin.Context) {
	var body SetNameBody

	if !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"name": body.Name,
		},
	})

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OSetNameType,
		Data: events.OSetName{
			Name: body.Name,
		},
	})

	util.BroadcastToRelated(cUser.ID, events.O{
		Type: events.OForeignUserSetNameType,
		Data: events.OForeignUserSetName{
			ID:   util.EncodeBinary(cUser.ID),
			Name: body.Name,
		},
	})
}
