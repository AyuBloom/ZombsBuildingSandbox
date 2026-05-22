const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/app/Game/app.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "asset/app.js",
    library: {
      name: "Game",
      type: "var",
    },
  },
  optimization: {
    minimize: false,
    moduleIds: "natural",
  },
  mode: "development",
  devtool: "source-map",
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
  target: "web",
  devServer: {
    port: 80,
    static: "./dist",
    liveReload: true,
    hot: false,
  },
};
