import { Database, HardDrive, ListFilter, Package, Plus, ShieldOff, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { crewApi, equipmentApi, hardDrivesApi, sdCardsApi, usersApi, type Equipment, type RegisteredUser } from '../api'
import { useAuth, useCanDo, useCanWrite } from '../auth'
import { AppLayout, Badge, FormField, Modal, PageHeader, SearchFilter, statusTone } from '../components'
import { ButtonSpinner, Loader } from '../Spinner'
import type { CrewMember, HardDrive as HardDriveType, SDCard } from '../types'

const CREW_ROLES = ['Photographer', 'Videographer', 'Cinematographer', 'Lead Photographer', 'Assistant', 'Data Manager', 'Editor', 'Other']

// ─── Add Member Modal ─────────────────────────────────────────────────────────
// Admin picks from users who have self-registered in Cognito. Choosing a
// registered user pre-fills name/email/phone and, crucially, keeps the email
// matching the Cognito account — which promotes that user from read-only
// 'viewer' to full 'team' access on their next login.
function AddMemberModal({ open, onClose, onAdd, existingEmails }: {
  open: boolean
  onClose: () => void
  onAdd: (m: CrewMember) => void | Promise<void>
  existingEmails: string[]
}) {
  const [registered, setRegistered] = useState<RegisteredUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [selected, setSelected] = useState('') // username
  const [role, setRole] = useState('Photographer')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Load registered users whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    setUsersError('')
    usersApi.registered()
      .then(setRegistered)
      .catch((err: any) => setUsersError(err.message ?? 'Failed to load registered users.'))
      .finally(() => setLoadingUsers(false))
  }, [open])

  // Only users not already on the team.
  const already = new Set(existingEmails.map(e => e.toLowerCase()))
  const options = registered.filter(u => u.email && !already.has(u.email.toLowerCase()))
  const chosen = registered.find(u => u.username === selected)

  const submit = async () => {
    if (!chosen) return
    setSaving(true)
    try {
      await onAdd({
        id: `m-${Date.now()}`,
        name: chosen.name || chosen.email,
        email: chosen.email,
        phone: chosen.phone,
        role,
        availability: 'Available',
        shoots: 0,
      })
      setSelected(''); setRole('Photographer'); setNotes('')
      onClose()
    } catch (err: any) {
      alert(`Failed to add member: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Add Team Member" onClose={onClose}>
      <FormField label="Registered User">
        {loadingUsers ? (
          <p style={{ fontSize: 12, color: '#938b87', margin: 0 }}>Loading registered users...</p>
        ) : (
          <select value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">Select a registered user</option>
            {options.map(u => (
              <option key={u.username} value={u.username}>
                {u.name ? `${u.name} — ${u.email}` : u.email} ({u.status})
              </option>
            ))}
          </select>
        )}
      </FormField>

      {!loadingUsers && options.length === 0 && !usersError && (
        <p style={{ fontSize: 12, color: '#938b87', marginTop: -4 }}>
          No registered users available. New users must sign up first at the login screen.
        </p>
      )}
      {usersError && <p style={{ fontSize: 12, color: 'crimson', marginTop: -4 }}>{usersError}</p>}

      {chosen && (
        <div className="form-grid" style={{ marginTop: 4 }}>
          <FormField label="Email">
            <input value={chosen.email} disabled />
          </FormField>
          <FormField label="Phone">
            <input value={chosen.phone || '—'} disabled />
          </FormField>
        </div>
      )}

      <FormField label="Role">
        <select value={role} onChange={e => setRole(e.target.value)}>
          {CREW_ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </FormField>

      <FormField label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes about this member..." />
      </FormField>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !chosen}>
          {saving ? <><ButtonSpinner /> Adding...</> : <><Plus size={14} /> Add Member</>}
        </button>
      </div>
    </Modal>
  )
}

// ─── Add SD Card Modal ────────────────────────────────────────────────────────
function AddSDCardModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (c: SDCard & { owner?: string }) => void | Promise<void>
}) {
  const blank = { number: '', capacity: '128 GB', owner: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.number) return
    setSaving(true)
    try {
      await onAdd({
        id: `sd-${Date.now()}`,
        number: form.number,
        brand: 'Sony',
        capacity: form.capacity,
        serial: '',
        owner: form.owner,
        status: 'Available',
        history: [],
      })
      setForm(blank)
      onClose()
    } catch (err: any) {
      alert(`Failed to add SD card: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Add SD Card" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Card Number">
          <input value={form.number} onChange={set('number')} placeholder="e.g. SD-011" />
        </FormField>
        <FormField label="Capacity">
          <select value={form.capacity} onChange={set('capacity')}>
            {['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB'].map(c =>
              <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
        <FormField label="Owner">
          <input value={form.owner} onChange={set('owner')} placeholder="Who is responsible?" />
        </FormField>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? <><ButtonSpinner /> Adding...</> : <><Plus size={14} /> Add SD Card</>}
        </button>
      </div>
    </Modal>
  )
}

// ─── Add Hard Drive Modal ─────────────────────────────────────────────────────
function AddHardDriveModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (h: any) => void | Promise<void>
}) {
  const blank = { name: '', brand: 'Samsung', capacity: '4', owner: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await onAdd({
        id: `hd-${Date.now()}`,
        name: form.name,
        brand: form.brand,
        serial: '',
        capacity: Number(form.capacity),
        used: 0,
        status: 'Available',
        location: '',
        owner: form.owner,
        shoots: [],
      })
      setForm(blank)
      onClose()
    } catch (err: any) {
      alert(`Failed to add hard drive: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Add Hard Drive" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Drive Name">
          <input value={form.name} onChange={set('name')} placeholder="e.g. HD-006" />
        </FormField>
        <FormField label="Brand">
          <select value={form.brand} onChange={set('brand')}>
            {['Samsung','WD','Seagate','LaCie','SanDisk','Toshiba'].map(b =>
              <option key={b}>{b}</option>
            )}
          </select>
        </FormField>
        <FormField label="Capacity (TB)">
          <select value={form.capacity} onChange={set('capacity')}>
            {['1','2','4','6','8','10','12','16'].map(c =>
              <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
        <FormField label="Owner">
          <input value={form.owner} onChange={set('owner')} placeholder="Who is responsible?" />
        </FormField>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? <><ButtonSpinner /> Adding...</> : <><Plus size={14} /> Add Hard Drive</>}
        </button>
      </div>
    </Modal>
  )
}

// ─── Add Equipment Modal ──────────────────────────────────────────────────────
function AddEquipmentModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (e: Equipment) => void | Promise<void>
}) {
  const blank = { name: '', type: 'Camera Body', owner: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await onAdd({
        id: `e-${Date.now()}`,
        name: form.name,
        type: form.type,
        owner: form.owner,
        status: 'Available',
      })
      setForm(blank)
      onClose()
    } catch (err: any) {
      alert(`Failed to add equipment: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Add Equipment" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Equipment Name">
          <input value={form.name} onChange={set('name')} placeholder="e.g. Sony A7 IV" />
        </FormField>
        <FormField label="Type">
          <select value={form.type} onChange={set('type')}>
            {['Camera Body','Lens','Light','Audio','Stabilizer','Drone','Accessory','Other'].map(t =>
              <option key={t}>{t}</option>
            )}
          </select>
        </FormField>
        <FormField label="Owner">
          <input value={form.owner} onChange={set('owner')} placeholder="Who owns this?" />
        </FormField>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? <><ButtonSpinner /> Adding...</> : <><Plus size={14} /> Add Equipment</>}
        </button>
      </div>
    </Modal>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ open, name, onClose, onConfirm }: {
  open: boolean; name: string; onClose: () => void; onConfirm: () => void
}) {
  return (
    <Modal open={open} title="Confirm Delete" onClose={onClose} width={400}>
      <p style={{ fontSize: 13, color: '#4a4240', margin: '0 0 16px' }}>
        Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-danger" onClick={() => { onConfirm(); onClose() }}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SimpleResourcePage({
  title,
  subtitle,
  kind,
}: {
  readonly title: string
  readonly subtitle: string
  readonly kind: 'team' | 'sd' | 'hard' | 'equipment'
}) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'admin'
  const canAddMember = useCanDo('add_member')
  const canWrite = useCanWrite()

  const [query, setQuery] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [localMembers,   setLocalMembers]   = useState<CrewMember[]>([])
  const [localSDCards,   setLocalSDCards]   = useState<(SDCard & { owner?: string })[]>([])
  const [localDrives,    setLocalDrives]    = useState<(HardDriveType & { owner?: string })[]>([])
  const [localEquipment, setLocalEquipment] = useState<Equipment[]>([])

  // Fetch data when the page mounts or kind changes
  useEffect(() => {
    setLoading(true)
    setError('')
    const fetch =
      kind === 'team'      ? crewApi.list() :
      kind === 'sd'        ? sdCardsApi.list() :
      kind === 'hard'      ? hardDrivesApi.list() :
                             equipmentApi.list()

    fetch
      .then((data: any) => {
        // Guard against non-array responses so .map/.filter never crash.
        const list = Array.isArray(data) ? data : []
        if (kind === 'team')      setLocalMembers(list)
        if (kind === 'sd')        setLocalSDCards(list)
        if (kind === 'hard')      setLocalDrives(list)
        if (kind === 'equipment') setLocalEquipment(list)
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [kind])

  // Build display list
  const data =
    kind === 'team'
      ? localMembers.map(x => ({ id: x.id, name: x.name, meta: x.role, status: x.availability, extra: `${x.shoots} shoots` }))
      : kind === 'sd'
        ? localSDCards.map(x => ({ id: x.id, name: x.number, meta: x.capacity, status: x.status, extra: x.owner ? `Owner: ${x.owner}` : '' }))
        : kind === 'hard'
          ? localDrives.map(x => ({ id: x.id, name: x.name, meta: `${x.brand} · ${x.capacity} TB`, status: x.status, extra: x.owner ? `Owner: ${x.owner}` : `${x.used} TB used` }))
          : localEquipment.map(x => ({ id: x.id, name: x.name, meta: x.type, status: x.status, extra: `Owner: ${x.owner}` }))

  const filtered = data.filter(x =>
    `${x.name} ${x.meta} ${x.extra}`.toLowerCase().includes(query.toLowerCase())
  )

  const paths = { team: '/team', sd: '/sd-cards', hard: '/hard-drives', equipment: '/equipment' } as const
  const addLabel = kind === 'team' ? 'Member' : kind === 'sd' ? 'SD Card' : kind === 'hard' ? 'Hard Drive' : 'Equipment'
  // Team members: admin only. Other resources: any writer (admin/team). Viewers: none.
  const addDisabled = kind === 'team' ? !canAddMember : !canWrite

  // Delete handlers — call API then remove from local state
  const handleDelete = async (id: string) => {
    try {
      if (kind === 'team')      { await crewApi.remove(id);        setLocalMembers(p  => p.filter(x => x.id !== id)) }
      if (kind === 'sd')        { await sdCardsApi.remove(id);     setLocalSDCards(p  => p.filter(x => x.id !== id)) }
      if (kind === 'hard')      { await hardDrivesApi.remove(id);  setLocalDrives(p   => p.filter(x => x.id !== id)) }
      if (kind === 'equipment') { await equipmentApi.remove(id);   setLocalEquipment(p => p.filter(x => x.id !== id)) }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          addDisabled ? (
            <div className="no-access-btn" title="Only Super Admin can add team members">
              <ShieldOff size={14} /><span>No Access</span>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setAddModal(true)}>
              <Plus size={16} /> Add {addLabel}
            </button>
          )
        }
      />

      {addDisabled && (
        <div className="role-notice">
          <ShieldOff size={14} />
          <span>Adding team members requires Super Admin access.</span>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <SearchFilter value={query} onChange={setQuery} />
          <button type="button" className="btn btn-secondary">
            <ListFilter size={15} /> Filters
          </button>
        </div>

        {loading && <Loader message={`Loading ${title.toLowerCase()}...`} />}
        {error   && <p style={{ padding: 16, color: 'red',  fontSize: 13 }}>{error}</p>}

        {!loading && !error && (
          <div className="resource-grid">
            {filtered.map(x => (
              <div className="resource-card" key={x.id}>
                <div className="resource-icon">
                  {kind === 'team'      ? <Users size={17} />    :
                   kind === 'sd'        ? <Database size={17} /> :
                   kind === 'hard'      ? <HardDrive size={17}/> :
                                          <Package size={17} />}
                </div>
                <div className="grow">
                  <Link
                    to={kind === 'hard' ? `/hard-drives/${x.id}` : paths[kind]}
                    className="resource-name"
                  >
                    {x.name}
                  </Link>
                  <span>{x.meta}</span>
                  {x.extra && <small>{x.extra}</small>}
                </div>
                <Badge tone={statusTone(x.status)}>{x.status}</Badge>
                {isSuperAdmin && (
                  <button
                    type="button"
                    className="icon-btn delete-btn"
                    title={`Delete ${x.name}`}
                    onClick={() => setDeleteTarget({ id: x.id, name: x.name })}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '32px 0', textAlign: 'center', color: '#938b87', fontSize: 12 }}>
                No {addLabel.toLowerCase()}s found.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add modals */}
      {kind === 'team' && (
        <AddMemberModal
          open={addModal}
          onClose={() => setAddModal(false)}
          existingEmails={localMembers.map(m => m.email)}
          onAdd={async m => {
            const created = await crewApi.create(m)
            setLocalMembers(p => [created, ...p])
          }}
        />
      )}
      {kind === 'sd' && (
        <AddSDCardModal
          open={addModal}
          onClose={() => setAddModal(false)}
          onAdd={async c => {
            const created = await sdCardsApi.create(c)
            setLocalSDCards(p => [created, ...p])
          }}
        />
      )}
      {kind === 'hard' && (
        <AddHardDriveModal
          open={addModal}
          onClose={() => setAddModal(false)}
          onAdd={async h => {
            const created = await hardDrivesApi.create(h)
            setLocalDrives(p => [created, ...p])
          }}
        />
      )}
      {kind === 'equipment' && (
        <AddEquipmentModal
          open={addModal}
          onClose={() => setAddModal(false)}
          onAdd={async e => {
            const created = await equipmentApi.create(e)
            setLocalEquipment(p => [created, ...p])
          }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </AppLayout>
  )
}
