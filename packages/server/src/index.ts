import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import winston from "winston";
import http from "http";
import path from "path";
import { WebSocketServer } from "ws";
import AvatarsRoute from "./routes/avatars";
import ChannelsRoute from "./routes/channels";
import FriendsRoute from "./routes/friends";
import SelfRoute from "./routes/self";
import SessionsRoute from "./routes/sessions";
import UsersRoute from "./routes/users";
import WsRoute from "./routes/ws";
import webpush from "web-push";
import { UserSchema } from "./models/user";
import { SessionSchema } from "./models/session";
import { FriendSchema } from "./models/friend";
import { MessageSchema } from "./models/message";

(async () => {
  const log = winston.createLogger({
    level: process.env.node_ENV !== "production" ? "debug" : "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf((i) => `${i.timestamp} ${i.level}: ${i.message}`)
    ),
    transports: [new winston.transports.Console()],
  });

  process.env.NODE_ENV ??= "development";
  process.env.PORT ??= "3000";
  process.env.DB ??= "mongodb://db";

  if (
    !process.env.VAPID_SUBJECT ||
    !process.env.VAPID_PUBLIC ||
    !process.env.VAPID_PRIVATE
  ) {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();

    process.env.VAPID_SUBJECT = "mailto:dev@hyalus.app";
    process.env.VAPID_PUBLIC = publicKey;
    process.env.VAPID_PRIVATE = privateKey;

    log.warn("Unconfigured VAPID keys (using random)");
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
  );

  UserSchema.index({
    username: 1,
  });
  SessionSchema.index({
    token: 1,
  });
  SessionSchema.index({
    userId: 1,
  });
  FriendSchema.index({
    user1Id: 1,
    user2Id: 1,
  });
  MessageSchema.index({
    channelId: 1,
    created: 1,
  });

  await mongoose.connect(process.env.DB);

  log.info("Connected to DB");

  const app = express();
  const server = http.createServer(app);

  app.use(
    morgan("tiny", {
      stream: {
        write(s) {
          log.http(s.trim());
        },
      },
    })
  );

  app.enable("trust proxy");
  app.disable("x-powered-by");

  const ApiRoute = express.Router();
  ApiRoute.use(express.json());
  ApiRoute.use("/avatars", AvatarsRoute);
  ApiRoute.use("/channels", ChannelsRoute);
  ApiRoute.use("/friends", FriendsRoute);
  ApiRoute.use("/self", SelfRoute);
  ApiRoute.use("/sessions", SessionsRoute);
  ApiRoute.use("/users", UsersRoute);
  app.use("/api", ApiRoute);

  const wss = new WebSocketServer({
    server,
    path: "/api/ws",
  });

  wss.on("connection", WsRoute);

  if (process.env.NODE_ENV === "production") {
    app.use(
      express.static(path.join(__dirname, "../../client-web/dist"), {
        setHeaders(res) {
          res.setHeader("cache-control", "public, max-age=31536000");
          res.setHeader("service-worker-allowed", "/");
        },
      })
    );

    app.use((_req: express.Request, res: express.Response) => {
      res.sendFile(path.join(__dirname, "../../client-web/dist/index.html"));
    });
  }

  server.listen(process.env.PORT);
  log.info(`HTTP listening on :${process.env.PORT}`);

  process.on("SIGTERM", () => {
    server.close();
  });
})();
