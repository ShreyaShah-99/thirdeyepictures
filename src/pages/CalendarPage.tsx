import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { shootsApi } from '../api'
import { AppLayout, PageHeader } from '../components'
import type { Shoot } from '../types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITY_COLOR: Record<string, string> = {
  Urgent: '#c0392b',
  High: '#d98324',
  Normal: '#9e6560',
  Low: '#7a8c7a',
}

/** Local YYYY-MM-DD key (avoids UTC off-by-one from toISOString). */
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parse a shoot's `date` into a real Date. Shoots store human strings like
 * "Aug 22, 2026", which `new Date(...)` parses reliably. Falls back to null
 * for empty/unparseable values so those shoots are simply not placed.
 */
function parseShootDate(raw?: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function CalendarPage() {
  const [shoots, setShoots] = useState<Shoot[]>([])
  // First day of the month currently being viewed.
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    shootsApi.list().then(setShoots).catch(() => {})
  }, [])

  // Group shoots by local day key once, so each cell is a cheap lookup.
  const shootsByDay = useMemo(() => {
    const map = new Map<string, Shoot[]>()
    for (const s of shoots) {
      const d = parseShootDate(s.date)
      if (!d) continue
      const key = dayKey(d)
      const list = map.get(key)
      if (list) list.push(s)
      else map.set(key, [s])
    }
    return map
  }, [shoots])

  // Build the 6-week (42 cell) grid covering the visible month.
  const cells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay() // 0=Sun
    const gridStart = new Date(year, month, 1 - firstWeekday)
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
      return {
        date,
        inMonth: date.getMonth() === month,
        events: shootsByDay.get(dayKey(date)) ?? [],
      }
    })
  }, [viewDate, shootsByDay])

  const todayKey = dayKey(new Date())
  const totalThisMonth = cells.reduce((n, c) => n + (c.inMonth ? c.events.length : 0), 0)

  const goPrev = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goNext = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToday = () => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <AppLayout>
      <PageHeader title="Calendar" subtitle="Plan and view upcoming shoots" />
      <section className="card">
        <div className="calendar-head">
          <button type="button" className="btn btn-secondary" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <h2>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</h2>
          <button type="button" className="btn btn-secondary" onClick={goNext} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
          <div className="grow" />
          <span className="cal-count">{totalThisMonth} shoot{totalThisMonth === 1 ? '' : 's'} this month</span>
          <button type="button" className="btn btn-secondary" onClick={goToday}>Today</button>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map(x => (
            <div className="cal-head" key={x}>{x}</div>
          ))}

          {cells.map(({ date, inMonth, events }) => {
            const isToday = dayKey(date) === todayKey
            const classes = [
              'cal-cell',
              inMonth ? '' : 'cal-cell-muted',
              isToday ? 'cal-cell-today' : '',
            ].filter(Boolean).join(' ')
            return (
              <div className={classes} key={date.toISOString()}>
                <span>{date.getDate()}</span>
                {events.map(s => (
                  <Link
                    key={s.id}
                    to={`/shoots/${s.id}`}
                    className="cal-event"
                    style={{ borderLeftColor: PRIORITY_COLOR[s.priority] ?? PRIORITY_COLOR.Normal }}
                    title={`${s.name} — ${s.client}${s.time ? ` · ${s.time}` : ''}`}
                  >
                    <strong>{s.name}</strong>
                    <small>{s.time ? s.time.split('–')[0].trim() + ' · ' : ''}{s.type}</small>
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      </section>
    </AppLayout>
  )
}
