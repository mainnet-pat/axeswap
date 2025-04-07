module.exports = {
  rootDir: "./",
  preset: "ts-jest/presets/default-esm",
  resolver: "ts-jest-resolver",
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{js,jsx,ts}",
    "!**/node_modules/**",
  ],
  coveragePathIgnorePatterns: [
    ".*/src/.*\\.d\\.ts",
    ".*/src/.*\\.test\\.{ts,js}",
    ".*/src/.*\\.test\\.headless\\.js",
  ],
  roots: [
    "<rootDir>/src",
    "<rootDir>/test",
  ],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: './tsconfig.test.json',
      },
    ],
  },
  testEnvironment: "node",
  verbose: true,
  maxConcurrency: 1,
  testTimeout: 180000,
  setupFilesAfterEnv: ['./jest.setup.js'],
};
