/**
 * Calendar export helpers (Option A — no OAuth).
 *
 * Builds a Google Calendar "add event" URL and a downloadable .ics file for a
 * shoot, using the scheduled date/time and venue as the event details. The
 * user adds it to their own calendar; reminders then come from their calendar.
 */
import type { Shoot } from './types'

interface ShootEvent {
  title: string
  description: string
  location: string
  /** JS Date for start; end is start + 8h if no end time is known. */
  start: Date
  end: Date
  allDay: boolean
}

/**
 * Parse a date string ("2026-10-30" or "Oct 30, 2026") + optional "HH:mm" time
 * into a Date. Returns null if the date can't be parsed.
 */
function toDate(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  // If the date already looks ISO (YYYY-MM-DD), combine with time directly.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  let d: Date
  if (iso && timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    d = new Date(`${dateStr}T${timeStr}:00`)
  } else {
    d = new Date(dateStr)
    if (!isNaN(d.getTime()) && timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number)
      d.setHours(h, m, 0, 0)
    }
  }
  return isNaN(d.getTime()) ? null : d
}

/**
 * Build the event model for a shoot. Prefers the Schedule stage's date/time,
 * falling back to the shoot's top-level fields. Returns null if there's no
 * usable date.
 */
export function shootToEvent(shoot: Shoot): ShootEvent | null {
  const sched = shoot.stageFormData?.['Schedule'] as Record<string, unknown> | undefined
  const dateStr = (sched?.shootDate as string) || shoot.date || ''
  const startTime = (sched?.startTime as string) || ''
  const endTime = (sched?.endTime as string) || ''
  const venue = (sched?.venue as string) || shoot.venue || ''
  const city = (sched?.city as string) || shoot.city || ''

  const start = toDate(dateStr, startTime)
  if (!start) return null

  const allDay = !startTime
  let end = toDate(dateStr, endTime)
  if (!end || end <= start) {
    // Default to an 8-hour window for a timed shoot, or the same day if all-day.
    end = new Date(start.getTime() + (allDay ? 0 : 8 * 60 * 60 * 1000))
  }

  const location = [venue, city].filter(Boolean).join(', ')
  const descParts = [
    shoot.client ? `Client: ${shoot.client}` : '',
    shoot.type ? `Type: ${shoot.type}` : '',
    shoot.number ? `Shoot #: ${shoot.number}` : '',
    shoot.notes ? `Notes: ${shoot.notes}` : '',
  ].filter(Boolean)

  return {
    title: `Shoot: ${shoot.name}`,
    description: descParts.join('\n'),
    location,
    start,
    end,
    allDay,
  }
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

/** YYYYMMDDTHHMMSSZ (UTC) for timed events. */
function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
/** YYYYMMDD (local date) for all-day events. */
function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * A Google Calendar "create event" URL. Opening it (new tab) pre-fills a new
 * event the user can save to their own calendar.
 */
export function googleCalendarUrl(shoot: Shoot): string | null {
  const ev = shootToEvent(shoot)
  if (!ev) return null

  const dates = ev.allDay
    ? `${fmtDate(ev.start)}/${fmtDate(new Date(ev.end.getTime() + 24 * 60 * 60 * 1000))}`
    : `${fmtUtc(ev.start)}/${fmtUtc(ev.end)}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.description,
    location: ev.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Build .ics file text for a shoot. */
export function shootIcs(shoot: Shoot): string | null {
  const ev = shootToEvent(shoot)
  if (!ev) return null

  // Escape per RFC 5545 (commas, semicolons, newlines).
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

  const dtStart = ev.allDay ? `DTSTART;VALUE=DATE:${fmtDate(ev.start)}` : `DTSTART:${fmtUtc(ev.start)}`
  const dtEnd = ev.allDay
    ? `DTEND;VALUE=DATE:${fmtDate(new Date(ev.end.getTime() + 24 * 60 * 60 * 1000))}`
    : `DTEND:${fmtUtc(ev.end)}`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Thirdeye Team//Shoot//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:shoot-${shoot.id}@thirdeye`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    dtStart,
    dtEnd,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description)}`,
    `LOCATION:${esc(ev.location)}`,
    // Reminders: 1 day before and 2 hours before.
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Shoot tomorrow',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Shoot in 2 hours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Trigger a browser download of the shoot's .ics file. */
export function downloadShootIcs(shoot: Shoot): void {
  const ics = shootIcs(shoot)
  if (!ics) return
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${shoot.name.replace(/[^\w-]+/g, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
