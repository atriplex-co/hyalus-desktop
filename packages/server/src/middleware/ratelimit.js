module.exports = (config) => {
  console.log(JSON.stringify(config));

  return async (req, res, next) => {
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

    console.log(JSON.stringify({ key }));

    next();
  };
};
