/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/jest.setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'middleware/**/*.js',
    'services/**/*.js',
    'controllers/**/*.js',
    'utils/**/*.js',
    '!server.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
