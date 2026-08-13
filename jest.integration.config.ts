import type { Config } from 'jest'
import nextJest from 'next/jest.js'

// Pin the timezone so date-formatted assertions are deterministic in CI (UTC)
// and on local dev machines with other timezones.
process.env.TZ = 'UTC'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/app/api/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  verbose: false,
  silent: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
