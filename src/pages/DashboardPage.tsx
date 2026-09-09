import {
    ArrowUpRight, CalendarDays, Camera, Check, Edit3,
    HardDrive, ListFilter, Play, Plus, ShieldCheck
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { activityApi, hardDrivesApi, shootsApi } from '../api'
import { AppLayout, Badge, MiniStat, PageHeader, SectionTitle } from '../components'
import { workflowStages } from '../data'
import { Loader } from '../Spinner'
import type { Activity, HardDrive as HardDriveType, Shoot } from '../types'

export function Dashboard() {
  const navigate = useNavigate()
  const [shoots, setShoots] = useState<Shoot[]>([])
  const [hardDrives, setHardDrives] = useState<HardDriveType[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      shootsApi.list(),
      hardDrivesApi.list(),
      activityApi.list(),
    ]).then(([s, hd, acts]) => {
      setShoots(s)
      setHardDrives(hd)
      setActivities(acts)
    }).finally(() => setLoading(false))
  }, [])

  const counts = {
    total:     shoots.length,
    upcoming:  shoots.filter(s => ['Scheduled', 'Inquiry'].includes(s.status)).length,
    progress:  shoots.filter(s => s.status === 'In Progress').length,
    wrapped:   shoots.filter(s => s.status === 'Wrapped').length,
    data:      shoots.filter(s => s.currentStage === 'Data Copy').length,
    sorting:   shoots.filter(s => s.currentStage === 'Sorting').length,
    editing:   shoots.filter(s => s.currentStage === 'Editing').length,
    delivered: shoots.filter(s => s.status === 'Delivered').length,
  }

  const stageCount = workflowStages.map(stage => ({
    stage,
    count: shoots.filter(s => s.currentStage === stage).length,
  }))

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
            title="Workflow Overview"
            action={<Link to="/shoots" className="text-link">View shoots <ArrowUpRight size={14} /></Link>}
          />
          <div className="stage-bars">
            {stageCount.map(({ stage, count }) => (
              <div className="stage-bar-row" key={stage}>
                <span>{stage}</span>
                <div className="bar-track">
                  <i style={{ width: `${Math.max(4, (count / Math.max(1, shoots.length)) * 100)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <SectionTitle
            title="Today's / Upcoming Shoots"
            action={<Link to="/calendar" className="text-link">Calendar <ArrowUpRight size={14} /></Link>}
          />
          <div className="compact-list">
            {shoots.slice(0, 5).map(s => (
              <button key={s.id} type="button" className="compact-row" onClick={() => navigate(`/shoots/${s.id}`)}>
                <div className="date-box">
                  <strong>{s.date?.split(' ')[1]?.replace(',', '') ?? '—'}</strong>
                  <span>{s.date?.split(' ')[0]}</span>
                </div>
                <div className="grow">
                  <strong>{s.name}</strong>
                  <span>{s.venue} · {s.city}</span>
                </div>
                <Badge tone="info">{s.currentStage}</Badge>
              </button>
            ))}
            {shoots.length === 0 && !loading && (
              <p style={{ color: '#888', fontSize: 13, padding: 8 }}>No shoots yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
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

        <section className="card storage-overview">
          <SectionTitle
            title="Storage Overview"
            action={<Link to="/hard-drives" className="text-link">Manage <ArrowUpRight size={14} /></Link>}
          />
          {hardDrives.slice(0, 3).map(h => (
            <div className="storage-row" key={h.id}>
              <div>
                <strong>{h.name}</strong>
                <span>{h.used} TB of {h.capacity} TB used</span>
              </div>
              <div className="storage-bar">
                <i style={{ width: `${(h.used / h.capacity) * 100}%` }} />
              </div>
            </div>
          ))}
          {hardDrives.length === 0 && !loading && (
            <p style={{ color: '#888', fontSize: 13, padding: 8 }}>No drives added yet.</p>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
