const http = require("http");
const winston = require("winston");
const { MongoClient } = require("mongodb");
const express = require("express");
const WebSocket = require("ws");
const morgan = require("morgan");
const Redis = require("ioredis");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: "../../.env",
  });
}

const log = winston.createLogger({
  levels: {
    error: 0,
    warning: 1,
    info: 2,
    debug: 3,
  },
  transports: [
    new winston.transports.Console({
      level: process.env.DEBUG ? "debug" : "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((i) => `${i.timestamp} ${i.level}: ${i.message}`)
      ),
    }),
  ],
});

const deps = {};
const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({
  server,
  path: "/api/ws",
});

wss.send = (filter, message) => {
  for (const ws of [...wss.clients].filter(filter)) {
    ws.send(message);
  }
};

wss.on("connection", require("./routes/socket")(deps));

(async () => {
  let mongoClient;

  try {
    mongoClient = new MongoClient(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await mongoClient.connect();
  } catch (e) {
    log.error(`Error connecting to MongoDB`);
    log.error(e.message);
    process.exit(1);
  }

  const db = mongoClient.db("hyalus");

  await db.collection("tickets").createIndex(
    {
      expires: 1,
    },
    {
      expireAfterSeconds: 0,
    }
  );

  log.info("Connected to MongoDB");

  let redis;

  try {
    redis = new Redis(process.env.REDIS);
  } catch (e) {
    log.error(`Error connecting to Redis`);
    log.error(e.message);
    process.exit(1);
  }

  log.info("Connected to Redis");

  app.use((req, res, next) => {
    req.deps = deps;
    next();
  });

  app.use(
    morgan("tiny", {
      stream: {
        write(message) {
          log.info(message.trim());
        },
      },
    })
  );
  app.use(express.static("../client-web/dist"));
  app.use(express.json());
  app.use("/api/me", require("./routes/me"));
  app.use("/api/prelogin", require("./routes/prelogin"));
  app.use("/api/login", require("./routes/login"));
  app.use("/api/register", require("./routes/register"));
  app.use("/api/logout", require("./routes/logout"));
  app.use("/api/avatars", require("./routes/avatars"));
  app.use("/api/friends", require("./routes/friends"));
  app.use("/api/channels", require("./routes/channels"));
  app.use("/api/totp", require("./routes/totp"));

  deps.log = log;
  deps.app = app;
  deps.server = server;
  deps.db = db;
  deps.wss = wss;
  deps.redis = redis;

  server.listen(process.env.PORT);
  log.info(`HTTP listening on :${process.env.PORT}`);
})();
