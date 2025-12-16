import { merge } from "webpack-merge";
import type { Configuration as WebpackConfig } from "webpack";
import type { Configuration as DevServerConfig } from "webpack-dev-server";
import commonConfig from "./webpack.common";

interface Configuration extends WebpackConfig {
  devServer?: DevServerConfig;
}

const config: Configuration = merge(commonConfig, {
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
