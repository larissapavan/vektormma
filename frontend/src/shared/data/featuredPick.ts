import type { UpcomingPick } from '../types/api'

/**
 * The fight each organization puts forward next: on its earliest upcoming card, the main event when the card order is
 * known, otherwise the first fight listed. Null when the organization has no published pick to come.
 */
export function featuredPick(picks: UpcomingPick[], today = new Date().toISOString().slice(0, 10)): UpcomingPick | null {
  const upcoming = picks.filter((pick) => !pick.event_date || pick.event_date >= today)
  if (!upcoming.length) return null
  const firstDate = upcoming.reduce((min, pick) => (pick.event_date && (!min || pick.event_date < min) ? pick.event_date : min), '' as string)
  const card = upcoming.filter((pick) => (pick.event_date ?? '') === firstDate)
  const ranked = [...card].sort((a, b) => (a.card_position ?? 99) - (b.card_position ?? 99))
  return ranked[0] ?? null
}
