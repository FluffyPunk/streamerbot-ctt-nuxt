<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/streamer.bot.png' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Streamer.bot Chat'
const description = 'Vibe-coded trash called chat'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
