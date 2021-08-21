package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetColorThemeBody struct {
	ColorTheme string `json:"colorTheme" binding:"required"`
}

func SetColorTheme(c *gin.Context) {
	var body SetColorThemeBody
	if !util.BindJSON(c, &body) {
		return
	}

	valid := false
	validOptions := []string{
		"red",
		"orange",
		"amber",
		"yellow",
		"lime",
		"green",
		"emerald",
		"teal",
		"cyan",
		"sky",
		"blue",
		"indigo",
		"violet",
		"purple",
		"fuchsia",
		"pink",
		"rose",
	}

	for _, opt := range validOptions {
		if body.ColorTheme == opt {
			valid = true
			break
		}
	}

	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Unsupported color theme",
		})

		return
	}

	user := c.MustGet("user").(models.User)

	util.UserCollection.UpdateByID(util.Context, user.ID, bson.M{
		"$set": bson.M{
			"colorTheme": body.ColorTheme,
		},
	})

	util.BroadcastToUser(user.ID, events.O{
		Type: events.OSetColorThemeType,
		Data: events.OSetColorTheme{
			ColorTheme: body.ColorTheme,
		},
	})
}
