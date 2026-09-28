import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: { nuxt: { domEnvironment: 'jsdom' } },
    include: ['tests/unit/**/*.spec.ts'],
    testTimeout: 30_000,
    setupFiles: ['tests/setup.ts'],
    env: {
      NUXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NUXT_PUBLIC_SUPABASE_KEY: 'placeholder',
    },
  },
})
