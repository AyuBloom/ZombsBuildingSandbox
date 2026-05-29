const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const { execSync } = require("child_process");

let buildTimestamp = Date.now();
let buildHash = "";
try {
  const timestampSec = parseInt(execSync('git log -n 1 --format="%ct" main').toString().trim(), 10);
  if (!isNaN(timestampSec)) {
    buildTimestamp = timestampSec * 1000;
  }
  buildHash = execSync("git rev-parse --short main").toString().trim();
} catch (e) {
  console.error("Failed to get main branch git info:", e);
}

module.exports = {
  entry: "./src/app/Game/app.js",
  output: {
    path: path.resolve(__dirname, "release"),
    filename: "asset/app.js",
    library: {
      name: "Game",
      type: "var",
    },
  },
  optimization: {
    minimize: true,
    moduleIds: "natural",
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: require.resolve("./src/app/Game/app.js"),
        loader: "exports-loader",
        options: {
          type: "commonjs",
          exports: "single Game",
        },
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              url: false,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __BUILD_TIMESTAMP__: buildTimestamp,
      __BUILD_HASH__: JSON.stringify(buildHash),
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      inject: false,
    }),
    new MiniCssExtractPlugin({
      filename: "asset/app.css",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/image", to: "asset/image" },
        { from: "src/favicon.ico", to: "favicon.ico" },
      ],
    }),
  ],
};
