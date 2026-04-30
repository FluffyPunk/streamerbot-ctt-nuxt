<template>
  <div
    :class="[
      'twitch-message-card',
      message.mention ? 'twitch-message-card--mention' : 'twitch-message-card--default'
    ]"
  >
    <!-- Header with badges, username, and time -->
    <div class="chat-message-header">
      <div class="chat-badge-container">
        <img
          v-for="badge in (message.badges || [])"
          :key="badge.name"
          :src="badge.imageUrl"
          :title="badge.name"
          class="chat-badge-img"
          @error="(e) => (e.target as HTMLImageElement).src = ''"
        >
      </div>
      <span
        class="font-semibold"
        :style="{ color: message.color || '#5aa9ff' }"
      >
        {{ message.displayName }}
      </span>
      <span class="chat-time">
        {{ message.time }}
      </span>
    </div>

    <!-- Reply section -->
    <div
      v-if="message.reply"
      class="chat-reply"
    >
      Replying to <span class="font-semibold">{{ message.reply.userName }}</span>: "{{ message.reply.msgBody }}"
    </div>

    <!-- Message content with emotes and links -->
    <div class="chat-body">
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
          class="chat-emote"
          @error="(e) => (e.target as HTMLImageElement).src = ''"
        >
        <a
          v-else-if="part.type === 'link'"
          :href="part.linkUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="chat-link"
        >
          {{ part.content }}
        </a>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/types/chat'
import { parseMessageWithEmotes } from '~/utils/parseMessageParts'

interface Props {
  message: ChatMessage
}

defineProps<Props>()
</script>
