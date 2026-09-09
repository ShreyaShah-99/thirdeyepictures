import { ArrowLeft, CalendarDays, Check, Database, ExternalLink, FileText, HardDrive, Plus, Trash2, UserPlus, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { activityApi, crewApi, hardDrivesApi, notificationsApi, sdCardsApi, shootsApi } from '../api'
import { useAuth, useCanWrite } from '../auth'
import { AppLayout, Badge, EmptyState, FormField, Modal, SectionTitle, ShootSummary, WorkflowTimeline, cx, statusTone } from '../components'
import { workflowStages } from '../data'
import { PageLoader } from '../Spinner'
import type { CrewMember, HardDrive as HardDriveType, SDCard, Shoot, WorkflowStage } from '../types'

function CrewModal({
  open,
  onClose,
  shoot,
  crew,
  onAssigned,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly shoot: Shoot
  readonly crew: CrewMember[]
  readonly onAssigned: (shoot: Shoot) => void
}) {
  const [selected, setSelected] = useState('')
  const [role, setRole] = useState('Photographer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Only members not already assigned to this shoot and not on leave.
  const options = crew.filter(
    m => m.availability !== 'On Leave' && !shoot.crewIds.includes(m.id)
  )

  const assign = async () => {
    if (!selected) { setError('Please select a team member.'); return }
    setSaving(true); setError('')
    const member = crew.find(m => m.id === selected)
    try {
      const savedShoot = await shootsApi.update(shoot.id, {
        crewIds: [...shoot.crewIds, selected],
      })
      // Mark the crew member as assigned.
      await crewApi.update(selected, { availability: 'Assigned' })
      // Activity log + notification.
      await activityApi.log(
        `${member?.name ?? 'Crew member'} assigned as ${role} to ${shoot.name}`,
        shoot.name,
        shoot.id,
      )
      await notificationsApi.create({
        title: 'Crew assigned',
        detail: `${member?.name ?? 'Crew member'} (${role}) → ${shoot.name}`,
      })
      onAssigned(savedShoot)
      setSelected('')
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to assign crew.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Assign Crew" onClose={onClose}>
      <FormField label="Team Member">
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select member</option>
          {options.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.role} ({m.availability})
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Role">
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option>Photographer</option>
          <option>Videographer</option>
          <option>Assistant</option>
          <option>Data Manager</option>
        </select>
      </FormField>
      {error && <p style={{ color: 'crimson', fontSize: 12 }}>{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={assign} disabled={saving}>
          <UserPlus size={15} /> {saving ? 'Assigning...' : 'Assign Member'}
        </button>
      </div>
    </Modal>
  )
}

function SDModal({
  open,
  onClose,
  shoot,
  cards,
  crew,
  onAssigned,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly shoot: Shoot
  readonly cards: SDCard[]
  readonly crew: CrewMember[]
  readonly onAssigned: (shoot: Shoot) => void
}) {
  const [selected, setSelected] = useState('')
  const [member, setMember] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Only available cards that aren't already on this shoot.
  const options = cards.filter(
    c => c.status === 'Available' && !shoot.sdCardIds.includes(c.id)
  )
  const shootCrew = shoot.crewIds
    .map(id => crew.find(m => m.id === id))
    .filter(Boolean) as CrewMember[]

  const assign = async () => {
    if (!selected) { setError('Please select an SD card.'); return }
    setSaving(true); setError('')
    const card = cards.find(c => c.id === selected)
    const memberName = crew.find(m => m.id === member)?.name
    try {
      const savedShoot = await shootsApi.update(shoot.id, {
        sdCardIds: [...shoot.sdCardIds, selected],
      })
      // Flip the card to Assigned and record which shoot it's on.
      await sdCardsApi.update(selected, {
        status: 'Assigned',
        currentShootId: shoot.id,
        history: [
          ...(card?.history ?? []),
          {
            shootId: shoot.id,
            shootName: shoot.name,
            date: new Date().toLocaleDateString(),
            member: memberName ?? '',
          },
        ],
      })
      await activityApi.log(
        `SD card ${card?.number ?? ''} assigned to ${shoot.name}${memberName ? ` (${memberName})` : ''}`,
        shoot.name,
        shoot.id,
      )
      await notificationsApi.create({
        title: 'SD card assigned',
        detail: `${card?.number ?? 'Card'} → ${shoot.name}`,
      })
      onAssigned(savedShoot)
      setSelected(''); setMember(''); setNotes('')
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to assign SD card.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Assign SD Card" onClose={onClose}>
      <FormField label="SD Card">
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select available card</option>
          {options.map(c => (
            <option key={c.id} value={c.id}>
              {c.number} — {c.capacity} — {c.brand} ({c.status})
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Crew Member">
        <select value={member} onChange={e => setMember(e.target.value)}>
          <option value="">Select crew member</option>
          {shootCrew.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes">
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add allocation notes..." />
      </FormField>
      {error && <p style={{ color: 'crimson', fontSize: 12 }}>{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={assign} disabled={saving}>
          <Database size={15} /> {saving ? 'Assigning...' : 'Assign Card'}
        </button>
      </div>
    </Modal>
  )
}

function HardDriveModal({
  open,
  onClose,
  shoot,
  drives,
  onAssigned,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly shoot: Shoot
  readonly drives: HardDriveType[]
  readonly onAssigned: (shoot: Shoot) => void
}) {
  const [selected, setSelected] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Usable drives not already on this shoot.
  const options = drives.filter(
    d => ['Available', 'In Use', 'Backup Pending'].includes(d.status) && !shoot.hardDriveIds.includes(d.id)
  )

  const assign = async () => {
    if (!selected) { setError('Please select a hard drive.'); return }
    setSaving(true); setError('')
    const drive = drives.find(d => d.id === selected)
    try {
      const savedShoot = await shootsApi.update(shoot.id, {
        hardDriveIds: [...shoot.hardDriveIds, selected],
      })
      await hardDrivesApi.update(selected, {
        status: 'In Use',
        shoots: [
          ...(drive?.shoots ?? []),
          {
            shootId: shoot.id,
            shootName: shoot.name,
            client: shoot.client,
            date: new Date().toLocaleDateString(),
            folder: `/${shoot.number}`,
            size: 0,
            backup: 'Pending',
          },
        ],
      })
      await activityApi.log(
        `Hard drive ${drive?.name ?? ''} assigned to ${shoot.name}`,
        shoot.name,
        shoot.id,
      )
      await notificationsApi.create({
        title: 'Hard drive assigned',
        detail: `${drive?.name ?? 'Drive'} → ${shoot.name}`,
      })
      onAssigned(savedShoot)
      setSelected(''); setNotes('')
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to assign hard drive.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Assign Hard Drive" onClose={onClose}>
      <FormField label="Hard Drive">
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select hard drive</option>
          {options.map(d => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.capacity}TB ({d.status})
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes">
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add allocation notes..." />
      </FormField>
      {error && <p style={{ color: 'crimson', fontSize: 12 }}>{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={assign} disabled={saving}>
          <HardDrive size={15} /> {saving ? 'Assigning...' : 'Assign Drive'}
        </button>
      </div>
    </Modal>
  )
}

function Overview({ shoot }: { readonly shoot: Shoot }) {
  return (
    <div className="stack">
      <ShootSummary shoot={shoot} />
      <section className="card">
        <SectionTitle title="Shoot Description" />
        <p className="body-copy">{shoot.description}</p>
        <div className="note-box">
          <strong>Notes</strong>
          <p>{shoot.notes || 'No notes added yet.'}</p>
        </div>
      </section>
    </div>
  )
}

function CrewTab({
  crew,
  onAssign,
  canWrite,
}: {
  readonly crew: any[]
  readonly onAssign: () => void
  readonly canWrite: boolean
}) {
  return (
    <section className="card">
      <SectionTitle
        title="Assigned Crew"
        action={
          canWrite ? (
            <button type="button" className="btn btn-primary" onClick={onAssign}>
              <UserPlus size={15} /> Assign Crew
            </button>
          ) : null
        }
      />
      <div className="crew-grid">
        {crew.length ? (
          crew.map(m => (
            <div className="crew-card" key={m.id}>
              <div className="avatar large">{m.name.split(' ').map((x: string) => x[0]).join('')}</div>
              <div className="grow">
                <strong>{m.name}</strong>
                <span>{m.role}</span>
                <small>{m.email}</small>
              </div>
              <Badge tone={statusTone(m.availability)}>{m.availability}</Badge>
            </div>
          ))
        ) : (
          <EmptyState title="No crew assigned" text="Assign crew members for this shoot." />
        )}
      </div>
    </section>
  )
}

function MediaTab({
  cards,
  drives,
  onCard,
  onDrive,
  canWrite,
}: {
  readonly cards: any[]
  readonly drives: any[]
  readonly onCard: () => void
  readonly onDrive: () => void
  readonly canWrite: boolean
}) {
  return (
    <div className="stack">
      <section className="card">
        <SectionTitle
          title="SD Card Assignments"
          action={
            canWrite ? (
              <button type="button" className="btn btn-secondary" onClick={onCard}>
                <Plus size={15} /> Assign SD Card
              </button>
            ) : null
          }
        />
        {cards.length ? (
          cards.map(c => (
            <div className="media-row" key={c.id}>
              <div className="device-icon">
                <Database size={17} />
              </div>
              <div className="grow">
                <strong>{c.number}</strong>
                <span>
                  {c.brand} · {c.capacity} · {c.serial}
                </span>
              </div>
              <Badge tone={statusTone(c.status)}>{c.status}</Badge>
            </div>
          ))
        ) : (
          <EmptyState title="No SD cards assigned" text="Assign an SD card when the shoot starts." />
        )}
      </section>
      <section className="card">
        <SectionTitle
          title="Hard Drive Storage"
          action={
            canWrite ? (
              <button type="button" className="btn btn-secondary" onClick={onDrive}>
                <Plus size={15} /> Assign Hard Drive
              </button>
            ) : null
          }
        />
        {drives.length ? (
          drives.map(h => (
            <div className="drive-summary" key={h.id}>
              <div className="device-icon">
                <HardDrive size={17} />
              </div>
              <div className="grow">
                <strong>{h.name}</strong>
                <span>
                  {h.brand} · {h.capacity} TB · {h.location}
                </span>
                <Badge tone={statusTone(h.status)}>{h.status}</Badge>
                <div className="storage-bar">
                  <i style={{ width: `${(h.used / h.capacity) * 100}%` }} />
                </div>
                <strong>
                  {h.used} / {h.capacity} TB
                </strong>
                <Link className="text-link" to={`/hard-drives/${h.id}`}>
                  View <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No hard drive assigned" text="Storage will appear here after allocation." />
        )}
      </section>
    </div>
  )
}

function DataTab({
  shoot,
  drives,
  cards,
  onGoToWorkflow,
}: {
  readonly shoot: Shoot
  readonly drives: any[]
  readonly cards: any[]
  readonly onGoToWorkflow: () => void
}) {
  // Data Copy details are submitted via the "Data Copy" workflow stage.
  const data = shoot.stageFormData?.['Data Copy'] as
    | { driveId?: string; folderPath?: string; notes?: string; cardCopyStatus?: { cardId: string; assignedTo: string; status: string }[] }
    | undefined

  if (!data) {
    return (
      <section className="card">
        <SectionTitle title="Data Copy" />
        <EmptyState title="No data copy recorded" text="Complete the Data Copy stage in the Workflow Timeline above to record the transfer." />
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onGoToWorkflow}>
          Go to Data Copy stage
        </button>
      </section>
    )
  }

  const drive = drives.find(d => d.id === data.driveId)
  const statuses = data.cardCopyStatus ?? []
  const copied = statuses.filter(s => s.status === 'Copied').length

  return (
    <section className="card">
      <SectionTitle title="Data Copy" />
      <div className="data-copy-grid">
        <div className="data-box">
          <span>Source</span>
          <strong>{cards[0]?.number ?? `${statuses.length} card(s)`}</strong>
          <small>SD card</small>
        </div>
        <div className="data-arrow">→</div>
        <div className="data-box">
          <span>Destination</span>
          <strong>{drive?.name ?? 'Not assigned'}</strong>
          <small>{drive?.capacity ?? 0} TB hard drive</small>
        </div>
      </div>
      <div className="summary-grid">
        <div className="summary-item">
          <FileText />
          <div>
            <span>Folder / Path</span>
            <strong>{data.folderPath || '—'}</strong>
          </div>
        </div>
        <div className="summary-item">
          <Check />
          <div>
            <span>Cards Copied</span>
            <strong>{copied} / {statuses.length}</strong>
          </div>
        </div>
        <div className="summary-item">
          <Check />
          <div>
            <span>Status</span>
            <strong>{statuses.length > 0 && copied === statuses.length ? 'Completed' : 'In Progress'}</strong>
          </div>
        </div>
      </div>
      {data.notes && (
        <div className="note-box">
          <strong>Notes</strong>
          <p>{data.notes}</p>
        </div>
      )}
    </section>
  )
}

function SortingTab({
  shoot,
  drives,
  onGoToWorkflow,
}: {
  readonly shoot: Shoot
  readonly drives: any[]
  readonly onGoToWorkflow: () => void
}) {
  type FileTypeRow = { type: string; sourceDriveId: string; copyToDriveId: string; done: boolean }
  const data = shoot.stageFormData?.['Sorting'] as
    | { assignedTo?: string; deadline?: string; notes?: string; fileTypeRows?: FileTypeRow[] }
    | undefined

  if (!data) {
    return (
      <section className="card">
        <SectionTitle title="Sorting Task" />
        <EmptyState title="No sorting task" text="Complete the Sorting stage in the Workflow Timeline above." />
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onGoToWorkflow}>
          Go to Sorting stage
        </button>
      </section>
    )
  }

  const rows = data.fileTypeRows ?? []
  const done = rows.filter(r => r.done).length

  return (
    <section className="card">
      <SectionTitle title="Sorting Task" />
      <div className="summary-grid">
        <div className="summary-item">
          <FileText />
          <div>
            <span>File Types</span>
            <strong>{rows.length}</strong>
          </div>
        </div>
        <div className="summary-item">
          <Check />
          <div>
            <span>Completed</span>
            <strong>{done} / {rows.length}</strong>
          </div>
        </div>
        <div className="summary-item">
          <Check />
          <div>
            <span>Status</span>
            <strong>{rows.length > 0 && done === rows.length ? 'Completed' : 'In Progress'}</strong>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(r => {
          const src = drives.find(h => h.id === r.sourceDriveId)
          const dst = drives.find(h => h.id === r.copyToDriveId)
          return (
            <div key={r.type} className="sorting-type-row">
              <span className="sorting-type-label">{r.type}</span>
              <span style={{ fontSize: 11, color: '#625b58' }}>{src?.name ?? '—'}</span>
              <span style={{ fontSize: 11, color: '#aaa' }}>→</span>
              <span style={{ fontSize: 11, color: '#625b58' }}>{dst?.name ?? '—'}</span>
              <span className={`sorting-done-badge ${r.done ? 'done' : ''}`}>{r.done ? '✓ Done' : 'Pending'}</span>
            </div>
          )
        })}
      </div>
      {data.notes && (
        <div className="note-box">
          <strong>Notes</strong>
          <p>{data.notes}</p>
        </div>
      )}
    </section>
  )
}

function EditingTab({
  shoot,
  onGoToWorkflow,
}: {
  readonly shoot: Shoot
  readonly onGoToWorkflow: () => void
}) {
  type EditTask = { id: string; assignedTo: string; editType: string; notes: string }
  const data = shoot.stageFormData?.['Editing'] as { editingTasks?: EditTask[] } | undefined
  const tasks = data?.editingTasks ?? []

  if (tasks.length === 0) {
    return (
      <section className="card">
        <SectionTitle title="Editing Tasks" />
        <EmptyState title="No editing tasks" text="Complete the Editing stage in the Workflow Timeline above." />
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onGoToWorkflow}>
          Go to Editing stage
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <SectionTitle title="Editing Tasks" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <div key={t.id} className="summary-item" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserRound size={15} />
              <strong>{t.assignedTo}</strong>
              <Badge tone="info">{t.editType}</Badge>
            </div>
            {t.notes && <p className="body-copy" style={{ marginTop: 6 }}>{t.notes}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function DeliveryTab({
  shoot,
  onGoToWorkflow,
}: {
  readonly shoot: Shoot
  readonly onGoToWorkflow: () => void
}) {
  const data = shoot.stageFormData?.['Delivered'] as
    | { deliveryType?: string; deliveryLink?: string; deliveredBy?: string; notes?: string }
    | undefined

  if (!data) {
    return (
      <section className="card">
        <SectionTitle title="Delivery" />
        <EmptyState title="No delivery yet" text="Complete the Delivered stage in the Workflow Timeline above." />
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onGoToWorkflow}>
          Go to Delivered stage
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <SectionTitle title="Delivery" />
      <div className="delivery-card">
        <div>
          <span>Delivery Type</span>
          <strong>{data.deliveryType || '—'}</strong>
        </div>
        <div>
          <span>Status</span>
          <Badge tone="success">Delivered</Badge>
        </div>
        <div>
          <span>Delivered By</span>
          <strong>{data.deliveredBy || '—'}</strong>
        </div>
        <div>
          <span>Link</span>
          {data.deliveryLink ? (
            <a href={data.deliveryLink} target="_blank" rel="noreferrer">
              Open delivery <ExternalLink size={13} />
            </a>
          ) : (
            <strong>—</strong>
          )}
        </div>
      </div>
      {data.notes && (
        <div className="note-box">
          <strong>Notes</strong>
          <p>{data.notes}</p>
        </div>
      )}
    </section>
  )
}

function ActivityTab({ activities }: { readonly activities: any[] }) {
  return (
    <section className="card">
      <SectionTitle title="Activity" />
      <div className="activity-list large">
        {activities.length === 0 && <p style={{ color: '#888', fontSize: 13, padding: 8 }}>No activity yet.</p>}
        {activities.map((a: any) => (
          <div className="activity-row" key={a.id}>
            <span className="activity-dot" />
            <div>
              <strong>{a.text}</strong>
              <span>{a.time} · {a.user}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ShootDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'admin'
  const canWrite = useCanWrite()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shoot, setShoot] = useState<Shoot | null>(null)
  const [allCrew, setAllCrew] = useState<CrewMember[]>([])
  const [allCards, setAllCards] = useState<SDCard[]>([])
  const [allDrives, setAllDrives] = useState<HardDriveType[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<WorkflowStage>('Inquiry')
  const [tab, setTab] = useState('Overview')
  const [assignModal, setAssignModal] = useState(false)
  const [sdModal, setSdModal] = useState(false)
  const [driveModal, setDriveModal] = useState(false)

  // Called after an assignment succeeds: update the shoot and re-pull the
  // resource lists so statuses (Assigned / In Use) and activity stay in sync.
  const refreshAfterAssign = async (savedShoot: Shoot) => {
    setShoot(savedShoot)
    try {
      const [crew, cards, drives, acts] = await Promise.all([
        crewApi.list(),
        sdCardsApi.list(),
        hardDrivesApi.list(),
        activityApi.list(savedShoot.id),
      ])
      setAllCrew(crew)
      setAllCards(cards)
      setAllDrives(drives)
      setActivities(acts)
    } catch (err: any) {
      console.error('Failed to refresh after assign:', err.message)
    }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      shootsApi.get(id),
      crewApi.list(),
      sdCardsApi.list(),
      hardDrivesApi.list(),
      activityApi.list(id),
    ]).then(([s, crew, cards, drives, acts]) => {
      setShoot(s)
      setStage(s.currentStage)
      setAllCrew(crew)
      setAllCards(cards)
      setAllDrives(drives)
      setActivities(acts)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout><PageLoader message="Loading shoot..." /></AppLayout>
  if (!shoot) return <AppLayout><p style={{ padding: 32, color: 'red' }}>Shoot not found.</p></AppLayout>

  const crew = shoot.crewIds?.map(cid => allCrew.find(m => m.id === cid)).filter(Boolean) ?? []
  const cards = shoot.sdCardIds?.map(cid => allCards.find(c => c.id === cid)).filter(Boolean) ?? []
  const drives = shoot.hardDriveIds?.map(did => allDrives.find(h => h.id === did)).filter(Boolean) ?? []
  const stageIndex = workflowStages.indexOf(stage)

  const selectStage = (s: WorkflowStage) => setStage(s)

  const completeStage = async () => {
    if (shoot.workflow[stage].status === 'locked') return
    const nextIndex = Math.min(stageIndex + 1, workflowStages.length - 1)
    const updated: Partial<Shoot> = {
      currentStage: workflowStages[nextIndex],
      workflow: {
        ...shoot.workflow,
        [stage]: {
          ...shoot.workflow[stage],
          status: 'completed',
          completedAt: new Date().toLocaleString(),
          completedBy: 'Admin User',
        },
        [workflowStages[nextIndex]]: {
          ...shoot.workflow[workflowStages[nextIndex]],
          status: 'current',
        },
      },
    }
    try {
      const saved = await shootsApi.update(shoot.id, updated)
      setShoot(saved)
    } catch (err: any) {
      console.error('Failed to complete stage:', err.message)
    }
  }

  const handleStageFormSubmit = async (s: WorkflowStage, data: Record<string, unknown>) => {
    // Can't submit a locked stage.
    if (shoot.workflow[s].status === 'locked') return

    const submittedIndex = workflowStages.indexOf(s)
    const nextIndex = Math.min(submittedIndex + 1, workflowStages.length - 1)
    const nextStage = workflowStages[nextIndex]
    const isLastStage = submittedIndex === workflowStages.length - 1

    // Save the form data, mark this stage completed, and advance to the next
    // stage so the workflow moves forward after submitting the inquiry.
    const workflow: Shoot['workflow'] = {
      ...shoot.workflow,
      [s]: {
        ...shoot.workflow[s],
        status: 'completed',
        completedAt: new Date().toLocaleString(),
        completedBy: 'Admin User',
      },
    }
    if (!isLastStage) {
      workflow[nextStage] = {
        ...shoot.workflow[nextStage],
        status: 'current',
      }
    }

    const updated: Partial<Shoot> = {
      stageFormData: { ...shoot.stageFormData, [s]: data },
      currentStage: isLastStage ? s : nextStage,
      workflow,
    }
    try {
      const saved = await shootsApi.update(shoot.id, updated)
      setShoot(saved)
      // Move the visible stage forward so the next step's form is shown.
      if (!isLastStage) setStage(nextStage)
    } catch (err: any) {
      console.error('Failed to save stage form:', err.message)
    }
  }

  return (
    <AppLayout>
      <div className="details-head">
        <button type="button" className="icon-btn back-btn" onClick={() => navigate('/shoots')}>
          <ArrowLeft size={18} />
        </button>
        <div className="details-title">
          <div className="title-line">
            <h1>{shoot.name}</h1>
            <Badge tone="info">{shoot.priority}</Badge>
          </div>
          <div className="subtitle-line">
            <Badge tone="brown">{shoot.type}</Badge>
            <Badge tone={statusTone(shoot.status)}>{shoot.status}</Badge>
            <span>
              <CalendarDays size={14} /> {shoot.date}
            </span>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginLeft: 'auto' }}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={15} /> Delete Shoot
          </button>
        )}
      </div>
      <WorkflowTimeline
        shoot={shoot}
        onStage={selectStage}
        onStageFormSubmit={canWrite ? handleStageFormSubmit : undefined}
        readOnly={!canWrite}
      />
      <div className="tabs">
        {['Overview', 'Crew', 'Media', 'Data', 'Sorting', 'Editing', 'Delivery', 'Activity'].map(x => (
          <button
            type="button"
            className={cx('tab', tab === x && 'active')}
            key={x}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tab === 'Overview' && <Overview shoot={shoot} />}
        {tab === 'Crew' && <CrewTab crew={crew as any} onAssign={() => setAssignModal(true)} canWrite={canWrite} />}
        {tab === 'Media' && <MediaTab cards={cards as any} drives={drives as any} onCard={() => setSdModal(true)} onDrive={() => setDriveModal(true)} canWrite={canWrite} />}
        {tab === 'Data' && <DataTab shoot={shoot} drives={allDrives} cards={allCards} onGoToWorkflow={() => setStage('Data Copy')} />}
        {tab === 'Sorting' && <SortingTab shoot={shoot} drives={allDrives} onGoToWorkflow={() => setStage('Sorting')} />}
        {tab === 'Editing' && <EditingTab shoot={shoot} onGoToWorkflow={() => setStage('Editing')} />}
        {tab === 'Delivery' && <DeliveryTab shoot={shoot} onGoToWorkflow={() => setStage('Delivered')} />}
        {tab === 'Activity' && <ActivityTab activities={activities} />}
      </div>
      <CrewModal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        shoot={shoot}
        crew={allCrew}
        onAssigned={refreshAfterAssign}
      />
      <SDModal
        open={sdModal}
        onClose={() => setSdModal(false)}
        shoot={shoot}
        cards={allCards}
        crew={allCrew}
        onAssigned={refreshAfterAssign}
      />
      <HardDriveModal
        open={driveModal}
        onClose={() => setDriveModal(false)}
        shoot={shoot}
        drives={allDrives}
        onAssigned={refreshAfterAssign}
      />
      <Modal open={deleteOpen} title="Delete Shoot" onClose={() => setDeleteOpen(false)} width={400}>
        <p style={{ fontSize: 13, color: '#4a4240', margin: '0 0 16px' }}>
          Are you sure you want to delete <strong>{shoot.name}</strong>? This permanently
          removes the shoot and cannot be undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              try {
                await shootsApi.remove(shoot.id)
                navigate('/shoots')
              } catch (err: any) {
                alert(`Delete failed: ${err.message}`)
              }
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </Modal>
    </AppLayout>
  )
}
