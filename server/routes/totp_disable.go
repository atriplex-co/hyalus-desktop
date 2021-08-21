package routes

import (
	"bytes"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type TotpDisableBody struct {
	AuthKey string `json:"authKey" binding:"required,base64urlexact=32"`
}

func TotpDisable(c *gin.Context) {
	var body TotpDisableBody
	if !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	authKey, _ := base64.RawURLEncoding.DecodeString(body.AuthKey)

	if !bytes.Equal(authKey, cUser.AuthKey) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid password",
		})

		return
	}

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"totpSecret": []byte{},
		},
	})

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OSetTotpEnabledType,
		Data: events.OSetTotpEnabled{
			TotpEnabled: false,
		},
	})
}
