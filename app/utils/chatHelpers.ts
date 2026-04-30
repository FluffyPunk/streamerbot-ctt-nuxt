import type { Badge } from '~/types/chat'

export function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 65%)`
}

export function normalizeBadges(badges: unknown): Badge[] {
  if (Array.isArray(badges)) return badges
  if (badges && typeof badges === 'object') return [badges as Badge]
  return []
}

export function getYouTubeBadgeText(user: { isOwner: boolean, isModerator: boolean, isSponsor: boolean, isVerified: boolean }): string {
  let badgeText = ''
  if (user?.isOwner) badgeText += '👑 '
  if (user?.isModerator) badgeText += '🗡 '
  if (user?.isSponsor) badgeText += '💚 '
  if (user?.isVerified) badgeText += '✔ '
  return badgeText.trim()
}
