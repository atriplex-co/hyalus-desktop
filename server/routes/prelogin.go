package routes

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
)

type PreloginBody struct {
	Username string `json:"username" binding:"required,username"`
}

func Prelogin(c *gin.Context) {
	var body PreloginBody
	if !util.BindJSON(c, &body) {
		return
	}

	var user models.User
	if util.UserCollection.FindOne(util.Context, bson.M{
		"username": strings.ToLower(body.Username),
	}).Decode(&user) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid username",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"salt": util.EncodeBinary(user.Salt),
	})
}
