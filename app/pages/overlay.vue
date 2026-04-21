<template>
  <div
    ref="chatRef"
    class="h-screen w-screen overflow-hidden flex flex-col-reverse"
  >
    <div class="flex flex-col-reverse gap-1 p-2">
      <div
        v-for="message in messages"
        :key="message.messageId"
        class="overlay-message"
      >
        <!-- Reply -->
        <div
          v-if="message.reply"
          class="text-xs text-white/50 border-l border-white/30 pl-2 mb-1 overflow-hidden whitespace-nowrap text-ellipsis"
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
            class="h-4 object-contain inline align-middle mr-0.5"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
          >
          <span
            v-for="badge in (message.badges || []).filter((b: Badge) => !b.imageUrl && b.name)"
            :key="badge.name"
            class="inline align-middle mr-0.5"
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
              class="h-6 object-contain inline align-middle"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
            >
            <a
              v-else-if="part.type === 'link'"
              :href="part.linkUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 underline break-all inline"
            >{{ part.content }}</a>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Badge, Emote, ChatMessage } from '~/types/chat'
import { parseMessageWithEmotes } from '~/utils/parseMessageParts'

const chatRef = ref<HTMLElement>()
const messages = ref<ChatMessage[]>([])

const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const broadcasterNicknames = { twitch: '', youtube: '' }

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 65%)`
}

function normalizeBadges(badges: unknown): Badge[] {
  if (Array.isArray(badges)) return badges
  if (badges && typeof badges === 'object') return [badges as Badge]
  return []
}

function getYouTubeBadgeText(user: { isOwner: boolean, isModerator: boolean, isSponsor: boolean, isVerified: boolean }): string {
  let badgeText = ''
  if (user?.isOwner) badgeText += '👑 '
  if (user?.isModerator) badgeText += '🗡 '
  if (user?.isSponsor) badgeText += '💚 '
  if (user?.isVerified) badgeText += '✔ '
  return badgeText.trim()
}

function renderMessage(
  displayName: string,
  color: string,
  text: string,
  badges: Badge[],
  mention: boolean,
  messageId: string,
  reply?: { userName: string, msgBody: string },
  emotes?: Emote[]
) {
  const message: ChatMessage = {
    messageId,
    displayName,
    color,
    text,
    badges,
    emotes: emotes || [],
    time: '',
    mention,
    reply
  }

  messages.value.unshift(message)
  if (messages.value.length > 100) {
    messages.value.pop()
  }
}

function purgeOnBan(username: string) {
  messages.value = messages.value.filter(m => m.displayName.toLowerCase() !== username.toLowerCase())
}

function removeMessage(messageId: string) {
  messages.value = messages.value.filter(m => m.messageId !== messageId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatMessage(source: string, data: any) {
  let displayName, color, messageText, badges, mention, messageId, emotes, reply

  if (source === 'YouTube') {
    displayName = data.user?.name || 'Unknown'
    color = colorFromName(displayName)
    messageText = data.message || ''
    emotes = data.emotes || []

    const badgeEmojis = getYouTubeBadgeText(data.user)
    badges = badgeEmojis
      ? badgeEmojis.split(' ').map((emoji: string) => ({ name: emoji, imageUrl: undefined }))
      : []

    messageId = data.messageId || data.id
  } else {
    emotes = data.emotes
    displayName = data.user?.name || 'Unknown'
    color = data.user?.color || '#5aa9ff'
    messageText = data.text || ''
    badges = data.user?.badges || []
    mention = broadcasterNicknames.twitch && messageText.toLowerCase().includes(broadcasterNicknames.twitch)
    messageId = data.messageId
    reply = data.reply
  }

  if (source === 'YouTube' && broadcasterNicknames.youtube) {
    const isMention = messageText.toLowerCase().includes(broadcasterNicknames.youtube)
    if (isMention) mention = true
  }

  renderMessage(displayName, color, messageText, normalizeBadges(badges), !!mention, messageId, reply, emotes)
}

function handleRelayedEvent(event: { source: string, type: string }, data: Record<string, unknown>) {
  if (!event) return

  const source = event.source
  const type = event.type
  const key = `${source}.${type}`

  if (key === 'Twitch.ChatMessage' || key === 'YouTube.Message') {
    handleChatMessage(source, data)
    return
  }

  if (key === 'Twitch.UserBanned' || key === 'Twitch.UserTimedOut') {
    const username = (data as { target_user_login?: string }).target_user_login
    if (username) purgeOnBan(username)
  }
  if (key === 'YouTube.UserBanned') {
    const bannedUser = (data as { bannedUser?: { name: string } }).bannedUser
    if (bannedUser?.name) purgeOnBan(bannedUser.name)
  }
  if (key === 'Twitch.ChatMessageDeleted') {
    const targetMessageId = (data as { targetMessageId?: string }).targetMessageId
    if (targetMessageId) removeMessage(targetMessageId)
  }
}

function initializeRelay() {
  if (ws) {
    try { ws.close() } catch { /* ignore */ }
    ws = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  connectionStatus.value = 'connecting'

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/ws`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {}

  ws.onclose = () => {
    connectionStatus.value = 'disconnected'
    reconnectTimer = setTimeout(() => initializeRelay(), 3000)
  }

  ws.onerror = () => {
    connectionStatus.value = 'disconnected'
  }

  ws.onmessage = (msg) => {
    let parsed
    try {
      parsed = JSON.parse(msg.data)
    } catch {
      return
    }

    if (parsed.type === 'status') {
      connectionStatus.value = parsed.status
      return
    }

    if (parsed.type === 'broadcaster') {
      const broadcaster = parsed.data
      if (broadcaster?.platforms) {
        if (broadcaster.platforms.twitch?.broadcastUserName) {
          broadcasterNicknames.twitch = broadcaster.platforms.twitch.broadcastUserName
        }
      }
      return
    }

    if (parsed.type === 'event') {
      handleRelayedEvent(parsed.event, parsed.data)
    }
  }
}

onMounted(() => {
  if (!globalThis.window) return
  initializeRelay()
})

onUnmounted(() => {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) {
    try { ws.close() } catch { /* ignore */ }
  }
})
</script>

<style scoped>
.overlay-message {
  color: white;
  font-size: 14px;
  line-height: 1.4;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 3px rgba(0, 0, 0, 0.8);
  font-family: 'Public Sans', sans-serif;
  word-wrap: break-word;
}
</style>
