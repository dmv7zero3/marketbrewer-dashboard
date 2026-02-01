/** @type {import('jest').Config} */
module.exports = {
  displayName: "dashboard",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "babel-jest",
      { configFile: "./babel.config.js" },
    ],
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  collectCoverageFrom: [
    "<rootDir>/src/api/**/*.{ts,tsx}",
    "<rootDir>/src/lib/**/*.{ts,tsx}",
    "<rootDir>/src/components/dashboard/GeneratedPageViewer.tsx",
    "!<rootDir>/src/**/*.d.ts",
    "!<rootDir>/src/**/index.{ts,tsx}",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
