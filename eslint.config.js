import neostandard from 'neostandard'
import vitest from '@vitest/eslint-plugin'

export default [
  ...neostandard({ ts: true }),
  {
    files: ['test/**'],
    ...vitest.configs.recommended
  },
  { ignores: ['dist'] }
]
