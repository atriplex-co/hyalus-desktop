module.exports = async (req, res, next) => {
  const user = await req.deps.db.collection("users").findOne({
    _id: req.session.user,
  });

  req.user = user;

  next();
};
