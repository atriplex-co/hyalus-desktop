package routes

import (
	"bytes"
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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

	socket := util.NewSocket(conn)

	go func() {
		alive := true

		socket.Conn.SetPongHandler(func(appData string) error {
			alive = true
			return nil
		})

		for socket.Open {
			time.Sleep(30 * time.Second)

			if !alive {
				socket.Close()
				return
			}

			socket.Write(websocket.PingMessage, util.GenerateID())
			alive = false
		}
	}()

	go func() {
		for socket.Open {
			t, data, err := conn.ReadMessage()

			if err != nil {
				log.Println("here 1")
				log.Println(err)
				break
			}

			if t != websocket.TextMessage {
				continue
			}

			var msg events.I
			err = json.Unmarshal(data, &msg)

			if err != nil {
				continue
			}

			if msg.Type == events.IStartType {
				var event events.IStart
				json.Unmarshal(msg.Data, &event)

				token := util.DecodeBinary(event.Token)
				voiceChannelId := util.DecodeBinary(event.VoiceChannelID)

				var cSession models.Session

				if util.SessionCollection.FindOneAndUpdate(util.Context, bson.M{
					"token": token,
				}, bson.M{
					"$set": bson.M{
						"agent":     c.Request.UserAgent(),
						"ip":        c.ClientIP(),
						"lastStart": time.Now().UnixNano() / 1e6,
					},
				}).Decode(&cSession) != nil {
					socket.WriteJSON(events.O{
						Type: events.OResetType,
					})
					break
				}

				//means that this is not the first login (on this token).
				if cSession.Created != cSession.LastStart {
					util.BroadcastToUser(cSession.UserID, events.O{
						Type: events.OSessionStartType,
						Data: events.OSessionStarted{
							ID:    util.EncodeBinary(cSession.ID),
							Agent: cSession.Agent,
							IP:    cSession.IP,
						},
					})
				}

				socket.Session = cSession
				socket.Ready = true

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
						ID:        util.EncodeBinary(friendUser.ID),
						Username:  friendUser.Username,
						Name:      friendUser.Name,
						AvatarID:  util.EncodeBinary(friendUser.AvatarID),
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
							ID:        util.EncodeBinary(user.ID),
							Username:  user.Username,
							Name:      user.Name,
							AvatarID:  util.EncodeBinary(user.AvatarID),
							PublicKey: util.EncodeBinary(user.PublicKey),
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
						ID:       util.EncodeBinary(channel.ID),
						AvatarID: util.EncodeBinary(channel.AvatarID),
						Name:     channel.Name,
						Type:     channel.Type,
						Created:  channel.Created,
						Owner:    ownUserInfo.Owner,
						Users:    formattedChannelUsers,
						LastMessage: events.OReady_ChannelLastMessage{
							ID:      util.EncodeBinary(lastMessage.ID),
							UserID:  util.EncodeBinary(lastMessage.UserID),
							Body:    util.EncodeBinary(lastMessage.Body),
							Key:     util.EncodeBinary(lastMessageKey),
							Type:    lastMessage.Type,
							Created: lastMessage.Created,
						},
					})
				}

				for sessionCursor.Next(util.Context) {
					var session models.Session
					sessionCursor.Decode(&session)

					formattedSessions = append(formattedSessions, events.OReady_Session{
						ID:        util.EncodeBinary(session.ID),
						Agent:     session.Agent,
						IP:        session.IP,
						Created:   session.Created,
						LastStart: session.LastStart,
						Self:      bytes.Equal(session.ID, socket.Session.ID),
					})
				}

				for _, hashText := range event.FileChunks {
					hash := util.DecodeBinary(hashText)
					socket.FileChunks = append(socket.FileChunks, hash)
				}

				socket.WriteJSON(events.O{
					Type: events.OReadyType,
					Data: events.OReady{
						Proto: util.SocketProto,
						User: events.OReady_User{
							ID:             util.EncodeBinary(cUser.ID),
							Name:           cUser.Name,
							AvatarID:       util.EncodeBinary(cUser.AvatarID),
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
					socket.VoiceStart(voiceChannelId)
				}
			}

			if !socket.Ready {
				continue
			}

			if msg.Type == events.IFileChunkOwnedType {
				var event events.IFileChunkOwned
				json.Unmarshal(msg.Data, &event)

				hash := util.DecodeBinary(event.Hash)
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

				hash := util.DecodeBinary(event.Hash)
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

				hash := util.DecodeBinary(event.Hash)
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

				if len(hasSockets) > 0 {
					hasSockets[0].WriteJSON(events.O{
						Type: events.OFileChunkRequestType,
						Data: events.OFileChunkRequest{
							Hash:     event.Hash,
							SocketID: util.EncodeBinary(socket.ID),
						},
					})
				}
			}

			if msg.Type == events.IFileChunkRTCType {
				var event events.IFileChunkRTC
				json.Unmarshal(msg.Data, &event)

				socketID := util.DecodeBinary(event.SocketID)
				target := -1

				for i, s := range util.Sockets {
					if bytes.Equal(s.ID, socketID) {
						target = i
					}
				}

				if target == -1 {
					continue
				}

				util.Sockets[target].WriteJSON(events.O{
					Type: events.OFileChunkRTCType,
					Data: events.OFileChunkRTC{
						SocketID:    util.EncodeBinary(socket.ID),
						Hash:        event.Hash,
						Payload:     event.Payload,
						PayloadType: event.PayloadType,
					},
				})
			}

			if msg.Type == events.IVoiceStartType {
				var event events.IVoiceStart
				json.Unmarshal(msg.Data, &event)

				socket.VoiceStart(util.DecodeBinary(event.ChannelID))
			}

			if msg.Type == events.IVoiceStopType {
				socket.VoiceStop()
			}

			if msg.Type == events.IVoiceRTCType {
				var event events.IVoiceRTC
				json.Unmarshal(msg.Data, &event)

				userID := util.DecodeBinary(event.UserID)
				userVoiceSocket := util.GetVoiceSocketFromUserID(userID)

				if userVoiceSocket == nil || !bytes.Equal(socket.VoiceChannelID, userVoiceSocket.VoiceChannelID) {
					continue
				}

				userVoiceSocket.WriteJSON(events.O{
					Type: events.OVoiceRTCType,
					Data: events.OVoiceRTC{
						UserID:  util.EncodeBinary(socket.Session.UserID),
						Payload: event.Payload,
					},
				})
			}
		}

		socket.Close()
	}()
}
