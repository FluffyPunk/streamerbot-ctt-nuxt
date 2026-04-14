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
      :host="streamerbotHost"
      :port="streamerbotPort"
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
        <div class="px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 flex items-center gap-2 font-bold text-sm">
          <svg
            class="w-3.5 h-3.5 text-purple-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
          </svg>
          <span>Twitch</span>
        </div>
        <div
          ref="twitchChatRef"
          class="flex-1 overflow-y-auto flex flex-col-reverse gap-2 p-3"
        >
          <div
            v-for="message in twitchMessages"
            :key="message.messageId"
            :class="[
              'bg-slate-800 rounded-lg p-3 border text-s',
              message.mention ? 'border-amber-500 border-l-2' : 'border-slate-700'
            ]"
          >
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
            <div
              v-if="message.reply"
              class="text-xs text-slate-400 border-l border-slate-600 pl-2 mb-2"
            >
              Replying to <span class="font-semibold">{{ message.reply.userName }}</span>: "{{ message.reply.msgBody }}"
            </div>
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
        </div>
      </div>

      <!-- YouTube Column -->
      <div class="flex-1 flex flex-col">
        <div class="px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 flex items-center gap-2 font-bold text-sm">
          <svg
            class="w-3.5 h-3.5 text-red-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
          </svg>
          <span>YouTube</span>
        </div>
        <div
          ref="youtubeChatRef"
          class="flex-1 overflow-y-auto flex flex-col-reverse gap-2 p-3"
        >
          <div
            v-for="message in youtubeMessages"
            :key="message.messageId"
            class="bg-slate-800 rounded-lg p-3 border border-slate-700 text-xs"
          >
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { StreamerbotClient, type StreamerbotEventPayload } from '@streamerbot/client'
import { ref, onMounted, computed, nextTick } from 'vue'
import SettingsModal from '~/components/SettingsModal.vue'
import { type Badge, type Emote, type ChatMessage, type EventItem, type MessagePart, URL_REGEX } from '~/types/chat'

const twitchChatRef = ref<HTMLElement>()
const youtubeChatRef = ref<HTMLElement>()
const tickerRef = ref<HTMLElement>()

const twitchMessages = ref<ChatMessage[]>([])
const youtubeMessages = ref<ChatMessage[]>([])
const eventHistory = ref<EventItem[]>([])
const isPaused = ref(false)

const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const tickerDuration = ref(30)
const showSettingsModal = ref(false)

let streamerbotHost = '127.0.0.1'
let streamerbotPort = 8080
let client: StreamerbotClient | null = null
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

function formatUrl(urlString: string): string {
  // Remove trailing punctuation
  const url = urlString.replace(/[).,!?:;]+$/, '')
  // Add protocol if missing
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

    // Create a regex that matches the emote as a whole token
    // Use word boundary where applicable, or just search for the string
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
    // Skip if this segment overlaps with an already added segment
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
    // Add text before this segment
    if (segment.start > lastEnd) {
      parts.push({
        type: 'text',
        content: text.slice(lastEnd, segment.start)
      })
    }

    // Add the segment
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

  // Add remaining text
  if (lastEnd < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastEnd)
    })
  }

  return parts
}

function initializeClient(host: string, port: number) {
  // Disconnect existing client
  if (client) {
    try {
      client.disconnect()
    } catch {
      console.error('Failed to disconnect existing client')
    }
    client = null
  }

  connectionStatus.value = 'connecting'

  // Check if StreamerbotClient is available
  if (StreamerbotClient) {
    client = new StreamerbotClient({
      host,
      port,
      password: '',
      immediate: false,
      autoReconnect: true,
      onConnect: async () => {
        connectionStatus.value = 'connected'
        try {
          const broadcaster = await client?.getBroadcaster()
          if (broadcaster?.platforms) {
            if (broadcaster.platforms.twitch?.broadcastUserName) {
              broadcasterNicknames.twitch = broadcaster.platforms.twitch.broadcastUserName
            }
            // if (broadcaster.platforms.youtube?.name) {
            // broadcasterNicknames.youtube = broadcaster.platforms.youtube.name.toLowerCase() // WIP YT handler
            // }
          }
          console.log(broadcaster?.platforms)
        } catch (err) {
          console.error('Failed to get broadcaster info:', err)
        }
      },
      onDisconnect: () => {
        connectionStatus.value = 'disconnected'
      },
      onError: () => {
        connectionStatus.value = 'disconnected'
      }
    })

    client.connect(30000).catch(() => {
      connectionStatus.value = 'disconnected'
    })

    // Chat message handler
    const handleChatMessage = (e: StreamerbotEventPayload<'Twitch.ChatMessage' | 'YouTube.Message'>) => {
      const { data, event } = e
      if (!data) return

      const source = event?.source || 'Twitch'
      const isTwitch = source === 'Twitch'

      let displayName, color, messageText, badges, mention, messageId, emotes, reply

      if (source === 'YouTube') {
        displayName = data.user?.name || 'Unknown'
        color = colorFromName(displayName)
        messageText = data.message || ''
        emotes = data.emotes || []

        // Create emoji badges for YouTube
        const badgeEmojis = getYouTubeBadgeText(data.user)
        badges = badgeEmojis
          ? badgeEmojis.split(' ').map(emoji => ({ name: emoji, imageUrl: undefined }))
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

      // Check YouTube broadcaster mention
      if (source === 'YouTube' && broadcasterNicknames.youtube) {
        const isMention = messageText.toLowerCase().includes(broadcasterNicknames.youtube)
        if (isMention) {
          mention = true
        }
      }

      renderMessage(isTwitch, displayName, color, messageText, normalizeBadges(badges), !!mention, messageId, reply, emotes)
    }

    client.on('Twitch.ChatMessage', handleChatMessage)
    client.on('YouTube.Message', handleChatMessage)

    // Ban/timeout handlers
    client.on('Twitch.UserBanned', (e: StreamerbotEventPayload<'Twitch.UserBanned'>) => {
      const username = e.data?.target_user_login
      if (username) purgeOnBan(username, true)
    })

    client.on('YouTube.UserBanned', (e: StreamerbotEventPayload<'YouTube.UserBanned'>) => {
      const username = e.data.bannedUser?.name
      purgeOnBan(username, false)
    })

    client.on('Twitch.UserTimedOut', (e: StreamerbotEventPayload<'Twitch.UserTimedOut'>) => {
      const username = e.data?.target_user_login
      if (username) purgeOnBan(username, true)
    })

    client.on('Twitch.ChatMessageDeleted', (e: StreamerbotEventPayload<'Twitch.ChatMessageDeleted'>) => {
      if (e.data?.targetMessageId) removeMessage(e.data.targetMessageId)
    })

    // Event ticker handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTwitchEvent = (e: any) => {
      let name, value, message
      let validEvent = true
      const { data, event } = e
      if (!event) return
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
    const handleYouTubeEvent = (e: any) => {
      const { data, event } = e
      if (!event) return
      const type = event.type
      if (!youtubeEventWhitelist.has(type)) return
      const name = data?.user?.name || data?.sponsor?.name || ''
      const message = data?.message || ''
      addEventPill('YouTube', type, name, '', message)
    }

    client.on('Twitch.*', handleTwitchEvent)
    client.on('YouTube.*', handleYouTubeEvent)
  }
}

function handleSettingsSave(data: { host: string, port: number }) {
  streamerbotHost = data.host
  streamerbotPort = data.port

  localStorage.setItem('streamerbot.host', streamerbotHost)
  localStorage.setItem('streamerbot.port', String(streamerbotPort))

  initializeClient(streamerbotHost, streamerbotPort)
}

// Initialize Streamer.bot client
onMounted(() => {
  if (!globalThis.window) return

  const connectionParams = new URLSearchParams(window.location.search)

  const streamerbotHostParam
    = connectionParams.get('host') || localStorage.getItem('streamerbot.host') || '10.0.0.95'
  const configuredPort = Number(
    connectionParams.get('port') || localStorage.getItem('streamerbot.port') || 8080
  )
  const streamerbotPortParam = Number.isFinite(configuredPort) ? configuredPort : 8080

  streamerbotHost = streamerbotHostParam
  streamerbotPort = streamerbotPortParam

  localStorage.setItem('streamerbot.host', streamerbotHost)
  localStorage.setItem('streamerbot.port', String(streamerbotPort))

  loadEventHistory()
  updateTickerDuration()

  initializeClient(streamerbotHost, streamerbotPort)
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
