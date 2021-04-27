const http = require("http");
const winston = require("winston");
const { MongoClient } = require("mongodb");
const express = require("express");
const morgan = require("morgan");
const Redis = require("ioredis");
const msgpack = require("msgpack-lite");
const dotenv = require("dotenv");
const history = require("connect-history-api-fallback");
const path = require("path");

dotenv.config({
  path: "../../.env",
});

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

    await db.collection("files").ensureIndex(
      {
        time: 1,
      },
      {
        expireAfterSeconds: 60 * 60 * 24 * 7, //7d
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
    redis.publish = async (chan, msg) => {
      await redis._publish(chan, msgpack.encode(msg));
    };

    redis._set = redis.set;
    redis.set = async (key, val, ...rest) => {
      //why?
      //mongodb ObjectIDs..
      val = JSON.stringify(val);
      val = JSON.parse(val);
      val = msgpack.encode(val);

      await redis._set(key, val, ...rest);
    };

    redis.get = async (key) => {
      let val = await redis.getBuffer(key);

      if (val) {
        val = msgpack.decode(val);
      }

      return val;
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
    res.set("cross-origin-opener-policy", "same-origin");
    res.set("cross-origin-embedder-policy", "require-corp");
    res.set("referrer-policy", "no-referrer");
    res.set("x-content-type-options", "nosniff");
    res.set("x-dns-prefetch-control", "off");
    res.set("x-frame-options", "DENY");
    next();
  });

  app.enable("trust proxy");
  app.disable("x-powered-by");

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
  app.use("/api/users", require("./routes/users"));
  app.use(
    history({
      rewrites: [
        {
          from: /.*/,
          to(ctx) {
            const file = path.basename(ctx.parsedUrl.path.toString());

            if (file.includes(".")) {
              return `/${file}`;
            } else {
              return "/index.html";
            }
          },
        },
      ],
    })
  );
  app.use(
    express.static("../client-web/dist", {
      setHeaders(res, path) {
        if (!path.endsWith(".html")) {
          res.set("cache-control", "public, max-age=31536000");
        }
      },
    })
  );

  deps.log = log;
  deps.app = app;
  deps.server = server;
  deps.db = db;
  deps.redis = redis;
  deps.redisSub = redisSub;

  server.listen(process.env.PORT);
  log.info(`HTTP listening on :${process.env.PORT}`);
})();
