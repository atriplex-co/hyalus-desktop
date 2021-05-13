const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const TerserPlugin = require("terser-webpack-plugin");
const { ProgressPlugin, DefinePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const proc = require("child_process");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[contenthash].js",
  },
  module: {
    rules: [
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
                    config: path.resolve(__dirname, "tailwind.config.js"),
                  },
                  "postcss-preset-env": {
                    stage: 0,
                  },
                },
              },
            },
          },
        ],
      },
      {
        test: /\.(webp|woff|woff2|ogg|wasm|png)$/,
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
    symlinks: false,
  },
  plugins: [
    new ProgressPlugin(),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src/index.html"),
      minify: true,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/static"),
        },
      ],
    }),
    new DefinePlugin({
      _commit: JSON.stringify(
        proc
          .execSync("git rev-parse --short HEAD", {
            cwd: path.resolve(__dirname, "../.."),
          })
          .toString()
          .trim()
      ),
    }),
  ],
  externals: ["path", "crypto", "os", "electron", "fs"],
  cache: {
    type: "filesystem",
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: false,
        },
      }),
    ],
    splitChunks: {
      chunks: "all",
      minSize: 0,
      maxInitialRequests: Infinity,
    },
    runtimeChunk: true,
  },
};
