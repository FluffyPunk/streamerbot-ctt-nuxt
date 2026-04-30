import type { StoredMessage, StoredBadge, StoredEvent } from './streamDb'

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 65%)`
}

function normalizeBadges(badges: unknown): StoredBadge[] {
  if (Array.isArray(badges)) return badges as StoredBadge[]
  if (badges && typeof badges === 'object') return [badges as StoredBadge]
  return []
}

function getYouTubeBadgeText(user: { isOwner?: boolean, isModerator?: boolean, isSponsor?: boolean, isVerified?: boolean }): string {
  let badgeText = ''
  if (user?.isOwner) badgeText += '👑 '
  if (user?.isModerator) badgeText += '🗡 '
  if (user?.isSponsor) badgeText += '💚 '
  if (user?.isVerified) badgeText += '✔ '
  return badgeText.trim()
}

function getTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTwitchMessage(data: any, broadcasterLogin: string): StoredMessage | null {
  const messageId = data.messageId
  if (!messageId) return null
  const text = data.text || ''
  const mention = broadcasterLogin
    ? text.toLowerCase().includes(broadcasterLogin.toLowerCase())
    : false
  return {
    messageId,
    displayName: data.user?.name || 'Unknown',
    color: data.user?.color || '#5aa9ff',
    text,
    badges: normalizeBadges(data.user?.badges),
    emotes: data.emotes || [],
    time: getTime(),
    timestamp: Date.now(),
    mention,
    reply: data.reply
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseYouTubeMessage(data: any): StoredMessage | null {
  const messageId = data.eventId || data.id
  if (!messageId) return null
  const displayName = data.user?.name || 'Unknown'
  const badgeEmojis = getYouTubeBadgeText(data.user || {})
  const badges: StoredBadge[] = badgeEmojis
    ? badgeEmojis.split(' ').filter(Boolean).map((emoji: string) => ({ name: emoji, imageUrl: undefined }))
    : []
  return {
    messageId,
    displayName,
    color: colorFromName(displayName),
    text: data.message || '',
    badges,
    emotes: data.emotes || [],
    time: getTime(),
    timestamp: Date.now(),
    mention: false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function processTwitchTickerEvent(type: string, data: any): StoredEvent | null {
  let name: string | undefined
  let value: string | undefined
  let message: string | undefined
  let resolvedType = type

  switch (type) {
    case 'Sub':
      name = data.user?.name
      resolvedType = data.is_prime
        ? 'PrimeSub'
        : `Tier ${data.sub_tier?.substring(0, 1)} Sub for ${data.durationMonths} months`
      break
    case 'ReSub':
      name = data.user?.name
      resolvedType = data.is_prime
        ? 'PrimeReSub'
        : `Tier ${data.subTier?.substring(0, 1)} ReSub for ${data.durationMonths} months`
      value = `/ Total: ${data.cumulativeMonths} months`
      message = data.text
      break
    case 'GiftSub': {
      name = data.user?.name
      const isRandom = data.fromCommunitySubGift
      resolvedType = isRandom ? 'RandomSub' : type
      value = isRandom
        ? `Tier ${data.subTier?.substring(0, 1)} to ${data.recipient?.name}`
        : `${data.durationMonths} months of Tier ${data.subTier?.substring(0, 1)} to ${data.recipient?.name}`
      break
    }
    case 'Raid':
      name = data.user?.name
      break
    case 'Cheer':
      name = data.anonymous ? 'Anonymous' : data.user?.name
      value = String(data.bits)
      message = data.text
      break
    default:
      return null
  }

  return { source: 'Twitch', type: resolvedType, name: name || '', value, message }
}

const YOUTUBE_EVENT_WHITELIST = new Set(['MembershipGift', 'SuperChat', 'SuperSticker'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function processYouTubeTickerEvent(type: string, data: any): StoredEvent | null {
  if (!YOUTUBE_EVENT_WHITELIST.has(type)) return null
  return {
    source: 'YouTube',
    type,
    name: data?.user?.name || data?.sponsor?.name || '',
    value: '',
    message: data?.message || ''
  }
}
