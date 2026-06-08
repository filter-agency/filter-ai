const defaultConfig = require('@wordpress/scripts/config/jest-unit.config.js');

module.exports = {
  ...defaultConfig,
  moduleNameMapper: {
    ...(defaultConfig.moduleNameMapper || {}),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
