const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const TerserPlugin = require("terser-webpack-plugin");
const { ProgressPlugin } = require("webpack");

module.exports = {
  mode: "production",
  entry: path.join(__dirname, "src/index.js"),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].[contenthash].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: [/node_modules/],
        options: {
          presets: ["@babel/preset-env"],
        },
      },
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.css$/,
        use: [
          "vue-style-loader",
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: {
                  tailwindcss: {
                    config: path.join(__dirname, "tailwind.config.js"),
                  },
                  autoprefixer: {},
                },
              },
            },
          },
        ],
      },
      {
        test: /\.(webp|woff|woff2|ogg)$/,
        use: {
          loader: "file-loader",
          options: {
            esModule: false,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".vue"],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/index.html"),
      minify: true,
    }),
    new ProgressPlugin(),
  ],
  externals: ["path", "crypto", "os", "electron"],
  cache: {
    type: "filesystem",
    buildDependencies: {
      config: [__filename],
    },
  },
  snapshot: {
    managedPaths: [path.join(__dirname, "node_modules")],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: false,
        },
      }),
    ],
  },
};
