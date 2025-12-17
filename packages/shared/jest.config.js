/** @type {import('jest').Config} */
module.exports = {
  displayName: "shared",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  setupFilesAfterEnv: [],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "babel-jest",
      { configFile: "<rootDir>/../../babel.config.js" },
    ],
  },
  collectCoverageFrom: [
    "<rootDir>/src/utils/**/*.{ts,tsx}",
    "!<rootDir>/src/**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
