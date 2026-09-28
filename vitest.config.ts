import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'jsdom',
        overrides: {
          supabase: { url: 'https://placeholder.supabase.co', key: 'placeholder' },
        },
      },
    },
    include: ['tests/unit/**/*.spec.ts'],
    testTimeout: 30_000,
    setupFiles: ['tests/setup.ts'],
  },
})
