// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    'nuxt-authorization'
  ],
  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    public: {
      photoPriceCents: process.env.PHOTO_PRICE_CENTS ?? '500'
    }
  },
  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    experimental: {
      tasks: true
    }
  },

  vite: {
    optimizeDeps: {
      exclude: ['libraw-wasm']
    },
    worker: {
      format: 'es'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
