<template>
  <div
    ref="chatRef"
    class="overlay-root"
  >
    <div class="overlay-messages">
      <OverlayMessage
        v-for="message in messages"
        :key="message.messageId"
        :message="message"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import OverlayMessage from '~/components/OverlayMessage.vue'
import type { Badge, Emote, ChatMessage } from '~/types/chat'
import { colorFromName, normalizeBadges, getYouTubeBadgeText } from '~/utils/chatHelpers'

const chatRef = ref<HTMLElement>()
const messages = ref<ChatMessage[]>([])

const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const broadcasterNicknames = { twitch: '', youtube: '' }

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
    try {
      ws.close()
    } catch { /* ignore */ }
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
    try {
      ws.close()
    } catch { /* ignore */ }
  }
})
</script>
