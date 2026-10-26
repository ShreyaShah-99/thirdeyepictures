import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { activityApi } from '../api'
import { AppLayout, PageHeader } from '../components'
import { formatActivityIST } from '../data'
import type { Activity } from '../types'

// Activity has no stored category, so infer one from the text keywords. This
// lets us filter existing and future logs without a schema change.
type Category = 'Shoot' | 'Task' | 'Equipment' | 'SD Card' | 'Hard Drive' | 'Crew' | 'Other'

function categoryOf(a: Activity): Category {
  const t = `${a.text ?? ''} ${a.shoot ?? ''}`.toLowerCase()
  if (t.includes('task')) return 'Task'
  if (t.includes('sd card') || t.includes('sd-') || /\bcard\b/.test(t)) return 'SD Card'
  if (t.includes('hard drive') || t.includes('drive') || /\bhd[-\s]/.test(t)) return 'Hard Drive'
  if (t.includes('equipment') || t.includes('gear')) return 'Equipment'
  if (t.includes('crew') || t.includes('member') || t.includes('assigned as')) return 'Crew'
  if (t.includes('shoot') || t.includes('stage') || t.includes('delivered') || t.includes('wrapped') || a.shoot) return 'Shoot'
  return 'Other'
}

const FILTERS: Array<'All' | Category> = ['All', 'Shoot', 'Task', 'Equipment', 'SD Card', 'Hard Drive', 'Crew']

export function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'All' | Category>('All')

  useEffect(() => {
    activityApi.list()
      .then(setActivities)
      .finally(() => setLoading(false))
  }, [])

  const filtered = activities.filter(a => {
    const matchSearch = !search ||
      (a.text ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.user ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.shoot ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || categoryOf(a) === category
    return matchSearch && matchCat
  })

  return (
    <AppLayout>
      <PageHeader title="Activity" subtitle="Complete production history" />

      {/* Full-width search box */}
      <div className="activity-searchbar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search activity by text, user or shoot..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category filter chips */}
      <div className="activity-filters">
        {FILTERS.map(f => (
          <button
            type="button"
            key={f}
            className={`activity-chip ${category === f ? 'active' : ''}`}
            onClick={() => setCategory(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="card">
        {loading && <p style={{ padding: 16, color: '#888', fontSize: 13 }}>Loading activity...</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ padding: 16, color: '#888', fontSize: 13 }}>No activity found.</p>
        )}

        <div className="activity-list large">
          {filtered.map(a => (
            <div className="activity-row" key={a.id}>
              <span className="activity-dot" />
              <div>
                <strong>{a.text}</strong>
                <span>
                  {formatActivityIST(a)} · {a.user}
                  {a.shoot ? ` · ${a.shoot}` : ''}
                  {` · ${categoryOf(a)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}
