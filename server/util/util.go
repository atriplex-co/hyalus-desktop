package util

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash"
	"io"
	"log"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/gorilla/websocket"
	"github.com/hyalusapp/hyalus/server/events"
	"github.com/hyalusapp/hyalus/server/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

const SocketProto = 1
const MaxAvatarInputWidth = 4096
const MaxAvatarInputHeight = 4096
const MaxAvatarDuration = 10
const EncodedAvatarPixels = 256
const EncodedAvatarFPS = 30

var Server *gin.Engine
var Context context.Context
var DB *mongo.Database
var UserCollection *mongo.Collection
var SessionCollection *mongo.Collection
var FriendCollection *mongo.Collection
var ChannelCollection *mongo.Collection
var MessageCollection *mongo.Collection
var AvatarCollection *mongo.Collection
var LimitCollection *mongo.Collection
var SocketUpgrader websocket.Upgrader
var Validate *validator.Validate
var Sockets []*Socket

type Socket struct {
	ID             []byte
	Conn           *websocket.Conn
	ConnMutex      sync.Mutex
	Session        models.Session
	FileChunks     [][]byte
	Open           bool
	Ready          bool
	VoiceChannelID []byte
}

func NewSocket(conn *websocket.Conn) *Socket {
	Sockets = append(Sockets, &Socket{
		ID:    GenerateID(),
		Conn:  conn,
		Open:  true,
		Ready: false,
	})

	return Sockets[len(Sockets)-1]
}

func (s *Socket) Write(t int, d []byte) {
	if !s.Open {
		return
	}

	s.ConnMutex.Lock()
	s.Conn.SetWriteDeadline(time.Now().Add(60 * time.Second))
	s.Conn.WriteMessage(t, d)
	s.ConnMutex.Unlock()
}

func (s *Socket) WriteJSON(e events.O) {
	d, _ := json.Marshal(e)
	s.Write(websocket.TextMessage, d)

	if e.Type == events.OResetType {
		s.Conn.Close()
	}
}

func (s *Socket) Close() {
	s.Open = false
	s.Conn.Close()

	if s.Ready && s.VoiceChannelID != nil {
		s.VoiceStop()
	}

	var newSockets []*Socket

	for _, s2 := range Sockets {
		if s2 != s {
			newSockets = append(newSockets, s2)
		}
	}

	Sockets = newSockets
}

func HandleBindErrors(c *gin.Context, err error) bool {
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.(validator.ValidationErrors)[0].Error(),
		})

		return false
	}

	return true
}

func BindJSON(c *gin.Context, obj interface{}) bool {
	return HandleBindErrors(c, c.ShouldBindJSON(obj))
}

func BindUri(c *gin.Context, obj interface{}) bool {
	return HandleBindErrors(c, c.ShouldBindUri(obj))
}

func ValidateBase64URL(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" {
		return false
	}

	if len(DecodeBinary(fl.Field().String())) == 0 {
		return false
	}

	return true
}

func ValidateBase64URLMin(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" {
		return false
	}

	data, err := base64.RawURLEncoding.DecodeString(fl.Field().String())

	if err != nil {
		return false
	}

	expected, _ := strconv.Atoi(fl.Param())
	return len(data) >= expected
}

func ValidateBase64URLMax(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" {
		return false
	}

	data, err := base64.RawURLEncoding.DecodeString(fl.Field().String())

	if err != nil {
		return false
	}

	expected, _ := strconv.Atoi(fl.Param())
	return len(data) <= expected
}

func ValidateBase64URLExact(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" {
		return false
	}

	data, err := base64.RawURLEncoding.DecodeString(fl.Field().String())

	if err != nil {
		return false
	}

	expected, _ := strconv.Atoi(fl.Param())
	return len(data) == expected
}

func ValidateTotpSecret(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" {
		return false
	}

	data, err := base32.HexEncoding.DecodeString(fl.Field().String())

	return err != nil || len(data) != 32
}

func ValidateUsername(fl validator.FieldLevel) bool {
	if fl.Field().Type().String() != "string" ||
		!regexp.MustCompile("^[a-zA-Z0-9_-]{3,32}$").MatchString(fl.Field().String()) {
		return false
	}

	return true
}

func AuthMiddleware(c *gin.Context) {
	header := c.GetHeader("Authorization")

	if header == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Missing authorization header",
		})

		return
	}

	token, err := base64.RawURLEncoding.DecodeString(header)

	if err != nil || len(token) != 32 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token",
		})

		return
	}

	var session models.Session
	SessionCollection.FindOne(Context, bson.M{
		"token": token,
	}).Decode(&session)

	var user models.User
	UserCollection.FindOne(Context, bson.M{
		"_id": session.UserID,
	}).Decode(&user)

	c.Set("session", session)
	c.Set("user", user)
	c.Next()
}

func BroadcastToUser(userID []byte, msg events.O) {
	for _, socket := range Sockets {
		if bytes.Equal(userID, socket.Session.UserID) {
			socket.WriteJSON(msg)
		}
	}
}

func BroadcastToSession(sessionID []byte, msg events.O) {
	for _, socket := range Sockets {
		if bytes.Equal(sessionID, socket.Session.ID) {
			socket.WriteJSON(msg)
		}
	}
}

func BroadcastToChannel(channelID []byte, msg events.O) {
	var channel models.Channel
	ChannelCollection.FindOne(Context, bson.M{
		"_id": channelID,
	}).Decode(&channel)

	for _, userInfo := range channel.Users {
		if userInfo.Hidden {
			continue
		}

		BroadcastToUser(userInfo.ID, msg)
	}
}

func BroadcastToChannelOther(channelID []byte, userID []byte, msg events.O) {
	var channel models.Channel
	ChannelCollection.FindOne(Context, bson.M{
		"_id": channelID,
	}).Decode(&channel)

	for _, userInfo := range channel.Users {
		if userInfo.Hidden || bytes.Equal(userInfo.ID, userID) {
			continue
		}

		BroadcastToUser(userInfo.ID, msg)
	}
}

func BroadcastToRelated(userID []byte, message events.O) {
	targets := [][]byte{}

	addTarget := func(id []byte) {
		for _, target := range targets {
			if bytes.Equal(id, target) {
				return
			}
		}

		targets = append(targets, id)
	}

	friendCursor, _ := FriendCollection.Find(Context, bson.M{
		"$or": bson.A{
			bson.M{
				"user1Id": userID,
			},
			bson.M{
				"user2Id": userID,
			},
		},
	})

	for friendCursor.Next(Context) {
		var friend models.Friend
		friendCursor.Decode(&friend)

		var friendTarget []byte

		if bytes.Equal(userID, friend.User2ID) {
			friendTarget = friend.User1ID
		} else {
			friendTarget = friend.User2ID
		}

		addTarget(friendTarget)
	}

	channelCursor, _ := ChannelCollection.Find(Context, bson.M{
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     userID,
				"hidden": false,
			},
		},
	})

	for channelCursor.Next(Context) {
		var channel models.Channel
		channelCursor.Decode(&channel)

		for _, userInfo := range channel.Users {
			if !bytes.Equal(userInfo.ID, userID) {
				addTarget(userInfo.ID)
			}
		}
	}

	for _, target := range targets {
		BroadcastToUser(target, message)
	}
}

func GenerateID() []byte {
	b := make([]byte, 16)
	rand.Read(b)
	return b
}

func GenerateToken() []byte {
	b := make([]byte, 32)
	rand.Read(b)
	return b
}

func ProcessAvatar(file multipart.File) []byte {
	inData, err := io.ReadAll(file)

	if err != nil {
		return nil
	}

	hash := sha256.Sum256(inData)

	if found, _ := AvatarCollection.CountDocuments(Context, bson.M{
		"_id": hash[:],
	}); found > 0 {
		return hash[:]
	}

	tmpIn, _ := os.CreateTemp("", "")
	tmpOut, _ := os.CreateTemp("", "")

	tmpIn.Write(inData)
	tmpIn.Close()
	tmpOut.Close()

	defer os.Remove(tmpIn.Name())
	defer os.Remove(tmpOut.Name())

	ffprobe, _ := exec.Command(
		"ffprobe",
		"-i",
		tmpIn.Name(),
		"-show_format",
		"-show_streams",
	).Output()

	valid := false
	width := 0
	height := 0
	duration := 0.0
	cropWidth := 0
	cropX := 0
	cropY := 0
	outType := ""

	for _, line := range strings.Split(string(ffprobe), "\n") {
		if line == "codec_type=video" {
			valid = true
		}

		if strings.HasPrefix(line, "width=") {
			width, _ = strconv.Atoi(line[6:])
		}

		if strings.HasPrefix(line, "height=") {
			height, _ = strconv.Atoi(line[7:])
		}

		if strings.HasPrefix(line, "duration=") && line != "duration=N/A" {
			duration, _ = strconv.ParseFloat(line[9:], 32)
		}
	}

	if !valid || width > MaxAvatarInputWidth || height > MaxAvatarInputHeight {
		return nil
	}

	if width > height {
		cropWidth = height
		cropX = (width - height) / 2
		cropY = 0
	} else {
		cropWidth = width
		cropX = 0
		cropY = (height - width) / 2
	}

	args := []string{
		"-i",
		tmpIn.Name(),
	}

	if duration == 0 {
		args = append(
			args,
			"-vf",
			fmt.Sprintf(
				"crop=%d:%d:%d:%d,scale=%d:%d",
				cropWidth,
				cropWidth,
				cropX,
				cropY,
				EncodedAvatarPixels,
				EncodedAvatarPixels,
			),
			"-c:v",
			"libwebp",
			"-q:v",
			"80",
			"-compression_level",
			"6",
			"-pix_fmt",
			"yuva420p",
			"-an",
			"-sn",
			"-f",
			"webp",
			"-y",
			tmpOut.Name(),
		)

		outType = "image/webp"
	} else {
		if duration > MaxAvatarDuration {
			args = append(
				args,
				"-t",
				fmt.Sprint(MaxAvatarDuration),
			)
		}

		args = append(
			args,
			"-f",
			"lavfi",
			"-i",
			"color=181818",
			"-filter_complex",
			fmt.Sprintf(
				"[0]crop=%d:%d:%d:%d[fg],[fg]scale=%d:%d[fg],[fg]fps=%d[fg],[1]scale=%d:%d[bg],[bg]setsar=1[bg],[bg][fg]overlay=shortest=1",
				cropWidth,
				cropWidth,
				cropX,
				cropY,
				EncodedAvatarPixels,
				EncodedAvatarPixels,
				EncodedAvatarFPS,
				EncodedAvatarPixels,
				EncodedAvatarPixels,
			),
			"-c:v",
			"libx264",
			"-preset",
			"veryfast",
			"-crf",
			"30",
			"-pix_fmt",
			"yuv420p",
			"-an",
			"-sn",
			"-f",
			"mp4",
			"-y",
			tmpOut.Name(),
		)

		outType = "video/mp4"
	}

	cmd := exec.Command("ffmpeg", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err = cmd.Run()

	if err != nil {
		return nil
	}

	outData, _ := os.ReadFile(tmpOut.Name())

	AvatarCollection.InsertOne(Context, &models.Avatar{
		ID:   hash[:],
		Data: outData,
		Type: outType,
	})

	return hash[:]
}

func CheckAvatar(id []byte) {
	var user models.User
	if err := UserCollection.FindOne(Context, bson.M{
		"avatarId": id,
	}).Decode(&user); err == nil {
		return
	}

	var channel models.Channel
	if err := ChannelCollection.FindOne(Context, bson.M{
		"avatarId": id,
	}).Decode(&channel); err == nil {
		return
	}

	AvatarCollection.DeleteOne(Context, bson.M{
		"_id": id,
	})
}

func (s *Socket) VoiceStart(channelID []byte) {
	var channel models.Channel
	if ChannelCollection.FindOne(Context, bson.M{
		"_id": channelID,
		"users": bson.M{
			"$elemMatch": bson.M{
				"id":     s.Session.UserID,
				"hidden": false,
			},
		},
	}).Decode(&channel) != nil {
		s.WriteJSON(events.O{
			Type: events.OVoiceResetType,
		})
	}

	voiceSocket := GetVoiceSocketFromUserID(s.Session.UserID)

	if voiceSocket != nil {
		voiceSocket.WriteJSON(events.O{
			Type: events.OVoiceResetType,
		})

		voiceSocket.VoiceChannelID = nil
	}

	BroadcastToChannelOther(channelID, s.Session.UserID, events.O{
		Type: events.OChannelUserSetInVoiceType,
		Data: events.OChannelUserSetInVoice{
			ID:        EncodeBinary(s.Session.UserID),
			ChannelID: EncodeBinary(channelID),
			InVoice:   true,
		},
	})

	s.VoiceChannelID = channelID
}

func (s *Socket) VoiceStop() {
	if s.VoiceChannelID == nil {
		return
	}

	BroadcastToChannelOther(s.VoiceChannelID, s.Session.UserID, events.O{
		Type: events.OChannelUserSetInVoiceType,
		Data: events.OChannelUserSetInVoice{
			ID:        EncodeBinary(s.Session.UserID),
			ChannelID: EncodeBinary(s.VoiceChannelID),
			InVoice:   false,
		},
	})

	s.VoiceChannelID = nil
}

func GetVoiceSocketFromUserID(userID []byte) *Socket {
	for _, s := range Sockets {
		if bytes.Equal(s.Session.UserID, userID) && len(s.VoiceChannelID) != 0 {
			return s
		}
	}

	return nil
}

func CheckTOTPCode(totpCode string, totpSecret []byte) bool {
	log.Printf("c: %s s: %x\n", totpCode, totpSecret)

	code, _ := strconv.Atoi(totpCode)
	valid := false
	counters := []float64{math.Floor(float64(time.Now().Unix()) / float64(30))}
	counters = append(counters, counters[0]-1)
	counters = append(counters, counters[0]+1)

	for _, counter := range counters {
		h := hmac.New(func() hash.Hash {
			return sha1.New()
		}, totpSecret)

		buf := make([]byte, 8)
		binary.BigEndian.PutUint64(buf, uint64(counter))
		h.Write(buf)

		sum := h.Sum(nil)
		offset := sum[len(sum)-1] & 0xf
		mod := int64(((int(sum[offset])&0x7f)<<24)|
			((int(sum[offset+1]&0xff))<<16)|
			((int(sum[offset+2]&0xff))<<8)|
			(int(sum[offset+3])&0xff)) % int64(math.Pow10(6))

		if int64(code) == mod {
			valid = true
		}
	}

	return valid
}

func EncodeBinary(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

func DecodeBinary(s string) []byte {
	b, err := base64.RawURLEncoding.DecodeString(s)

	if err != nil {
		return []byte{}
	}

	return b
}
