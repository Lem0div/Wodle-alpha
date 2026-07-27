// src/utils/date.ts

// toISOString() is UTC-based, which shifts the date by a day for anyone
// ahead of UTC (e.g. KST, UTC+9) during their local midnight-9am window.
// Use this everywhere a "today"/"yesterday" calendar date string is needed.
export function getLocalDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Monday of the given date's week — used to bucket weekly quest progress the
// same way getLocalDateStr buckets daily progress (one stable key per week).
export function getWeekStartStr(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return getLocalDateStr(d)
}
