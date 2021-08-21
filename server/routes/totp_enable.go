package routes

import (
	"bytes"
	"encoding/base32"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type TotpEnableBody struct {
	AuthKey    string `json:"authKey" binding:"required,base64urlexact=32"`
	TotpSecret string `json:"totpSecret" binding:"required,totpSecret"`
	TotpCode   string `json:"totpCode" binding:"required,len=6"`
}

func TotpEnable(c *gin.Context) {
	var body TotpEnableBody
	if !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)

	if len(cUser.TotpSecret) != 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "2FA is already enabled",
		})

		return
	}

	authKey := util.DecodeBinary(body.AuthKey)

	if !bytes.Equal(authKey, cUser.AuthKey) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid password",
		})

		return
	}

	totpSecret, _ := base32.StdEncoding.DecodeString(body.TotpSecret)

	if !util.CheckTOTPCode(body.TotpCode, totpSecret) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid 2FA code",
		})

		return
	}

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"totpSecret": totpSecret,
		},
	})

	util.BroadcastToUser(cUser.ID, events.O{
		Type: events.OSetTotpEnabledType,
		Data: events.OSetTotpEnabled{
			TotpEnabled: true,
		},
	})
}
