import { ArrowLeft, Camera, Database, HardDrive, Package, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { hardDrivesApi } from '../api'
import { AppLayout, Badge, MiniStat, SectionTitle, statusTone } from '../components'
import type { HardDrive as HardDriveType } from '../types'

export function HardDriveDetailsPage() {
  const { id } = useParams()
  const [drive, setDrive] = useState<HardDriveType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    hardDrivesApi.get(id)
      .then(setDrive)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout><p style={{ padding: 32, color: '#888' }}>Loading drive...</p></AppLayout>
  if (!drive)  return <AppLayout><p style={{ padding: 32, color: 'red' }}>Drive not found.</p></AppLayout>

  const shoots = drive.shoots ?? []

  return (
    <AppLayout>
      <div className="details-head">
        <Link className="icon-btn back-btn" to="/hard-drives">
          <ArrowLeft size={18} />
        </Link>
        <div className="details-title">
          <div className="title-line">
            <h1>{drive.name}</h1>
            <Badge tone={statusTone(drive.status)}>{drive.status}</Badge>
          </div>
          <div className="subtitle-line">
            <span>{drive.brand} · {drive.serial}</span>
            <span>{drive.location}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid four">
        <MiniStat label="Capacity"      value={`${drive.capacity} TB`} icon={HardDrive} />
        <MiniStat label="Used"          value={`${drive.used} TB`}     icon={Database} />
        <MiniStat label="Free"          value={`${(drive.capacity - drive.used).toFixed(1)} TB`} icon={Package} />
        <MiniStat label="Shoots Stored" value={shoots.length}          icon={Camera} />
      </div>

      <section className="card">
        <SectionTitle title="Storage" />
        <div className="big-storage">
          <div className="storage-bar big">
            <i style={{ width: `${(drive.used / drive.capacity) * 100}%` }} />
          </div>
          <div className="storage-legend">
            <span>{drive.used} TB used</span>
            <strong>{(drive.capacity - drive.used).toFixed(1)} TB free</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <SectionTitle
          title="Stored Shoots"
          action={
            <button type="button" className="btn btn-primary">
              <Plus size={15} /> Add Shoot Storage
            </button>
          }
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Shoot</th><th>Client</th><th>Date</th><th>Folder</th><th>Size</th><th>Backup</th>
              </tr>
            </thead>
            <tbody>
              {shoots.map(s => (
                <tr key={s.shootId}>
                  <td>
                    <Link className="table-primary" to={`/shoots/${s.shootId}`}>{s.shootName}</Link>
                  </td>
                  <td>{s.client}</td>
                  <td>{s.date}</td>
                  <td><code>{s.folder}</code></td>
                  <td>{s.size} TB</td>
                  <td><Badge tone={statusTone(s.backup)}>{s.backup}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shoots.length === 0 && (
          <p style={{ padding: 16, color: '#888', fontSize: 13 }}>No shoots stored on this drive.</p>
        )}
      </section>
    </AppLayout>
  )
}
