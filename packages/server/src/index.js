const http = require("http");
const winston = require("winston");
const { MongoClient } = require("mongodb");
const express = require("express");
const morgan = require("morgan");
const Redis = require("ioredis");
const msgpack = require("msgpack-lite");

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

const wss = require("./routes/ws")(server, deps);

(async () => {
  let db;
  let redis;
  let redisSub;

  try {
    const client = new MongoClient(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();

    db = client.db("hyalus");

    await db.collection("tickets").createIndex(
      {
        expires: 1,
      },
      {
        expireAfterSeconds: 0,
      }
    );

    await db.collection("files").createIndex(
      {
        time: 1,
      },
      {
        expireAfterSeconds: 60 * 60 * 24, //24h
      }
    );
  } catch (e) {
    log.error(`Error connecting to MongoDB`);
    log.error(e.message);
    process.exit(1);
  }

  log.info("Connected to MongoDB");

  try {
    redis = new Redis(process.env.REDIS);
    redisSub = new Redis(process.env.REDIS);

    redis._publish = redis.publish;
    redis.publish = (chan, msg) => {
      redis._publish(chan, msgpack.encode(msg));
    };

    redisSub.on("messageBuffer", require("./events/redisMessage")(deps));
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
  app.use(
    express.static("../client-web/dist", {
      setHeaders(res, path) {
        if (path.endsWith(".html")) {
          res.set("Cache-Control", "no-cache");
        } else {
          res.set("Cache-Control", "public, max-age=31536000");
        }
      },
    })
  );
  app.use(
    express.json({
      limit: "20mb",
    })
  );
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
  deps.redis = redis;
  deps.redisSub = redisSub;

  server.listen(process.env.PORT);
  log.info(`HTTP listening on :${process.env.PORT}`);
})();
