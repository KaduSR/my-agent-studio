import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Component tests opt into jsdom with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/component/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    restoreMocks: true,
  },
})
