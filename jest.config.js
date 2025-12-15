/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/setup/jest.setup.js'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
    coverageDirectory: 'coverage',
    verbose: true
};
  