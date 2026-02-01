/**
 * Babel configuration for client portal package
 * Includes React preset for JSX support in tests
 */
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-typescript"],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
};
