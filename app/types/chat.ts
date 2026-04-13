import type { Emote } from '@streamerbot/client'

export type { Emote }

export interface Badge {
  name?: string
  imageUrl?: string
  mod?: boolean
  sponsor?: boolean
  verified?: boolean
}

export interface ChatMessage {
  id: string
  displayName: string
  color: string
  text: string
  badges: Badge[]
  emotes: Emote[]
  time: string
  mention?: boolean
  reply?: { userName: string, msgBody: string }
}

export interface EventItem {
  source: string
  type: string
  name: string
  value?: string
}

export interface MessagePart {
  type: 'text' | 'emote' | 'link'
  content: string
  emoteUrl?: string
  emoteName?: string
  linkUrl?: string
}

export const URL_REGEX = /(https?:\/\/[^\s,]+|www\.[^\s,]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s,]*)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/[^\s,]*)?)/
