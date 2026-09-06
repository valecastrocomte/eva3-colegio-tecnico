/** Formats an ISO date (YYYY-MM-DD) as DD/MM/YYYY for display. */
export function toDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** Truncates a text for compact table display. */
export function excerpt(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}