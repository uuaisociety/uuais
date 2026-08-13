import type { Config } from 'jest'
import nextJest from 'next/jest.js'

// Pin the timezone so date-formatted assertions are deterministic in CI (UTC)
// and on local dev machines with other timezones.
process.env.TZ = 'UTC'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/app/api/',
    '<rootDir>/__tests__/helpers/',
    '<rootDir>/e2e/',
  ],
  verbose: false,
  silent: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
