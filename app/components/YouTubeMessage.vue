<template>
  <div class="bg-slate-800 rounded-lg p-3 border border-slate-700 text-s">
    <!-- Header with badges, username, and time -->
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      <div
        v-if="message.badges?.length"
        class="flex items-center gap-1"
      >
        <img
          v-for="badge in message.badges.filter((b: Badge) => b.imageUrl)"
          :key="badge.name"
          :src="badge.imageUrl"
          :title="badge.name"
          class="h-4 object-contain"
          @error="(e) => (e.target as HTMLImageElement).src = ''"
        >
        <span
          v-for="badge in message.badges.filter((b: Badge) => !b.imageUrl && b.name)"
          :key="badge.name"
          class="text-sm"
        >
          {{ badge.name }}
        </span>
      </div>
      <span
        class="font-semibold"
        :style="{ color: message.color || '#5aa9ff' }"
      >
        {{ message.displayName }}
      </span>
      <span class="text-slate-500 ml-auto text-xs">
        {{ message.time }}
      </span>
    </div>

    <!-- Message content with emotes and links -->
    <div class="text-slate-200 wrap-break-word whitespace-pre-wrap">
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
          class="h-5 object-contain inline align-middle"
          @error="(e) => (e.target as HTMLImageElement).src = ''"
        >
        <a
          v-else-if="part.type === 'link'"
          :href="part.linkUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:text-blue-300 underline break-all inline"
        >
          {{ part.content }}
        </a>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage, Badge } from '~/types/chat'
import { parseMessageWithEmotes } from '~/utils/parseMessageParts'

interface Props {
  message: ChatMessage
}

defineProps<Props>()
</script>
