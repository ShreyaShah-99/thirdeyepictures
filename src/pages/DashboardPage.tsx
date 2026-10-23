import {
    ArrowUpRight, CalendarDays, Camera, Check, Edit3,
    HardDrive, ListFilter, Play, Plus, ShieldCheck
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { activityApi, shootsApi } from '../api'
import { AppLayout, Badge, MiniStat, PageHeader, SectionTitle } from '../components'
import { Loader } from '../Spinner'
import type { Activity, Shoot } from '../types'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parse a shoot date (ISO "2026-10-30" or "Oct 30, 2026") into day + month. */
function dateBox(raw?: string): { day: string; mon: string } {
  if (!raw) return { day: '—', mon: '' }
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    return { day: String(d.getDate()), mon: MONTHS_SHORT[d.getMonth()] }
  }
  return { day: '—', mon: '' }
}

export function Dashboard() {
  const navigate = useNavigate()
  const [shoots, setShoots] = useState<Shoot[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      shootsApi.list(),
      activityApi.list(),
    ]).then(([s, acts]) => {
      setShoots(s)
      setActivities(acts)
    }).finally(() => setLoading(false))
  }, [])

  // A shoot is "delivered" (done) if either its status or stage is Delivered.
  const isDelivered = (s: Shoot) => s.status === 'Delivered' || s.currentStage === 'Delivered'

  const counts = {
    total:     shoots.length,
    // Upcoming = early pipeline and not delivered.
    upcoming:  shoots.filter(s => !isDelivered(s) && ['Inquiry', 'Confirm', 'Schedule', 'Crew Assign', 'Equipment Assign', 'Shoot Day Notes', 'Cards Assign'].includes(s.currentStage)).length,
    progress:  shoots.filter(s => !isDelivered(s) && s.status === 'In Progress').length,
    wrapped:   shoots.filter(s => !isDelivered(s) && s.currentStage === 'Wrapped').length,
    data:      shoots.filter(s => !isDelivered(s) && s.currentStage === 'Data Copy').length,
    sorting:   shoots.filter(s => !isDelivered(s) && s.currentStage === 'Sorting').length,
    editing:   shoots.filter(s => !isDelivered(s) && s.currentStage === 'Editing').length,
    delivered: shoots.filter(isDelivered).length,
  }

  // Delivered shoots are done — exclude them from the upcoming list.
  const upcomingShoots = shoots.filter(s => !isDelivered(s))

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle="A quick view of today's production operations"
        action={
          <Link to="/shoots" className="btn btn-primary">
            <Plus size={16} /> New Shoot
          </Link>
        }
      />

      <div className="stats-grid">
        <MiniStat label="Total Shoots"  value={counts.total}     icon={Camera}      detail="Across all projects" />
        <MiniStat label="Upcoming"      value={counts.upcoming}  icon={CalendarDays} detail="Scheduled / enquiry" />
        <MiniStat label="In Progress"   value={counts.progress}  icon={Play}        detail="Currently shooting" />
        <MiniStat label="Wrapped"       value={counts.wrapped}   icon={Check}       detail="Awaiting post-production" />
        <MiniStat label="Data Copy"     value={counts.data}      icon={HardDrive}   detail="Storage action needed" />
        <MiniStat label="Sorting"       value={counts.sorting}   icon={ListFilter}  detail="Selection in progress" />
        <MiniStat label="Editing"       value={counts.editing}   icon={Edit3}       detail="Post-production" />
        <MiniStat label="Delivered"     value={counts.delivered} icon={ShieldCheck} detail="Closed successfully" />
      </div>

      {loading && <Loader message="Loading dashboard..." />}

      <div className="dashboard-grid">
        <section className="card">
          <SectionTitle
            title="Today's / Upcoming Shoots"
            action={<Link to="/calendar" className="text-link">Calendar <ArrowUpRight size={14} /></Link>}
          />
          <div className="compact-list">
            {upcomingShoots.slice(0, 5).map(s => (
              <button key={s.id} type="button" className="compact-row" onClick={() => navigate(`/shoots/${s.id}`)}>
                <div className="date-box">
                  <strong>{dateBox(s.date).day}</strong>
                  <span>{dateBox(s.date).mon}</span>
                </div>
                <div className="grow">
                  <strong>{s.name}</strong>
                  <span>{s.venue} · {s.city}</span>
                </div>
                <Badge tone="info">{s.currentStage}</Badge>
              </button>
            ))}
            {upcomingShoots.length === 0 && !loading && (
              <p style={{ color: '#888', fontSize: 13, padding: 8 }}>No upcoming shoots.</p>
            )}
          </div>
        </section>

        <section className="card">
          <SectionTitle
            title="Recent Activity"
            action={<Link to="/activity" className="text-link">View all <ArrowUpRight size={14} /></Link>}
          />
          <div className="activity-list">
            {activities.slice(0, 6).map(a => (
              <div className="activity-row" key={a.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{a.text}</strong>
                  <span>{a.time} · {a.user}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && !loading && (
              <p style={{ color: '#888', fontSize: 13, padding: 8 }}>No activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
