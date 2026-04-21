import type { Emote, MessagePart } from '~/types/chat'
import { URL_REGEX } from '~/types/chat'

function formatUrl(urlString: string): string {
  const url = urlString.replace(/[).,!?:;]+$/, '')
  if (!url.match(/^https?:\/\//)) {
    return `https://${url}`
  }
  return url
}

export function parseMessageWithEmotes(text: string, emotes: Emote[] = []): MessagePart[] {
  const parts: MessagePart[] = []

  const segments: Array<{
    type: 'emote' | 'link'
    content: string
    start: number
    end: number
    url?: string
    emoteName?: string
    emoteUrl?: string
  }> = []

  const emotesMap = new Map<string, Emote>()
  for (const emote of emotes) {
    if (!emote?.name || !emote?.imageUrl) continue
    emotesMap.set(emote.name.toLowerCase(), emote)
  }

  for (const emote of emotesMap.values()) {
    const escapedEmote = emote.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const emoteRegex = new RegExp(`\\b${escapedEmote}\\b|${escapedEmote}`, 'gi')

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

  segments.sort((a, b) => a.start - b.start)

  const filteredSegments: typeof segments = []
  for (const segment of segments) {
    if (filteredSegments.some(s => segment.start < s.end && segment.end > s.start)) {
      continue
    }
    filteredSegments.push(segment)
  }

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
        emoteUrl: segment.emoteUrl,
        emoteName: segment.emoteName
      })
    } else {
      parts.push({
        type: 'link',
        content: segment.content,
        linkUrl: segment.url
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
