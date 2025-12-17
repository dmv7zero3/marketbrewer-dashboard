/**
 * Root Jest configuration for MarketBrewer SEO Platform
 *
 * This config uses Jest projects to run tests across all workspace packages.
 * Each package can have its own jest.config.js that extends common settings.
 */

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    "<rootDir>/packages/shared",
    "<rootDir>/packages/server",
    "<rootDir>/packages/worker",
    "<rootDir>/packages/dashboard",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "packages/*/src/**/*.{ts,tsx}",
    "!packages/*/src/**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  clearMocks: true,
  resetModules: true,
  verbose: true,
};
