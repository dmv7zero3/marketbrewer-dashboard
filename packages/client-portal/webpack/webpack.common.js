const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshTypeScript = require("react-refresh-typescript");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  entry: path.resolve(__dirname, "../src/index.tsx"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: isDev ? "bundle.js" : "bundle.[contenthash].js",
    clean: true,
    publicPath: "/",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  cache: {
    type: "filesystem",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            getCustomTransformers: () => ({
              before: [isDev && ReactRefreshTypeScript()].filter(Boolean),
            }),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDev ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "../public/index.html"),
    }),
    ...(isDev
      ? []
      : [new MiniCssExtractPlugin({ filename: "styles.[contenthash].css" })]),
    new webpack.DefinePlugin({
      "process.env.REACT_APP_API_URL": JSON.stringify(
        process.env.REACT_APP_API_URL || "http://localhost:3001"
      ),
      "process.env.REACT_APP_API_TOKEN": JSON.stringify(
        process.env.REACT_APP_API_TOKEN || ""
      ),
      "process.env.REACT_APP_GOOGLE_CLIENT_ID": JSON.stringify(
        process.env.REACT_APP_GOOGLE_CLIENT_ID || ""
      ),
      "process.env.REACT_APP_GOOGLE_ALLOWED_EMAILS": JSON.stringify(
        process.env.REACT_APP_GOOGLE_ALLOWED_EMAILS || ""
      ),
    }),
    ...(isDev ? [new ForkTsCheckerWebpackPlugin()] : []),
  ],
};
