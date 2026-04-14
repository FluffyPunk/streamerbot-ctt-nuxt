<template>
  <div class="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 font-semibold text-sm">
      <h1>Live Chat</h1>
      <button
        :class="['px-2.5 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity', statusClass]"
        title="Click to configure settings"
        @click="showSettingsModal = true"
      >
        {{ statusText }}
      </button>
    </header>

    <!-- Settings Modal -->
    <SettingsModal
      v-model="showSettingsModal"
      :messages-on-top="messagesOnTop"
      @save="handleSettingsSave"
    />

    <!-- Events Ticker -->
    <div class="h-8 bg-slate-900 border-b-2 border-slate-800 overflow-hidden shrink-0 flex items-center group">
      <div
        v-if="eventHistory.length"
        ref="tickerRef"
        class="flex items-center gap-6 whitespace-nowrap animate-ticker pl-full"
        :style="{
          animationDuration: tickerDuration + 's',
          animationPlayState: isPaused ? 'paused' : 'running'
        }"
        @mouseenter="isPaused = true"
        @mouseleave="isPaused = false"
      >
        <template
          v-for="(event, idx) in eventHistory"
          :key="idx"
        >
          <UTooltip
            v-if="event.message"
            :text="event.message"
          >
            <div
              :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-xs font-medium',
                event.source === 'Twitch'
                  ? 'bg-slate-800 border-l-2 border-purple-500 text-slate-200'
                  : 'bg-slate-800 border-l-2 border-red-500 text-slate-200'
              ]"
            >
              <span class="font-semibold">{{ event.name }}</span>
              <span class="text-slate-400">{{ event.type }}</span>
              <span
                v-if="event.value"
                class="text-slate-400"
              >{{ event.value }}</span>
            </div>
          </UTooltip>
          <div
            v-else
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 text-xs font-medium',
              event.source === 'Twitch'
                ? 'bg-slate-800 border-l-2 border-purple-500 text-slate-200'
                : 'bg-slate-800 border-l-2 border-red-500 text-slate-200'
            ]"
          >
            <span class="font-semibold">{{ event.name }}</span>
            <span class="text-slate-400">{{ event.type }}</span>
            <span
              v-if="event.value"
              class="text-slate-400"
            >{{ event.value }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Chat Columns -->
    <div class="flex-1 flex gap-0 overflow-hidden">
      <!-- Twitch Column -->
      <div class="flex-1 flex flex-col border-r border-slate-800">
        <div class="column-header">
          <UIcon
            :name="TwitchIcon"
            class="w-3.5 h-3.5"
          />
          <span>Twitch</span>
        </div>
        <div
          ref="twitchChatRef"
          :class="['flex-1 overflow-y-auto flex gap-2 p-3', messagesOnTop ? 'flex-col' : 'flex-col-reverse']"
        >
          <TwitchMessage
            v-for="message in twitchMessages"
            :key="message.messageId"
            :message="message"
          />
        </div>
      </div>

      <!-- YouTube Column -->
      <div class="flex-1 flex flex-col">
        <div class="column-header">
          <UIcon
            :name="YoutubeIcon"
            class="w-3.5 h-3.5"
          />
          <span>YouTube</span>
        </div>
        <div
          ref="youtubeChatRef"
          :class="['flex-1 overflow-y-auto flex gap-2 p-3', messagesOnTop ? 'flex-col' : 'flex-col-reverse']"
        >
          <YouTubeMessage
            v-for="message in youtubeMessages"
            :key="message.messageId"
            :message="message"
          />
        </div>
      </div>
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

const twitchChatRef = ref<HTMLElement>()
const youtubeChatRef = ref<HTMLElement>()
const tickerRef = ref<HTMLElement>()

const twitchMessages = ref<ChatMessage[]>([])
const youtubeMessages = ref<ChatMessage[]>([])
const eventHistory = ref<EventItem[]>([])
const isPaused = ref(false)
const messagesOnTop = ref(false)

const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const tickerDuration = ref(30)
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

const MAX_STORED_EVENTS = 10
const EVENTS_STORAGE_KEY = 'eventsHistory'
const TICKER_PX_PER_SEC = 100

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 65%)`
}

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
  updateTickerDuration()
}

function updateTickerDuration() {
  if (!tickerRef.value) return
  nextTick(() => {
    if (!tickerRef.value) return
    const w = tickerRef.value.scrollWidth
    if (w === 0) return
    const dur = Math.max(5, w / TICKER_PX_PER_SEC)
    tickerDuration.value = dur
  })
}

function scrollToBottom(container: HTMLElement | undefined) {
  if (container) {
    container.scrollTop = container.scrollHeight
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
    nextTick(() => scrollToBottom(twitchChatRef.value))
  } else {
    youtubeMessages.value.unshift(message)
    if (youtubeMessages.value.length > 100) {
      youtubeMessages.value.pop()
    }
    nextTick(() => scrollToBottom(youtubeChatRef.value))
  }
}

function normalizeBadges(badges: unknown): Badge[] {
  if (Array.isArray(badges)) {
    return badges
  }
  if (badges && typeof badges === 'object') {
    return [badges as Badge]
  }
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
    const username = (data as { target_user_login?: string }).target_user_login
    if (username) purgeOnBan(username, true)
  }
  if (key === 'YouTube.UserBanned') {
    const bannedUser = (data as { bannedUser?: { name: string } }).bannedUser
    if (bannedUser?.name) purgeOnBan(bannedUser.name, false)
  }
  if (key === 'Twitch.UserTimedOut') {
    const username = (data as { target_user_login?: string }).target_user_login
    if (username) purgeOnBan(username, true)
  }
  if (key === 'Twitch.ChatMessageDeleted') {
    const targetMessageId = (data as { targetMessageId?: string }).targetMessageId
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

function handleSettingsSave(data: { messagesOnTop: boolean }) {
  messagesOnTop.value = data.messagesOnTop
  localStorage.setItem('messages.onTop', String(data.messagesOnTop))
}

// Initialize relay connection
onMounted(() => {
  if (!globalThis.window) return

  // Load message position preference
  const savedMessagesOnTop = localStorage.getItem('messages.onTop')
  if (savedMessagesOnTop !== null) {
    messagesOnTop.value = savedMessagesOnTop === 'true'
  }

  loadEventHistory()
  updateTickerDuration()

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
