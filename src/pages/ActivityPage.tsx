import { useEffect, useState } from 'react'
import { activityApi } from '../api'
import { AppLayout, PageHeader } from '../components'
import type { Activity } from '../types'

export function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    activityApi.list()
      .then(setActivities)
      .finally(() => setLoading(false))
  }, [])

  const filtered = activities.filter(a =>
    !search ||
    a.text.toLowerCase().includes(search.toLowerCase()) ||
    a.user.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <PageHeader title="Activity" subtitle="Complete production history" />
      <section className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-secondary">Filters</button>
        </div>

        {loading && <p style={{ padding: 16, color: '#888', fontSize: 13 }}>Loading activity...</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ padding: 16, color: '#888', fontSize: 13 }}>No activity yet.</p>
        )}

        <div className="activity-list large">
          {filtered.map(a => (
            <div className="activity-row" key={a.id}>
              <span className="activity-dot" />
              <div>
                <strong>{a.text}</strong>
                <span>
                  {a.time} · {a.user}
                  {a.shoot ? ` · ${a.shoot}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
