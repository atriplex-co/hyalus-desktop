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
import { friendSchema, messageSchema, sessionSchema, userSchema } from "./util";

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

  let { PORT, DB, VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE } = process.env;

  PORT ??= "3000";
  DB ??= "mongodb://db";

  if (!process.env.NDOE_ENV) {
    process.env.NODE_ENV = "development";
  }

  if (process.env.NODE_ENV === "development") {
    PORT = "3001";
  }

  if (!VAPID_SUBJECT || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();
    process.env.VAPID_SUBJECT = VAPID_SUBJECT = "mailto:dev@hyalus.app";
    process.env.VAPID_PUBLIC = VAPID_PUBLIC = publicKey;
    process.env.VAPID_PRIVATE = VAPID_PRIVATE = privateKey;

    log.warn("Unconfigured VAPID keys (using random)");
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

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  server.listen(PORT);
  log.info(`HTTP listening on :${PORT}`);

  process.on("SIGTERM", () => {
    server.close();
  });
})();
