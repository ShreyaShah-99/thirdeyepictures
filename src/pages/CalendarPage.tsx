import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shootsApi } from '../api'
import { AppLayout, PageHeader } from '../components'
import type { Shoot } from '../types'

export function CalendarPage() {
  const [shoots, setShoots] = useState<Shoot[]>([])

  useEffect(() => {
    shootsApi.list().then(setShoots).catch(() => {})
  }, [])

  return (
    <AppLayout>
      <PageHeader title="Calendar" subtitle="Plan and view upcoming shoots" />
      <section className="card">
        <div className="calendar-head">
          <button type="button" className="btn btn-secondary"><ChevronLeft size={15} /></button>
          <h2>August 2026</h2>
          <button type="button" className="btn btn-secondary"><ChevronRight size={15} /></button>
          <div className="grow" />
          <button type="button" className="btn btn-secondary">Month</button>
          <button type="button" className="btn btn-secondary">Week</button>
          <button type="button" className="btn btn-secondary">Day</button>
        </div>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => (
            <div className="cal-head" key={x}>{x}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div className="cal-cell" key={i}>
              <span>{i < 6 ? '' : i - 5}</span>
              {shoots
                .filter(s => {
                  const n = Number(s.date?.match(/\d+/)?.[0])
                  return n === i - 5
                })
                .map(s => (
                  <Link key={s.id} to={`/shoots/${s.id}`} className="cal-event">
                    <strong>{s.name}</strong>
                    <small>{s.type}</small>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
