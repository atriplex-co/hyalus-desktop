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
import {
  channelSchema,
  friendSchema,
  messageSchema,
  sessionSchema,
  User,
  userSchema,
} from "./util";

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

  let { PORT, DB } = process.env;

  if (!PORT) {
    PORT = "3000";
  }

  if (!DB) {
    DB = "mongodb://db";
  }

  if (process.env.NODE_ENV === "development") {
    PORT = "3001";
  }

  userSchema.index({
    username: 1,
  });
  sessionSchema.index({
    token: 1,
  });
  sessionSchema.index({
    userId: 1,
  });
  friendSchema.index({
    user1Id: 1,
    user2Id: 1,
  });
  messageSchema.index({
    channelId: 1,
    created: 1,
  });

  await mongoose.connect(DB);

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

  app.use(express.json());
  app.use("/api/avatars", AvatarsRoute);
  app.use("/api/channels", ChannelsRoute);
  app.use("/api/friends", FriendsRoute);
  app.use("/api/self", SelfRoute);
  app.use("/api/sessions", SessionsRoute);
  app.use("/api/users", UsersRoute);

  const wss = new WebSocketServer({
    server,
    path: "/api/ws",
  });

  wss.on("connection", WsRoute);

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../../client-web/dist")));
    app.use((req: express.Request, res: express.Response) => {
      res.sendFile(path.join(__dirname, "../../client-web/dist/index.html"));
    });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "",
    process.env.VAPID_PUBLIC || "",
    process.env.VAPID_PRIVATE || ""
  );

  server.listen(PORT);
  log.info(`HTTP listening on :${PORT}`);
})();
