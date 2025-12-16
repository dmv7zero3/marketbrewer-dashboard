import { merge } from "webpack-merge";
import type { Configuration } from "webpack";
import commonConfig from "./webpack.common";

const config: Configuration = merge(commonConfig, {
  mode: "production",
  devtool: "source-map",
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: "all",
    },
  },
});

export default config;
