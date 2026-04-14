<template>
  <div
    :class="[
      'bg-slate-800 rounded-lg p-3 border text-s',
      message.mention ? 'border-amber-500 border-l-2' : 'border-slate-700'
    ]"
  >
    <!-- Header with badges, username, and time -->
    <div class="flex items-center gap-2 mb-2 flex-wrap">
      <div class="flex items-center gap-1">
        <img
          v-for="badge in (message.badges || [])"
          :key="badge.name"
          :src="badge.imageUrl"
          :title="badge.name"
          class="h-4 object-contain"
          @error="(e) => (e.target as HTMLImageElement).src = ''"
        >
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

    <!-- Reply section -->
    <div
      v-if="message.reply"
      class="text-xs text-slate-400 border-l border-slate-600 pl-2 mb-2"
    >
      Replying to <span class="font-semibold">{{ message.reply.userName }}</span>: "{{ message.reply.msgBody }}"
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
import type { ChatMessage, MessagePart, Emote } from '~/types/chat'

interface Props {
  message: ChatMessage
}

defineProps<Props>()

const URL_REGEX = /(https?:\/\/[^\s,]+|www\.[^\s,]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s,]*)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[^\s,]*)?)/

function formatUrl(urlString: string): string {
  const url = urlString.replace(/[).,!?:;]+$/, '')
  if (!url.match(/^https?:\/\//)) {
    return `https://${url}`
  }
  return url
}

function parseMessageWithEmotes(text: string, emotes: Emote[]): MessagePart[] {
  if (!emotes) emotes = []

  const parts: MessagePart[] = []
  const emotesMap = new Map(emotes.map(e => [e.name?.toLowerCase(), e]))

  // Find all segments (emotes, links, and regular text)
  const segments: Array<{ type: string, content: string, start: number, end: number, url?: string, emoteName?: string, emoteUrl?: string }> = []

  // Find emotes by searching for each actual emote name
  for (const [emoteLower, emote] of emotesMap) {
    if (!emote.imageUrl || !emoteLower) continue

    const escapedEmote = emoteLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const emoteRegex = new RegExp(`\\b${escapedEmote}\\b|${escapedEmote}`, 'g')

    let match
    while ((match = emoteRegex.exec(text)) !== null) {
      segments.push({
        type: 'emote',
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
        emoteName: emote.name,
        emoteUrl: emote.imageUrl
      })
    }
  }

  // Find links
  const linkRegex = new RegExp(URL_REGEX.source, 'g')
  let match
  while ((match = linkRegex.exec(text)) !== null) {
    const url = match[0]
    segments.push({
      type: 'link',
      content: url,
      start: match.index,
      end: match.index + url.length,
      url: formatUrl(url)
    })
  }

  // Sort segments by start position and remove overlaps
  segments.sort((a, b) => a.start - b.start)

  const filteredSegments: typeof segments = []
  for (const segment of segments) {
    if (filteredSegments.some(s =>
      (segment.start < s.end && segment.end > s.start)
    )) {
      continue
    }
    filteredSegments.push(segment)
  }

  // Build parts, filling gaps with text
  let lastEnd = 0

  for (const segment of filteredSegments) {
    if (segment.start > lastEnd) {
      parts.push({
        type: 'text',
        content: text.slice(lastEnd, segment.start)
      })
    }

    if (segment.type === 'emote') {
      parts.push({
        type: 'emote',
        content: segment.content,
        emoteUrl: segment.emoteUrl!,
        emoteName: segment.emoteName
      })
    } else if (segment.type === 'link') {
      parts.push({
        type: 'link',
        content: segment.content,
        linkUrl: segment.url!
      })
    }

    lastEnd = segment.end
  }

  if (lastEnd < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastEnd)
    })
  }

  return parts
}
</script>
