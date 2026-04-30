// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: ['@nuxt/eslint', '@nuxt/ui'],
  devtools: {
    enabled: true
  },
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    streamerbotHost: process.env.STREAMERBOT_HOST || '127.0.0.1',
    streamerbotPort: process.env.STREAMERBOT_PORT || '8080'
  },

  routeRules: {},

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      websocket: true
    },
    externals: {
      inline: ['uncrypto', '@streamerbot/client']
    }
  },
  vite: {
    optimizeDeps: {
      include: ['@streamerbot/client', '@vue/devtools-core', '@vue/devtools-kit']
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
