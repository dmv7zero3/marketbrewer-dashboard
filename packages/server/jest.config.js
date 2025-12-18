/** @type {import('jest').Config} */
module.exports = {
  displayName: "server",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "babel-jest",
      { configFile: "<rootDir>/../../babel.config.js" },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  collectCoverageFrom: [
    "<rootDir>/src/middleware/**/*.{ts,tsx}",
    "!<rootDir>/src/**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 12,
      lines: 30,
      statements: 30,
    },
  },
  testTimeout: 30000,
};
