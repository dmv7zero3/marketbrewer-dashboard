import { merge } from "webpack-merge";
import type { Configuration as WebpackConfiguration } from "webpack";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";
import commonConfig from "./webpack.common.js";

interface Configuration extends WebpackConfiguration {
  devServer?: DevServerConfiguration;
}

const config: Configuration = merge(commonConfig as Configuration, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
});

export default config;
