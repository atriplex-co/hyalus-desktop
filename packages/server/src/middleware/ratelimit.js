module.exports = (config) => async (req, res, next) => {
  let key = `ratelimit`;

  if (config.tag) {
    key += `:${config.tag}`;
  }

  if (config.scope === "ip") {
    key += `:${req.ip}`;
  }

  if (config.scope === "user") {
    key += `:${req.session.user.toString()}`;
  }

  if (config.params) {
    key += `:${Object.values(req.params).join()}`;
  }

  const status = await req.deps.redis.get(key);

  if (!status) {
    await req.deps.redis.set(
      key,
      {
        start: Date.now(),
        left: config.max - 1,
      },
      "ex",
      config.time
    );
  } else {
    if (!status.left) {
      return res.status(429).json({
        error: "Too many requests",
        expires: status.start + config.time,
      });
    }

    await req.deps.redis.set(
      key,
      {
        start: Date.now(),
        left: status.left - 1,
      },
      "ex",
      config.time - Math.floor((Date.now() - status.start) / 1000)
    );
  }

  next();
};
