const path = require("path");

module.exports = {
  ...require("../client-web/webpack.config"),
  entry: "../client-web/src/index.js",
  target: "electron-renderer",
  output: {
    path: path.resolve(__dirname, "build"),
  },
  externals: [],
};
