package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetWantStatusBody struct {
	WantStatus string `json:"wantStatus" binding:"required"`
}

func SetWantStatus(c *gin.Context) {
	var body SetWantStatusBody
	if !util.BindJSON(c, &body) {
		return
	}

	valid := false
	for _, s := range []string{
		"online",
		"away",
		"busy",
		"invisible",
	} {
		if body.WantStatus == s {
			valid = true
			break
		}
	}

	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid status",
		})

		return
	}

	user := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, user.ID, bson.M{
		"$set": bson.M{
			"wantStatus": body.WantStatus,
		},
	})

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OSetWantStatusType,
		Data: events.OSetWantStatus{
			WantStatus: body.WantStatus,
		},
	})

	user.WantStatus = body.WantStatus

	util.BroadcastToRelated(user.ID, events.O{
		Type: events.OForeignUserSetStatusType,
		Data: events.OForeignUserSetStatus{
			ID:     util.EncodeBinary(user.ID),
			Status: util.GetStatus(user),
		},
	})
}
