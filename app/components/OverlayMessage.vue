<template>
  <div class="overlay-message">
    <!-- Reply -->
    <div
      v-if="message.reply"
      class="overlay-reply"
    >
      Replying to <span class="font-semibold">{{ message.reply.userName }}</span>: {{ message.reply.msgBody }}
    </div>

    <!-- Name line with badges -->
    <span class="inline">
      <img
        v-for="badge in (message.badges || []).filter((b: Badge) => b.imageUrl)"
        :key="badge.name"
        :src="badge.imageUrl"
        :title="badge.name"
        class="overlay-badge-img"
        @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
      >
      <span
        v-for="badge in (message.badges || []).filter((b: Badge) => !b.imageUrl && b.name)"
        :key="badge.name"
        class="overlay-badge-text"
      >{{ badge.name }}</span>
      <span
        class="font-bold"
        :style="{ color: message.color || '#5aa9ff' }"
      >{{ message.displayName }}</span><span class="text-white/60">: </span>

      <!-- Message content with emotes -->
      <template
        v-for="(part, idx) in parseMessageWithEmotes(message.text, message.emotes)"
        :key="idx"
      >
        <span
          v-if="part.type === 'text'"
          class="inline"
        >{{ part.content }}</span>
        <img
          v-else-if="part.type === 'emote'"
          :src="part.emoteUrl"
          :alt="part.emoteName"
          :title="part.emoteName"
          class="overlay-emote"
          @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
        >
        <a
          v-else-if="part.type === 'link'"
          :href="part.linkUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="overlay-link"
        >{{ part.content }}</a>
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage, Badge } from '~/types/chat'
import { parseMessageWithEmotes } from '~/utils/parseMessageParts'

defineProps<{
  message: ChatMessage
}>()
</script>
