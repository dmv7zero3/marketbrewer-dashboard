const { merge } = require("webpack-merge");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const common = require("./webpack.common.js");
const port = Number(process.env.CLIENT_PORTAL_PORT || 3003);

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    port,
    host: "localhost",
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  plugins: [new ReactRefreshWebpackPlugin()],
});
