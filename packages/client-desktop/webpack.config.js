const path = require("path");

module.exports = {
  ...require("../client-web/webpack.config"),
  target: "electron-renderer",
  output: {
    path: path.resolve(__dirname, "build"),
  },
  externals: [],
};
