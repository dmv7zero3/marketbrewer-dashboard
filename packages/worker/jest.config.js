/** @type {import('jest').Config} */
module.exports = {
  displayName: "worker",
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
  collectCoverageFrom: [
    "<rootDir>/src/ollama/**/*.{ts,tsx}",
    "!<rootDir>/src/**/*.d.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
