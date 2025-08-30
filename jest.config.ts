import type { Config } from 'jest'
 
const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  verbose: false,
  silent: false,
  testFailureExitCode: 1,  
  testLocationInResults: true,
  reporters: [
    ['default', {
      errorOnDeprecated: false,
      showMarks: false,
      verbose: false
    }]
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  }
}

export default config