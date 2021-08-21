package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/websocket"
	"github.com/hyalusapp/hyalus/server/routes"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	port := os.Getenv("PORT")
	dbUrl := os.Getenv("DB")

	if port == "" {
		port = "4000"
	}

	if dbUrl == "" {
		dbUrl = "mongodb://localhost"
	}

	util.Context = context.TODO()

	dbClient, err := mongo.Connect(util.Context, options.Client().ApplyURI(dbUrl))

	if err != nil {
		panic(err)
	}

	util.DB = dbClient.Database("hyalus")

	util.UserCollection = util.DB.Collection("user")
	util.SessionCollection = util.DB.Collection("session")
	util.FriendCollection = util.DB.Collection("friend")
	util.ChannelCollection = util.DB.Collection("channel")
	util.MessageCollection = util.DB.Collection("message")
	util.AvatarCollection = util.DB.Collection("avatar")
	util.LimitCollection = util.DB.Collection("limit")

	util.SocketUpgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	util.Server = gin.New()

	util.Server.Use(gin.Logger())
	util.Server.Use(gin.Recovery())

	util.Server.NoRoute(func(c *gin.Context) {
		wd, _ := os.Getwd()
		path := c.Request.URL.Path

		if strings.Contains(path, "/assets") {
			c.Header("cache-control", "public, max-age=31536000")

			parts := strings.SplitAfter(path, "/assets")
			log.Println(parts)
			if len(parts) > 1 {
				path = fmt.Sprintf("/assets/%s", parts[1])
			}
		}

		path = filepath.Join(wd, "dist", path)

		if _, err := os.Stat(path); err != nil {
			path = filepath.Join(wd, "dist/index.html")
		}

		c.File(path)
	})

	util.Server.GET("/api/ws", routes.SocketUpgrade)
	util.Server.POST("/api/register", routes.Register)
	util.Server.POST("/api/prelogin", routes.Prelogin)
	util.Server.POST("/api/login", routes.Login)
	util.Server.GET("/api/avatars/:avatarId", routes.GetAvatar)
	util.Server.GET("/api/users/:username", routes.GetUser)

	authorized := util.Server.Group("/")
	authorized.Use(util.AuthMiddleware)
	authorized.GET("/api/logout", routes.Logout)
	authorized.POST("/api/me/username", routes.SetUsername)
	authorized.POST("/api/me/name", routes.SetName)
	authorized.POST("/api/me/avatar", routes.SetAvatar)
	authorized.POST("/api/me/authKey", routes.SetAuthKey)
	authorized.POST("/api/me/colorTheme", routes.SetColorTheme)
	authorized.POST("/api/me/typingEvents", routes.SetTypingEvents)
	authorized.POST("/api/totp/enable", routes.TotpEnable)
	authorized.POST("/api/totp/disable", routes.TotpDisable)
	authorized.DELETE("/api/sessions/:sessionId", routes.DeleteSession)
	authorized.POST("/api/friends", routes.CreateFriend)
	authorized.GET("/api/friends/:friendId/accept", routes.AcceptFriend)
	authorized.DELETE("/api/friends/:friendId", routes.DeleteFriend)
	authorized.POST("/api/channels", routes.CreateChannel)
	authorized.GET("/api/channels/:channelId/messages", routes.GetMessages)
	authorized.POST("/api/channels/:channelId/messages", routes.CreateMessage)
	authorized.DELETE("/api/channels/:channelId/messages/:messageId", routes.DeleteMessage)
	authorized.POST("/api/channels/:channelId/name", routes.SetGroupName)
	authorized.POST("/api/channels/:channelId/avatar", routes.SetGroupAvatar)
	authorized.POST("/api/channels/:channelId/users", routes.GroupAdd)
	authorized.DELETE("/api/channels/:channelId/users/:userId", routes.GroupRemove)
	authorized.DELETE("/api/channels/:channelId", routes.DeleteChannel)

	validate := binding.Validator.Engine().(*validator.Validate)
	validate.RegisterValidation("base64url", util.ValidateBase64URL)
	validate.RegisterValidation("base64urlmin", util.ValidateBase64URLMin)
	validate.RegisterValidation("base64urlmax", util.ValidateBase64URLMax)
	validate.RegisterValidation("base64urlexact", util.ValidateBase64URLExact)
	validate.RegisterValidation("totpSecret", util.ValidateTotpSecret)
	validate.RegisterValidation("username", util.ValidateUsername)
	util.Validate = validate

	util.Server.Run(fmt.Sprintf(":%s", port))
}
