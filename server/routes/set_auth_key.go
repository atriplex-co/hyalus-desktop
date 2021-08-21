package routes

import (
	"bytes"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type SetAuthKeyBody struct {
	OldAuthKey string `json:"oldAuthKey" binding:"required,base64urlexact=32"`
	Salt       string `json:"salt" binding:"required,base64urlexact=16"`
	AuthKey    string `json:"authKey" binding:"required,base64urlexact=32"`
	PrivateKey string `json:"privateKey" binding:"required,base64urlexact=72"`
}

func SetAuthKey(c *gin.Context) {
	var body SetAuthKeyBody
	if !util.BindJSON(c, &body) {
		return
	}

	cUser := c.MustGet("user").(models.User)
	oldAuthKey, _ := base64.RawURLEncoding.DecodeString(body.OldAuthKey)
	salt, _ := base64.RawURLEncoding.DecodeString(body.Salt)
	authKey, _ := base64.RawURLEncoding.DecodeString(body.AuthKey)
	privateKey, _ := base64.RawURLEncoding.DecodeString(body.PrivateKey)

	if !bytes.Equal(oldAuthKey, cUser.AuthKey) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid password",
		})
		return
	}

	util.UserCollection.UpdateByID(util.Context, cUser.ID, bson.M{
		"$set": bson.M{
			"salt":       salt,
			"authKey":    authKey,
			"privateKey": privateKey,
		},
	})
}
