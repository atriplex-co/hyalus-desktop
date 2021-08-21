package routes

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"github.com/hyalusapp/hyalus/server/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SocketUpgrade(c *gin.Context) {
	conn, err := util.SocketUpgrader.Upgrade(c.Writer, c.Request, nil)

	if err != nil {
		return
	}

	socket := &util.Socket{
		ID:            util.GenerateID(),
		Conn:          conn,
		Open:          true,
		Authenticated: false,
	}

	util.Sockets = append(util.Sockets, socket)

	for {
		_, data, err := conn.ReadMessage()

		if err != nil {
			break
		}

		var msg events.I
		err = json.Unmarshal(data, &msg)

		if err != nil {
			continue
		}

		if msg.Type == events.IStartType {
			var event events.IStart
			json.Unmarshal(msg.Data, &event)

			token, _ := base64.RawURLEncoding.DecodeString(event.Token)
			voiceChannelId, _ := base64.RawURLEncoding.DecodeString(event.VoiceChannelID)

			var cSession models.Session

			if err := util.SessionCollection.FindOneAndUpdate(util.Context, bson.M{
				"token": token,
			}, bson.M{
				"$set": bson.M{
					"agent":     c.Request.UserAgent(),
					"ip":        c.ClientIP(),
					"lastStart": time.Now().UnixNano() / 1e6,
				},
			}).Decode(&cSession); err != nil {
				socket.Write(events.O{
					Type: events.OResetType,
				})
				break
			}

			//means that this is not the first login (on this token).
			if cSession.Created != cSession.LastStart {
				util.BroadcastToUser(cSession.UserID, events.O{
					Type: events.OSessionStartType,
					Data: events.OSessionStarted{
						ID:    base64.RawURLEncoding.EncodeToString(cSession.ID),
						Agent: cSession.Agent,
						IP:    cSession.IP,
					},
				})
			}

			socket.Session = cSession
			socket.Authenticated = true

			var cUser models.User

			util.UserCollection.FindOne(util.Context, bson.M{
				"_id": socket.Session.UserID,
			}).Decode(&cUser)

			formattedFriends := []events.OReady_Friend{}
			formattedChannels := []events.OReady_Channel{}
			formattedSessions := []events.OReady_Session{}
			friendsCursor, _ := util.FriendCollection.Find(util.Context, bson.M{
				"$or": bson.A{
					bson.M{
						"user1Id": cUser.ID,
					},
					bson.M{
						"user2Id": cUser.ID,
					},
				},
			})
			channelCursor, _ := util.ChannelCollection.Find(util.Context, bson.M{
				"users": bson.M{
					"$elemMatch": bson.M{
						"id":     cUser.ID,
						"hidden": false,
					},
				},
			})
			sessionCursor, _ := util.SessionCollection.Find(util.Context, bson.M{
				"userId": cUser.ID,
			})
			defer friendsCursor.Close(util.Context)
			defer channelCursor.Close(util.Context)
			defer sessionCursor.Close(util.Context)

			for friendsCursor.Next(util.Context) {
				var friend models.Friend
				friendsCursor.Decode(&friend)

				var friendUserID []byte
				canAccept := false

				if bytes.Equal(cUser.ID, friend.User2ID) {
					friendUserID = friend.User1ID

					if !friend.Accepted {
						canAccept = true
					}
				} else {
					friendUserID = friend.User2ID
				}

				var friendUser models.User
				util.UserCollection.FindOne(util.Context, bson.M{
					"_id": friendUserID,
				}).Decode(&friendUser)

				formattedFriends = append(formattedFriends, events.OReady_Friend{
					ID:        base64.RawURLEncoding.EncodeToString(friendUser.ID),
					Username:  friendUser.Username,
					Name:      friendUser.Name,
					AvatarID:  base64.RawURLEncoding.EncodeToString(friendUser.AvatarID),
					Accepted:  friend.Accepted,
					CanAccept: canAccept,
				})
			}

			for channelCursor.Next(util.Context) {
				var channel models.Channel
				channelCursor.Decode(&channel)

				var ownUserInfo models.ChannelUser
				var formattedChannelUsers []events.OReady_ChannelUser
				for _, userInfo := range channel.Users {
					if bytes.Equal(userInfo.ID, cUser.ID) {
						ownUserInfo = userInfo
						continue
					}

					var user models.User
					util.UserCollection.FindOne(util.Context, bson.M{
						"_id": userInfo.ID,
					}).Decode(&user)

					voiceSocket := util.GetVoiceSocketFromUserID(user.ID)

					formattedChannelUsers = append(formattedChannelUsers, events.OReady_ChannelUser{
						ID:        base64.RawURLEncoding.EncodeToString(user.ID),
						Username:  user.Username,
						Name:      user.Name,
						AvatarID:  base64.RawURLEncoding.EncodeToString(user.AvatarID),
						PublicKey: base64.RawURLEncoding.EncodeToString(user.PublicKey),
						InVoice:   voiceSocket != nil && bytes.Equal(channel.ID, voiceSocket.VoiceChannelID),
						Hidden:    userInfo.Hidden,
					})
				}

				var lastMessage models.Message
				util.MessageCollection.FindOne(util.Context, bson.M{
					"channelId": channel.ID,
					"created": bson.M{
						"$gte": ownUserInfo.Added,
					},
				}, options.FindOne().SetSort(bson.M{
					"created": -1,
				})).Decode(&lastMessage)

				lastMessageKey := []byte{}
				for _, key := range lastMessage.Keys {
					if bytes.Equal(key.UserID, cUser.ID) {
						lastMessageKey = key.Key
					}
				}

				formattedChannels = append(formattedChannels, events.OReady_Channel{
					ID:       base64.RawURLEncoding.EncodeToString(channel.ID),
					AvatarID: base64.RawURLEncoding.EncodeToString(channel.AvatarID),
					Name:     channel.Name,
					Type:     channel.Type,
					Created:  channel.Created,
					Owner:    ownUserInfo.Owner,
					Users:    formattedChannelUsers,
					LastMessage: events.OReady_ChannelLastMessage{
						ID:      base64.RawURLEncoding.EncodeToString(lastMessage.ID),
						UserID:  base64.RawURLEncoding.EncodeToString(lastMessage.UserID),
						Body:    base64.RawURLEncoding.EncodeToString(lastMessage.Body),
						Key:     base64.RawURLEncoding.EncodeToString(lastMessageKey),
						Type:    lastMessage.Type,
						Created: lastMessage.Created,
					},
				})
			}

			for sessionCursor.Next(util.Context) {
				var session models.Session
				sessionCursor.Decode(&session)

				formattedSessions = append(formattedSessions, events.OReady_Session{
					ID:        base64.RawURLEncoding.EncodeToString(session.ID),
					Agent:     session.Agent,
					IP:        session.IP,
					Created:   session.Created,
					LastStart: session.LastStart,
					Self:      bytes.Equal(session.ID, socket.Session.ID),
				})
			}

			for _, hashText := range event.FileChunks {
				hash, _ := base64.RawURLEncoding.DecodeString(hashText)
				socket.FileChunks = append(socket.FileChunks, hash)
			}

			socket.Write(events.O{
				Type: events.OReadyType,
				Data: events.OReady{
					Proto: util.SocketProto,
					User: events.OReady_User{
						ID:             base64.RawURLEncoding.EncodeToString(cUser.ID),
						Name:           cUser.Name,
						AvatarID:       base64.RawURLEncoding.EncodeToString(cUser.AvatarID),
						Username:       cUser.Username,
						TotpEnabled:    len(cUser.TotpSecret) > 0,
						Created:        cUser.Created,
						AuthKeyUpdated: cUser.AuthKeyUpdated,
						ColorTheme:     cUser.ColorTheme,
						TypingEvents:   cUser.TypingEvents,
					},
					Friends:  formattedFriends,
					Channels: formattedChannels,
					Sessions: formattedSessions,
				},
			})

			if len(voiceChannelId) != 0 {
				util.VoiceStart(socket, voiceChannelId)
			}
		}

		if !socket.Authenticated {
			break
		}

		if msg.Type == events.IFileChunkOwnedType {
			var event events.IFileChunkOwned
			json.Unmarshal(msg.Data, &event)

			hash, _ := base64.RawURLEncoding.DecodeString(event.Hash)
			found := false

			for _, h := range socket.FileChunks {
				if bytes.Equal(h, hash) {
					found = true
				}
			}

			if !found {
				socket.FileChunks = append(socket.FileChunks, hash)
			}
		}

		if msg.Type == events.IFileChunkLostType {
			var event events.IFileChunkLost
			json.Unmarshal(msg.Data, &event)

			hash, _ := base64.RawURLEncoding.DecodeString(event.Hash)
			var new [][]byte

			for _, h := range socket.FileChunks {
				if !bytes.Equal(h, hash) {
					new = append(new, h)
				}
			}

			socket.FileChunks = new
		}

		if msg.Type == events.IFileChunkGetType {
			var event events.IFileChunkGet
			json.Unmarshal(msg.Data, &event)

			hash, _ := base64.RawURLEncoding.DecodeString(event.Hash)
			var hasSockets []*util.Socket

			for _, s := range util.Sockets {
				has := false

				for _, h := range s.FileChunks {
					if bytes.Equal(h, hash) {
						has = true
					}
				}

				if has {
					hasSockets = append(hasSockets, s)
				}
			}

			rand.Shuffle(len(hasSockets), func(i, j int) {
				hasSockets[i], hasSockets[j] = hasSockets[j], hasSockets[i]
			})

			if len(hasSockets) > 5 {
				hasSockets = hasSockets[:5]
			}

			for _, s := range hasSockets {
				s.Write(events.O{
					Type: events.OFileChunkRequestType,
					Data: events.OFileChunkRequest{
						Hash:     event.Hash,
						SocketID: base64.RawURLEncoding.EncodeToString(socket.ID),
					},
				})
			}
		}

		if msg.Type == events.IFileChunkRTCType {
			var event events.IFileChunkRTC
			json.Unmarshal(msg.Data, &event)

			socketID, _ := base64.RawURLEncoding.DecodeString(event.SocketID)
			target := -1

			for i, s := range util.Sockets {
				if bytes.Equal(s.ID, socketID) {
					target = i
				}
			}

			if target == -1 {
				continue
			}

			util.Sockets[target].Write(events.O{
				Type: events.OFileChunkRTCType,
				Data: events.OFileChunkRTC{
					SocketID:    base64.RawURLEncoding.EncodeToString(socket.ID),
					Hash:        event.Hash,
					Payload:     event.Payload,
					PayloadType: event.PayloadType,
				},
			})
		}

		if msg.Type == events.IVoiceStartType {
			var event events.IVoiceStart
			json.Unmarshal(msg.Data, &event)

			channelID, _ := base64.RawURLEncoding.DecodeString(event.ChannelID)

			util.VoiceStart(socket, channelID)
		}

		if msg.Type == events.IVoiceStopType {
			util.VoiceStop(socket)
		}

		if msg.Type == events.IVoiceRTCType {
			var event events.IVoiceRTC
			json.Unmarshal(msg.Data, &event)

			userID, _ := base64.RawURLEncoding.DecodeString(event.UserID)
			userVoiceSocket := util.GetVoiceSocketFromUserID(userID)

			if userVoiceSocket == nil || !bytes.Equal(socket.VoiceChannelID, userVoiceSocket.VoiceChannelID) {
				continue
			}

			userVoiceSocket.Write(events.O{
				Type: events.OVoiceRTCType,
				Data: events.OVoiceRTC{
					UserID:  base64.RawURLEncoding.EncodeToString(socket.Session.UserID),
					Payload: event.Payload,
				},
			})
		}
	}

	conn.Close()
	socket.Open = false
	time.Sleep(5 * time.Second)

	if socket.Authenticated {
		voiceSocket := util.GetVoiceSocketFromUserID(socket.Session.UserID)

		if voiceSocket == socket {
			util.VoiceStop(socket)
		}
	}

	var newSockets []*util.Socket

	for _, s := range util.Sockets {
		if s != socket {
			newSockets = append(newSockets, s)
		}
	}

	util.Sockets = newSockets
}
