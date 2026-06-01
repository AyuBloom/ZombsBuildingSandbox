const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const { execSync } = require("child_process");

let buildHash = "";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.error("Failed to get git commit hash:", e);
}

// Read the base path from the environment variable, defaulting to "/"
const BASE_PATH = process.env.BASE_PATH || "/";

module.exports = {
  entry: "./src/app/Game/app.js",
  output: {
    path: path.resolve(__dirname, "release"),
    filename: "asset/app.js",
    publicPath: BASE_PATH,
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
    // Inject BASE_PATH as a global constant so JS source can use it
    new webpack.DefinePlugin({
      __BASE_PATH__: JSON.stringify(BASE_PATH),
      __BUILD_TIMESTAMP__: Date.now(),
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
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/sw.js", to: "sw.js" },
        { from: "src/image/icon-192.png", to: "icon-192.png" },
        { from: "src/image/icon-512.png", to: "icon-512.png" },
      ],
    }),
  ],
};
