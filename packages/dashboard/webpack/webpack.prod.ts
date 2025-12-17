import { merge } from "webpack-merge";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import commonConfig from "./webpack.common.js";

const config: webpack.Configuration = merge(commonConfig, {
  mode: "production",
  plugins: [new MiniCssExtractPlugin({ filename: "styles.[contenthash].css" })],
});

export default config;
