<template>
  <div class="app-root">
    <!-- Header -->
    <header class="app-header">
      <h1>Live Chat</h1>
      <UButton
        :class="['px-2.5 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity', statusClass]"
        title="Click to configure settings"
        @click="showSettingsModal = true"
      >
        {{ statusText }}
      </UButton>
    </header>

    <!-- Settings Modal -->
    <SettingsModal
      v-model="showSettingsModal"
      :messages-on-top="messagesOnTop"
      :streamerbot-host="streamerbotHost"
      :streamerbot-port="streamerbotPort"
      @save="handleSettingsSave"
    />

    <!-- Events Ticker -->
    <EventsTicker :events="eventHistory" />

    <!-- Chat Columns -->
    <div class="app-columns">
      <ChatColumn
        ref="twitchColumnRef"
        :icon="TwitchIcon"
        label="Twitch"
        :messages-on-top="messagesOnTop"
        border-right
      >
        <TwitchMessage
          v-for="message in twitchMessages"
          :key="message.messageId"
          :message="message"
        />
      </ChatColumn>

      <ChatColumn
        ref="youtubeColumnRef"
        :icon="YoutubeIcon"
        label="YouTube"
        :messages-on-top="messagesOnTop"
      >
        <YouTubeMessage
          v-for="message in youtubeMessages"
          :key="message.messageId"
          :message="message"
        />
      </ChatColumn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import SettingsModal from '~/components/SettingsModal.vue'
import TwitchMessage from '~/components/TwitchMessage.vue'
import YouTubeMessage from '~/components/YouTubeMessage.vue'
import type { Badge, Emote, ChatMessage, EventItem } from '~/types/chat'
import { TwitchIcon, YoutubeIcon } from '~/assets/icons'
import { colorFromName, normalizeBadges, getYouTubeBadgeText } from '~/utils/chatHelpers'

import ChatColumn from '~/components/ChatColumn.vue'

const twitchColumnRef = ref<InstanceType<typeof ChatColumn>>()
const youtubeColumnRef = ref<InstanceType<typeof ChatColumn>>()

const twitchMessages = ref<ChatMessage[]>([])
const youtubeMessages = ref<ChatMessage[]>([])
const eventHistory = ref<EventItem[]>([])
const messagesOnTop = ref(false)
const streamerbotHost = ref('127.0.0.1')
const streamerbotPort = ref('8080')

const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const showSettingsModal = ref(false)

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const broadcasterNicknames = { twitch: '', youtube: '' }

const statusText = computed(() => {
  const map = {
    connecting: 'Connecting…',
    connected: 'Connected',
    disconnected: 'Disconnected'
  }
  return map[connectionStatus.value]
})

const statusClass = computed(() => {
  const map = {
    connecting: 'bg-amber-500 text-slate-950',
    connected: 'bg-green-500 text-slate-950',
    disconnected: 'bg-red-500 text-white'
  }
  return map[connectionStatus.value]
})

interface twitchPunishedUser {
  id: string
  login: string
  name: string
  type: string
}

const MAX_STORED_EVENTS = 10
const EVENTS_STORAGE_KEY = 'eventsHistory'
const STREAMERBOT_HOST_STORAGE_KEY = 'streamerbot.host'
const STREAMERBOT_PORT_STORAGE_KEY = 'streamerbot.port'

function getTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function loadEventHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) || '[]')
    eventHistory.value = stored.slice(0, MAX_STORED_EVENTS).reverse()
  } catch {
    eventHistory.value = []
  }
}

function saveEventHistory(item: EventItem) {
  try {
    const stored = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) || '[]')
    const next = [item, ...stored].slice(0, MAX_STORED_EVENTS)
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    console.error('Failed to save event history')
  }
}

function addEventPill(source: string, type: string, name: string, value?: string, message?: string) {
  const item = { source, type, name, value, message }
  eventHistory.value.push(item)
  if (eventHistory.value.length > MAX_STORED_EVENTS) {
    eventHistory.value.shift()
  }
  saveEventHistory(item)
}

function autoScroll(container: HTMLElement | undefined) {
  if (container) {
    if (messagesOnTop.value) {
      container.scrollTop = 0
    } else {
      container.scrollTop = container.scrollHeight
    }
  }
}

async function renderMessage(
  isTwitch: boolean,
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
    messageId: messageId,
    displayName,
    color,
    text,
    badges,
    emotes: emotes || [],
    time: getTime(),
    mention,
    reply
  }

  if (isTwitch) {
    twitchMessages.value.unshift(message)
    if (twitchMessages.value.length > 100) {
      twitchMessages.value.pop()
    }
    nextTick(() => autoScroll(twitchColumnRef.value?.scrollRef))
  } else {
    youtubeMessages.value.unshift(message)
    if (youtubeMessages.value.length > 100) {
      youtubeMessages.value.pop()
    }
    nextTick(() => autoScroll(youtubeColumnRef.value?.scrollRef))
  }
}

function purgeOnBan(username: string, isTwitch: boolean) {
  if (isTwitch) {
    twitchMessages.value = twitchMessages.value.filter(m => m.displayName.toLowerCase() !== username)
  } else {
    youtubeMessages.value = youtubeMessages.value.filter(m => m.displayName.toLowerCase() !== username)
  }
}

function removeMessage(messageId: string) {
  twitchMessages.value = twitchMessages.value.filter(m => m.messageId !== messageId)
}

function initializeRelay() {
  if (ws) {
    try {
      ws.close()
    } catch {
      // ignore
    }
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

  ws.onopen = () => {
    // Connection to relay server established; streamerbot status comes via messages
  }

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

function handleRelayedEvent(event: { source: string, type: string }, data: Record<string, unknown>) {
  if (!event) return

  const source = event.source
  const type = event.type
  const key = `${source}.${type}`
  // Chat messages
  if (key === 'Twitch.ChatMessage' || key === 'YouTube.Message') {
    handleChatMessage(source, data)
    return
  }

  // Moderation
  if (key === 'Twitch.UserBanned') {
    const username = (data.targetUser as twitchPunishedUser).login
    if (username) purgeOnBan(username, true)
  }
  if (key === 'YouTube.UserBanned') {
    const bannedUser = (data as { bannedUser?: { name: string } }).bannedUser
    if (bannedUser?.name) purgeOnBan(bannedUser.name, false)
  }
  if (key === 'Twitch.UserTimedOut') {
    const username = (data.targetUser as twitchPunishedUser).login
    if (username) purgeOnBan(username, true)
  }
  if (key === 'Twitch.ChatMessageDeleted') {
    const targetMessageId = data.messageId as string
    if (targetMessageId) removeMessage(targetMessageId)
  }

  // Event ticker
  if (source === 'Twitch') handleTwitchTickerEvent(event, data)
  if (source === 'YouTube') handleYouTubeTickerEvent(event, data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChatMessage(source: string, data: any) {
  const isTwitch = source === 'Twitch'

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

  renderMessage(isTwitch, displayName, color, messageText, normalizeBadges(badges), !!mention, messageId, reply, emotes)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleTwitchTickerEvent(event: { source: string, type: string }, data: any) {
  let name, value, message
  let validEvent = true
  let type = event.type

  switch (type) {
    case 'Sub':
      name = data.user?.name
      type = data.is_prime
        ? 'PrimeSub'
        : `Tier ${data.sub_tier?.substring(0, 1)} ${type} for ${data.durationMonths} months`
      break
    case 'ReSub':
      name = data.user?.name
      type = data.is_prime
        ? 'PrimeReSub'
        : `Tier ${data.subTier?.substring(0, 1)} ${type} for ${data.durationMonths} months`
      value = `/ Total: ${data.cumulativeMonths} months`
      message = data.text
      break
    case 'GiftSub':
      name = data.user?.name
      type = data.fromCommunitySubGift ? 'RandomSub' : type
      value = type === 'RandomSub'
        ? `Tier ${data.subTier?.substring(0, 1)} to ${data.recipient?.name}`
        : `${data.durationMonths} months of Tier ${data.subTier?.substring(0, 1)} to ${data.recipient?.name}`
      break
    case 'Raid':
      name = data.user?.name
      break
    case 'Cheer':
      name = data.anonymous ? 'Anonymous' : data.user?.name
      value = String(data.bits)
      message = data.text
      break
    default:
      validEvent = false
      break
  }

  if (validEvent) addEventPill('Twitch', type, name, value, message)
}

const youtubeEventWhitelist = new Set(['MembershipGift', 'SuperChat', 'SuperSticker'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleYouTubeTickerEvent(event: { source: string, type: string }, data: any) {
  const type = event.type
  if (!youtubeEventWhitelist.has(type)) return
  const name = data?.user?.name || data?.sponsor?.name || ''
  const message = data?.message || ''
  addEventPill('YouTube', type, name, '', message)
}

async function syncStreamerbotConfig(host: string, port: string) {
  await $fetch('/api/streamerbot-config', {
    method: 'POST',
    body: {
      host,
      port: Number(port)
    }
  })
}

async function loadStreamerbotConfig() {
  const serverConfig = await $fetch<{ host: string, port: number }>('/api/streamerbot-config')

  const savedHost = localStorage.getItem(STREAMERBOT_HOST_STORAGE_KEY)
  const savedPort = localStorage.getItem(STREAMERBOT_PORT_STORAGE_KEY)

  streamerbotHost.value = savedHost || serverConfig.host || '127.0.0.1'
  streamerbotPort.value = savedPort || String(serverConfig.port || 8080)

  if (savedHost || savedPort) {
    await syncStreamerbotConfig(streamerbotHost.value, streamerbotPort.value)
  }
}

async function handleSettingsSave(data: { messagesOnTop: boolean, streamerbotHost: string, streamerbotPort: string }) {
  const host = data.streamerbotHost.trim()
  const port = data.streamerbotPort.trim()
  const parsedPort = Number(port)

  if (!host || !Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return
  }

  messagesOnTop.value = data.messagesOnTop
  localStorage.setItem('messages.onTop', String(data.messagesOnTop))
  localStorage.setItem(STREAMERBOT_HOST_STORAGE_KEY, host)
  localStorage.setItem(STREAMERBOT_PORT_STORAGE_KEY, port)

  await syncStreamerbotConfig(host, port)

  window.location.reload()
}

// Initialize relay connection
onMounted(async () => {
  if (!globalThis.window) return

  // Load message position preference
  const savedMessagesOnTop = localStorage.getItem('messages.onTop')
  if (savedMessagesOnTop !== null) {
    messagesOnTop.value = savedMessagesOnTop === 'true'
  }

  loadEventHistory()

  try {
    await loadStreamerbotConfig()
  } catch {
    // Keep defaults if config endpoint is unavailable
  }

  initializeRelay()
})

onUnmounted(() => {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) {
    try {
      ws.close()
    } catch {
      // ignore
    }
  }
})
</script>

<style scoped>
@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

.animate-pause {
  animation-play-state: paused;
}
</style>
