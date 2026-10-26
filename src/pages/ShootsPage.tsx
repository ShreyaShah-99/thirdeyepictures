import { ListFilter, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shootsApi } from '../api'
import { useAuth, useCanWrite } from '../auth'
import { AppLayout, Badge, EmptyState, FormField, Modal, PageHeader, Pagination, SearchFilter, ShootTypeSelect, statusTone, usePagination } from '../components'
import { workflowStages } from '../data'
import { ButtonSpinner, Loader } from '../Spinner'
import type { Shoot } from '../types'

/**
 * Crew count for a shoot. Prefer the synced `crewIds`, but fall back to the
 * Crew Assign stage data so shoots assigned before `crewIds` syncing still
 * show the right number.
 */
function crewCount(s: Shoot): number {
  if (s.crewIds?.length) return s.crewIds.length
  const assigns = s.stageFormData?.['Crew Assign']?.crewAssignments as unknown[] | undefined
  return assigns?.length ?? 0
}

function ShootModal({
  open,
  onClose,
  onCreate,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly onCreate: (s: Shoot) => void
}) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('Ahmedabad')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!name || !client || !date || !venue) {
      setError('Please fill in Shoot Name, Client, Date and Venue.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const s = await shootsApi.create({ name, client, type, date, venue, city })
      onCreate(s)
      onClose()
      setName(''); setClient(''); setDate(''); setVenue('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to create shoot')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="Create New Shoot" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Shoot Name">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gupta Anniversary" />
        </FormField>
        <FormField label="Client">
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client name" />
        </FormField>
        <FormField label="Shoot Type">
          <ShootTypeSelect value={type} onChange={e => setType(e.target.value)} />
        </FormField>
        <FormField label="Shoot Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FormField>
        <FormField label="Venue">
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue" />
        </FormField>
        <FormField label="City">
          <input value={city} onChange={e => setCity(e.target.value)} />
        </FormField>
      </div>
      {error && <p style={{ color: 'red', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={loading}>
          {loading ? <><ButtonSpinner /> Creating...</> : <><Plus size={15} /> Create Shoot</>}
        </button>
      </div>
    </Modal>
  )
}

export function ShootsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'admin'
  const canWrite = useCanWrite()

  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('All')
  const [modal, setModal] = useState(false)
  const [shoots, setShoots] = useState<Shoot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    shootsApi.list()
      .then(setShoots)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    const prev = shoots
    setShoots(p => p.filter(s => s.id !== id))
    try {
      await shootsApi.remove(id)
    } catch (err: any) {
      setShoots(prev) // revert on failure
      alert(`Delete failed: ${err.message}`)
    }
  }

  const filtered = shoots.filter(
    s =>
      `${s.name} ${s.client} ${s.number} ${s.venue}`.toLowerCase().includes(query.toLowerCase()) &&
      (stage === 'All' || s.currentStage === stage)
  )

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10)

  return (
    <AppLayout>
      <PageHeader
        title="Shoots"
        subtitle="Manage the complete photography production pipeline"
        action={
          canWrite ? (
            <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>
              <Plus size={16} /> New Shoot
            </button>
          ) : null
        }
      />
      <section className="card">
        <div className="toolbar">
          <SearchFilter value={query} onChange={setQuery} placeholder="Search shoots, clients or venues..." />
          <select className="select" value={stage} onChange={e => setStage(e.target.value)}>
            <option>All</option>
            {workflowStages.map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="button" className="btn btn-secondary">
            <ListFilter size={15} /> Filters
          </button>
        </div>
        {loading && <Loader message="Loading shoots..." />}
        {error && <p style={{ padding: 16, color: 'red', fontSize: 13 }}>{error}</p>}
        {!loading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shoot</th><th>Client</th><th>Type</th><th>Date</th>
                  <th>Venue</th><th>Crew</th><th>Current Stage</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link className="table-primary" to={`/shoots/${s.id}`}>{s.name}</Link>
                      <small>{s.number}</small>
                    </td>
                    <td>{s.client}</td>
                    <td><Badge tone="neutral">{s.type}</Badge></td>
                    <td>{s.date}<small>{s.time}</small></td>
                    <td>{s.venue}<small>{s.city}</small></td>
                    <td>{crewCount(s)} members</td>
                    <td><Badge tone={statusTone(s.currentStage)}>{s.currentStage}</Badge></td>
                    <td><Badge tone={statusTone(s.status)}>{s.status}</Badge></td>
                    <td>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="icon-btn delete-btn"
                          title={`Delete ${s.name}`}
                          onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </div>
        )}
        {!loading && filtered.length === 0 && !error && (
          <EmptyState title="No shoots found" text="Try changing your search or filters." />
        )}
      </section>
      <ShootModal
        open={modal}
        onClose={() => setModal(false)}
        onCreate={s => setShoots(prev => [s, ...prev])}
      />

      <Modal
        open={!!deleteTarget}
        title="Delete Shoot"
        onClose={() => setDeleteTarget(null)}
        width={400}
      >
        <p style={{ fontSize: 13, color: '#4a4240', margin: '0 0 16px' }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This
          permanently removes the shoot and cannot be undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (deleteTarget) handleDelete(deleteTarget.id)
              setDeleteTarget(null)
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
