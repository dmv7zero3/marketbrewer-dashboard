/** @type {import('jest').Config} */
module.exports = {
  displayName: "dashboard",
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
    "<rootDir>/src/lib/**/*.{ts,tsx}",
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
