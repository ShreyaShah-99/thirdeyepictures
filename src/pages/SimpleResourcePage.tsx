import { AlertCircle, CheckCircle2, Clock, Eye, Package, Pencil, Plus, ShieldOff, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { activityApi, crewApi, equipmentApi, hardDrivesApi, sdCardsApi, shootsApi, usersApi, type Equipment, type RegisteredUser } from '../api'
import { useAuth, useCanDo, useCanWrite } from '../auth'
import { AppLayout, Badge, FormField, Modal, PageHeader, Pagination, SearchFilter, statusTone, usePagination } from '../components'
import { ButtonSpinner, Loader } from '../Spinner'
import type { CrewMember, HardDrive as HardDriveType, SDCard } from '../types'

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
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  // 'registered' = pick from Cognito users; 'manual' = admin types an unregistered name.
  const [mode, setMode] = useState<'registered' | 'manual'>('registered')
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualPhone, setManualPhone] = useState('')

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
  const already = new Set(existingEmails.filter(Boolean).map(e => e.toLowerCase()))
  const options = registered.filter(u => u.email && !already.has(u.email.toLowerCase()))
  const chosen = registered.find(u => u.username === selected)

  const reset = () => {
    setSelected(''); setNotes(''); setMode('registered')
    setManualName(''); setManualEmail(''); setManualPhone('')
  }

  const canSubmit = mode === 'registered' ? !!chosen : !!manualName.trim()

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      // Role isn't chosen here anymore — default it; the per-shoot Crew Assign
      // stage is where a role is picked for a given production.
      const member: CrewMember =
        mode === 'registered' && chosen
          ? {
              id: `m-${Date.now()}`,
              name: chosen.name || chosen.email,
              email: chosen.email,
              phone: chosen.phone,
              role: 'Other',
              availability: 'Available',
              shoots: 0,
            }
          : {
              id: `m-${Date.now()}`,
              name: manualName.trim(),
              email: manualEmail.trim(),
              phone: manualPhone.trim(),
              role: 'Other',
              availability: 'Available',
              shoots: 0,
            }
      await onAdd(member)
      reset()
      onClose()
    } catch (err: any) {
      alert(`Failed to add member: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Add Team Member" onClose={onClose}>
      {/* Registered vs unregistered toggle */}
      <FormField label="Member Type">
        <select value={mode} onChange={e => setMode(e.target.value as 'registered' | 'manual')}>
          <option value="registered">Registered user</option>
          <option value="manual">Unregistered (enter name)</option>
        </select>
      </FormField>

      {mode === 'registered' ? (
        <>
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
        </>
      ) : (
        <>
          <FormField label="Name">
            <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Full name" />
          </FormField>
          <div className="form-grid">
            <FormField label="Email (optional)">
              <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="email@example.com" />
            </FormField>
            <FormField label="Phone (optional)">
              <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="+91 00000 00000" />
            </FormField>
          </div>
          <p style={{ fontSize: 11, color: '#938b87', marginTop: -4 }}>
            This member isn't a registered account. They won't be able to log in until they sign up.
          </p>
        </>
      )}

      <FormField label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes about this member..." />
      </FormField>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !canSubmit}>
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

// ─── Edit Resource Modal (SD card / hard drive / equipment) ───────────────────
const SD_STATUSES = ['Available','Assigned','In Use','Data Copy Pending','Data Copied','Damaged','Lost','Retired']
const HD_STATUSES = ['Available','In Use','Full','Backup Pending','Backup Completed','Damaged','Lost','Retired']
const EQUIP_STATUSES = ['Available','In Use','Under Repair','Retired']
const EQUIP_TYPES = ['Camera Body','Lens','Light','Audio','Stabilizer','Drone','Accessory','Other']
const SD_CAPACITIES = ['32 GB','64 GB','128 GB','256 GB','512 GB','1 TB']
const HD_BRANDS = ['Samsung','WD','Seagate','LaCie','SanDisk','Toshiba']

function EditResourceModal({ kind, item, onClose, onSave }: {
  kind: 'sd' | 'hard' | 'equipment'
  item: any | null
  onClose: () => void
  onSave: (id: string, patch: any) => Promise<void>
}) {
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (item) setForm({ ...item }) }, [item])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!item) return
    setSaving(true)
    try {
      let patch: any
      if (kind === 'sd') {
        patch = { number: form.number, capacity: form.capacity, owner: form.owner, status: form.status }
      } else if (kind === 'hard') {
        patch = { name: form.name, brand: form.brand, capacity: Number(form.capacity), owner: form.owner, location: form.location, status: form.status }
      } else {
        patch = { name: form.name, type: form.type, owner: form.owner, status: form.status }
      }
      await onSave(item.id, patch)
      onClose()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const title = kind === 'sd' ? 'Edit SD Card' : kind === 'hard' ? 'Edit Hard Drive' : 'Edit Equipment'

  return (
    <Modal open={!!item} title={title} onClose={onClose}>
      <div className="form-grid">
        {kind === 'sd' && (
          <>
            <FormField label="Card Number"><input value={form.number ?? ''} onChange={set('number')} /></FormField>
            <FormField label="Capacity">
              <select value={form.capacity ?? '128 GB'} onChange={set('capacity')}>
                {SD_CAPACITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Owner"><input value={form.owner ?? ''} onChange={set('owner')} /></FormField>
            <FormField label="Status">
              <select value={form.status ?? 'Available'} onChange={set('status')}>
                {SD_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </>
        )}
        {kind === 'hard' && (
          <>
            <FormField label="Drive Name"><input value={form.name ?? ''} onChange={set('name')} /></FormField>
            <FormField label="Brand">
              <select value={form.brand ?? 'Samsung'} onChange={set('brand')}>
                {HD_BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </FormField>
            <FormField label="Capacity (TB)"><input type="number" value={form.capacity ?? 0} onChange={set('capacity')} /></FormField>
            <FormField label="Location"><input value={form.location ?? ''} onChange={set('location')} /></FormField>
            <FormField label="Owner"><input value={form.owner ?? ''} onChange={set('owner')} /></FormField>
            <FormField label="Status">
              <select value={form.status ?? 'Available'} onChange={set('status')}>
                {HD_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </>
        )}
        {kind === 'equipment' && (
          <>
            <FormField label="Equipment Name"><input value={form.name ?? ''} onChange={set('name')} /></FormField>
            <FormField label="Type">
              <select value={form.type ?? 'Other'} onChange={set('type')}>
                {EQUIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Owner"><input value={form.owner ?? ''} onChange={set('owner')} /></FormField>
            <FormField label="Status">
              <select value={form.status ?? 'Available'} onChange={set('status')}>
                {EQUIP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
          </>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Borrow Modal (SD card / equipment) ───────────────────────────────────────
function BorrowModal({ kind, item, onClose, onBorrow }: {
  kind: 'sd' | 'equipment'
  item: any | null
  onClose: () => void
  onBorrow: (id: string, patch: any) => Promise<void>
}) {
  const blank = { borrowedBy: '', pickupDate: '', returnDate: '', borrowNotes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => { if (item) setForm(blank) }, [item]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!item || !form.borrowedBy.trim()) return
    setSaving(true)
    try {
      await onBorrow(item.id, {
        status: 'Borrowed',
        borrowedBy: form.borrowedBy.trim(),
        pickupDate: form.pickupDate,
        returnDate: form.returnDate,
        borrowNotes: form.borrowNotes,
      })
      onClose()
    } catch (err: any) {
      alert(`Failed to record borrow: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!item} title={`Borrow ${kind === 'sd' ? 'SD Card' : 'Equipment'}`} onClose={onClose}>
      <FormField label="Borrowed By">
        <input value={form.borrowedBy} onChange={set('borrowedBy')} placeholder="Name of person borrowing" />
      </FormField>
      <div className="form-grid">
        <FormField label="Pickup Date">
          <input type="date" value={form.pickupDate} onChange={set('pickupDate')} />
        </FormField>
        <FormField label="Expected Return Date">
          <input type="date" value={form.returnDate} onChange={set('returnDate')} />
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea rows={3} value={form.borrowNotes} onChange={set('borrowNotes')} placeholder="Reason, condition, contact, etc." />
      </FormField>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !form.borrowedBy.trim()}>
          {saving ? 'Saving...' : 'Mark as Borrowed'}
        </button>
      </div>
    </Modal>
  )
}

// ─── View Details Modal (sd / hard / equipment) ──────────────────────────────
// Read-only activity/history for a single device: borrow dates, current usage,
// and per-shoot history where available.
function DetailRow({ label, value, danger }: { label: string; value?: string | number | null; danger?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="view-field" style={{ marginBottom: 6 }}>
      <span>{label}</span>
      <strong style={danger ? { color: '#c0392b' } : undefined}>{value}</strong>
    </div>
  )
}

function ViewDetailsModal({ kind, item, currentShoot, onClose }: {
  kind: 'sd' | 'hard' | 'equipment'
  item: any | null
  currentShoot?: string
  onClose: () => void
}) {
  const title =
    kind === 'sd'   ? `SD Card ${item?.number ?? ''} — Details`
  : kind === 'hard' ? `Hard Drive ${item?.name ?? ''} — Details`
  :                   `Equipment ${item?.name ?? ''} — Details`

  // SD card shoot usage history (array of { shootName, date, member }).
  const sdHistory: any[] = Array.isArray(item?.history) ? item.history : []
  // Hard drive shoot list (array of { shootName, client, date, folder, size, backup }).
  const hdShoots: any[] = Array.isArray(item?.shoots) ? item.shoots : []

  const isBorrowed = item?.status === 'Borrowed' || !!item?.borrowedBy

  return (
    <Modal open={!!item} title={title} onClose={onClose}>
      {item && (
        <div className="stage-form-view">
          {/* Prominent borrowed banner */}
          {isBorrowed && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fbe9e7', border: '1px solid #e8b4ad', color: '#c0392b',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                fontSize: 13, fontWeight: 600,
              }}
            >
              <ShieldOff size={15} />
              <span>This item is currently BORROWED{item.borrowedBy ? ` by ${item.borrowedBy}` : ''}.</span>
            </div>
          )}

          {/* Common fields */}
          <div className="form-grid">
            <DetailRow label="Status" value={item.status} danger={isBorrowed} />
            {kind === 'sd'   && <DetailRow label="Brand" value={item.brand} />}
            {kind === 'sd'   && <DetailRow label="Capacity" value={item.capacity} />}
            {kind === 'sd'   && <DetailRow label="Serial" value={item.serial} />}
            {kind === 'hard' && <DetailRow label="Brand" value={item.brand} />}
            {kind === 'hard' && <DetailRow label="Capacity" value={item.capacity != null ? `${item.capacity} TB` : ''} />}
            {kind === 'hard' && <DetailRow label="Used" value={item.used != null ? `${item.used} TB` : ''} />}
            {kind === 'hard' && <DetailRow label="Location" value={item.location} />}
            {kind === 'equipment' && <DetailRow label="Type" value={item.type} />}
            <DetailRow label="Owner" value={item.owner} />
            {kind === 'equipment' && currentShoot && <DetailRow label="Currently on shoot" value={currentShoot} />}
          </div>

          {/* Borrow activity — sd + equipment */}
          {(kind === 'sd' || kind === 'equipment') && (isBorrowed || item.borrowedBy) && (
            <div
              style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 8,
                background: '#fdf2f0', border: '1px solid #f0cfc9',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#c0392b', display: 'block', marginBottom: 6 }}>
                Borrow Activity
              </span>
              <div className="form-grid">
                <DetailRow label="Borrowed By" value={item.borrowedBy} danger />
                <DetailRow label="Pickup Date" value={item.pickupDate} danger />
                <DetailRow label="Expected Return" value={item.returnDate} danger />
              </div>
              <DetailRow label="Borrow Notes" value={item.borrowNotes} />
            </div>
          )}

          {/* SD card shoot history */}
          {kind === 'sd' && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>
                Shoot History
              </span>
              {sdHistory.length === 0 ? (
                <p style={{ fontSize: 12, color: '#938b87', margin: 0 }}>No shoot history yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sdHistory.map((h, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      <strong style={{ fontSize: 13 }}>{h.shootName ?? 'Shoot'}</strong>
                      <div style={{ fontSize: 11, color: '#625b58', marginTop: 2 }}>
                        {h.date || '—'}{h.member ? ` · ${h.member}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hard drive shoot list */}
          {kind === 'hard' && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>
                Shoots on this Drive
              </span>
              {hdShoots.length === 0 ? (
                <p style={{ fontSize: 12, color: '#938b87', margin: 0 }}>No shoots stored on this drive yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hdShoots.map((s, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 13, flex: 1 }}>{s.shootName ?? 'Shoot'}</strong>
                        {s.backup && <Badge tone={s.backup === 'Completed' ? 'success' : 'warning'}>{s.backup}</Badge>}
                      </div>
                      <div style={{ fontSize: 11, color: '#625b58', marginTop: 2 }}>
                        {s.client ? `${s.client} · ` : ''}{s.date || '—'}
                        {s.folder ? ` · ${s.folder}` : ''}{s.size != null ? ` · ${s.size} TB` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
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
  const [statusFilter, setStatusFilter] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [localMembers,   setLocalMembers]   = useState<CrewMember[]>([])
  const [localSDCards,   setLocalSDCards]   = useState<(SDCard & { owner?: string })[]>([])
  const [localDrives,    setLocalDrives]    = useState<(HardDriveType & { owner?: string })[]>([])
  const [localEquipment, setLocalEquipment] = useState<Equipment[]>([])
  // For the Team list: which shoots each member is currently on.
  type MemberShoot = { id: string; name: string; date: string; venue: string; stage: string; status: string }
  const [shootsByMember, setShootsByMember] = useState<Record<string, MemberShoot[]>>({})
  // For the Equipment list: which shoot currently uses each equipment (by name).
  const [shootByEquipment, setShootByEquipment] = useState<Record<string, string>>({})

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

    // Team: derive which shoots each member is on, live from the shoots.
    if (kind === 'team') {
      shootsApi.list()
        .then(shoots => {
          const map: Record<string, MemberShoot[]> = {}
          for (const sh of shoots) {
            const ids = sh.crewIds?.length
              ? sh.crewIds
              : ((sh.stageFormData?.['Crew Assign']?.crewAssignments as { crewId: string }[] | undefined) ?? []).map(c => c.crewId)
            const entry: MemberShoot = { id: sh.id, name: sh.name, date: sh.date, venue: sh.venue, stage: sh.currentStage, status: sh.status }
            for (const id of ids) (map[id] ??= []).push(entry)
          }
          setShootsByMember(map)
        })
        .catch(() => setShootsByMember({}))
    }

    // Equipment: derive which shoot currently uses each equipment (by name),
    // live from the shoots' Equipment Assign stage data. This is the source of
    // truth — an item is "in use" only if it's actually in some shoot.
    if (kind === 'equipment') {
      shootsApi.list()
        .then(shoots => {
          const map: Record<string, string> = {}
          for (const sh of shoots) {
            const list = (sh.stageFormData?.['Equipment Assign']?.equipmentList as { equipment: string }[] | undefined) ?? []
            for (const e of list) map[e.equipment] = sh.name
          }
          setShootByEquipment(map)
        })
        .catch(() => setShootByEquipment({}))
    }
  }, [kind])

  // Build a uniform row model for the table.
  // code = short id/number, name, serial, category, status, holder (borrower/owner).
  type Row = { id: string; code: string; name: string; serial: string; category: string; status: string; holder: string; borrowed?: boolean; borrowedBy?: string }
  const rows: Row[] =
    kind === 'team'
      ? localMembers.filter(x => x.name?.trim()).map(x => {
          const n = shootsByMember[x.id]?.length ?? 0
          // Status driven by actual shoot assignment: on a shoot = Assigned,
          // otherwise Available (On Leave is preserved from the record).
          const status = x.availability === 'On Leave' ? 'On Leave' : n > 0 ? 'Assigned' : 'Available'
          return { id: x.id, code: '', name: x.name, serial: x.email, category: x.role, status, holder: `${n} shoot${n === 1 ? '' : 's'}` }
        })
      : kind === 'sd'
        ? localSDCards.map((x: any) => {
            const borrowed = x.status === 'Borrowed' || !!x.borrowedBy
            return { id: x.id, code: x.number, name: `${x.brand} ${x.capacity}`, serial: x.serial || '', category: x.capacity, status: x.status, holder: borrowed ? (x.borrowedBy || '') : (x.owner || ''), borrowed, borrowedBy: x.borrowedBy || '' }
          })
        : kind === 'hard'
          ? localDrives.map((x: any) => ({ id: x.id, code: x.name, name: `${x.brand} · ${x.capacity} TB`, serial: x.serial || '', category: `${x.capacity} TB`, status: x.status, holder: x.owner || x.location || '' }))
          : localEquipment.map((x: any) => {
              const inShoot = shootByEquipment[x.name]
              // An item is "borrowed" if its record says so OR it still carries a
              // borrowedBy — the Equipment Assign flow can overwrite `status` to
              // 'Assigned' while the item is physically borrowed, so check both.
              const borrowed = x.status === 'Borrowed' || !!x.borrowedBy
              const status = borrowed ? 'Borrowed' : inShoot ? 'Assigned' : 'Available'
              // Holder shows the borrower; if it's ALSO on a shoot, note that too.
              const holder = borrowed
                ? `${x.borrowedBy || 'Borrowed'}${inShoot ? ` · Shoot: ${inShoot}` : ''}`
                : inShoot ? `Shoot: ${inShoot}` : (x.owner || '')
              return { id: x.id, code: x.id?.slice(0, 8) ?? '', name: x.name, serial: '', category: x.type, status, holder, borrowed, borrowedBy: x.borrowedBy || '' }
            })

  const filtered = rows.filter(r => {
    const matchSearch = `${r.code} ${r.name} ${r.serial} ${r.category} ${r.holder}`.toLowerCase().includes(query.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10)

  // Summary counts for the stat cards (device kinds only).
  const countBy = (pred: (r: Row) => boolean) => rows.filter(pred).length
  const stats = [
    { label: 'Available', icon: CheckCircle2, tone: '#2e9e5b', bg: '#e8f6ee', value: countBy(r => r.status === 'Available') },
    { label: 'Borrowed',  icon: Package,      tone: '#c0392b', bg: '#fbe9e7', value: countBy(r => r.status === 'Borrowed') },
    { label: 'Assigned',  icon: Clock,        tone: '#d98324', bg: '#fbefe0', value: countBy(r => r.status === 'Assigned' || r.status === 'In Use') },
    { label: 'Retired',   icon: AlertCircle,  tone: '#c0392b', bg: '#fbe9e7', value: countBy(r => ['Retired','Damaged','Lost'].includes(r.status)) },
  ]
  const allStatuses = Array.from(new Set(rows.map(r => r.status)))

  const paths = { team: '/team', sd: '/sd-cards', hard: '/hard-drives', equipment: '/equipment' } as const
  const addLabel = kind === 'team' ? 'Member' : kind === 'sd' ? 'SD Card' : kind === 'hard' ? 'Hard Drive' : 'Equipment'
  // Team members: admin only. Other resources: any writer (admin/team). Viewers: none.
  const addDisabled = kind === 'team' ? !canAddMember : !canWrite

  const kindLabel = kind === 'sd' ? 'SD card' : kind === 'hard' ? 'hard drive' : kind === 'equipment' ? 'equipment' : 'member'

  // Delete handlers — call API then remove from local state
  const handleDelete = async (id: string) => {
    try {
      if (kind === 'team')      { await crewApi.remove(id);        setLocalMembers(p  => p.filter(x => x.id !== id)) }
      if (kind === 'sd')        { await sdCardsApi.remove(id);     setLocalSDCards(p  => p.filter(x => x.id !== id)) }
      if (kind === 'hard')      { await hardDrivesApi.remove(id);  setLocalDrives(p   => p.filter(x => x.id !== id)) }
      if (kind === 'equipment') { await equipmentApi.remove(id);   setLocalEquipment(p => p.filter(x => x.id !== id)) }
      activityApi.log(`${kindLabel} deleted`).catch(() => {})
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  // Edit (sd / hard / equipment). `editTarget` holds the raw record.
  const [editTarget, setEditTarget] = useState<any | null>(null)

  const findRaw = (id: string) =>
    kind === 'sd'        ? localSDCards.find(x => x.id === id) :
    kind === 'hard'      ? localDrives.find(x => x.id === id) :
    kind === 'equipment' ? localEquipment.find(x => x.id === id) :
                           undefined

  const handleEditSave = async (id: string, patch: any) => {
    let name = ''
    if (kind === 'sd')        { const u: any = await sdCardsApi.update(id, patch);    name = u.number; setLocalSDCards(p  => p.map(x => x.id === id ? { ...x, ...u } : x)) }
    if (kind === 'hard')      { const u: any = await hardDrivesApi.update(id, patch); name = u.name;   setLocalDrives(p   => p.map(x => x.id === id ? { ...x, ...u } : x)) }
    if (kind === 'equipment') { const u: any = await equipmentApi.update(id, patch);  name = u.name;   setLocalEquipment(p => p.map(x => x.id === id ? { ...x, ...u } : x)) }
    const action = patch.status === 'Borrowed' ? `${kindLabel} ${name} borrowed by ${patch.borrowedBy ?? ''}` : `${kindLabel} ${name} updated`
    activityApi.log(action).catch(() => {})
  }

  // Borrow / Return (sd + equipment only)
  const [borrowTarget, setBorrowTarget] = useState<any | null>(null)
  // View Details (sd / hard / equipment) — shows activity/history in a modal.
  const [detailsTarget, setDetailsTarget] = useState<any | null>(null)
  // Team: member whose shoot list is shown in a popup.
  const [memberShootsTarget, setMemberShootsTarget] = useState<{ name: string; shoots: MemberShoot[] } | null>(null)

  const handleReturn = async (id: string) => {
    // Clear borrow fields and set back to Available.
    const patch: any = { status: 'Available', borrowedBy: '', pickupDate: '', returnDate: '', borrowNotes: '' }
    try {
      let name = ''
      if (kind === 'sd')        { const u: any = await sdCardsApi.update(id, patch);   name = u.number; setLocalSDCards(p  => p.map(x => x.id === id ? { ...x, ...u } : x)) }
      if (kind === 'equipment') { const u: any = await equipmentApi.update(id, patch); name = u.name;   setLocalEquipment(p => p.map(x => x.id === id ? { ...x, ...u } : x)) }
      activityApi.log(`${kindLabel} ${name} returned`).catch(() => {})
    } catch (err: any) {
      alert(`Failed to return: ${err.message}`)
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

      {/* Summary stat cards (device kinds only) */}
      {kind !== 'team' && (
        <div className="inv-stats">
          {stats.map(s => (
            <div className="inv-stat" key={s.label}>
              <div className="inv-stat-icon" style={{ background: s.bg, color: s.tone }}>
                <s.icon size={18} />
              </div>
              <div>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <SearchFilter value={query} onChange={setQuery} placeholder="Search by name, code, serial..." />
          <select
            className="select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: 44, fontSize: 12, borderRadius: 10 }}
          >
            <option value="">All Statuses</option>
            {allStatuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading && <Loader message={`Loading ${title.toLowerCase()}...`} />}
        {error   && <p style={{ padding: 16, color: 'red',  fontSize: 13 }}>{error}</p>}

        {!loading && !error && (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  {kind !== 'team' && <th>Code</th>}
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Holder</th>
                  {canWrite && <th className="inv-action-col">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(r => (
                  <tr key={r.id}>
                    {kind !== 'team' && <td className="inv-code">{r.code || '—'}</td>}
                    <td>
                      {kind === 'team' ? (
                        <button
                          type="button"
                          className="inv-name"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
                          onClick={() => setMemberShootsTarget({ name: r.name, shoots: shootsByMember[r.id] ?? [] })}
                        >
                          {r.name}
                        </button>
                      ) : (
                        <Link to={kind === 'hard' ? `/hard-drives/${r.id}` : paths[kind]} className="inv-name">{r.name}</Link>
                      )}
                      {r.serial && <div className="inv-serial">SN: {r.serial}</div>}
                    </td>
                    <td>{r.category || '—'}</td>
                    <td>
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      {r.borrowed && r.status !== 'Borrowed' && (
                        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#fff', background: '#c0392b', borderRadius: 999, padding: '2px 7px', textTransform: 'uppercase' }}>
                          Borrowed
                        </span>
                      )}
                    </td>
                    <td style={r.borrowed ? { color: '#c0392b', fontWeight: 600 } : undefined}>{r.holder || '—'}</td>
                    {canWrite && (
                      <td className="inv-action-col">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {kind !== 'team' && (
                            <button type="button" className="icon-btn" title={`View details for ${r.name}`} onClick={() => setDetailsTarget(findRaw(r.id))}>
                              <Eye size={14} />
                            </button>
                          )}
                          {(kind === 'sd' || kind === 'equipment') && (
                            r.borrowed ? (
                              <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px', width: 84, textAlign: 'center' }} onClick={() => handleReturn(r.id)}>Return</button>
                            ) : (
                              <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px', width: 84, textAlign: 'center' }} onClick={() => setBorrowTarget(findRaw(r.id))}>Checkout</button>
                            )
                          )}
                          {kind !== 'team' && (
                            <button type="button" className="icon-btn" title={`Edit ${r.name}`} onClick={() => setEditTarget(findRaw(r.id))}>
                              <Pencil size={14} />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button type="button" className="icon-btn delete-btn" title={`Delete ${r.name}`} onClick={() => setDeleteTarget({ id: r.id, name: r.name })}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={(kind === 'team' ? 4 : 5) + (canWrite ? 1 : 0)} style={{ padding: '32px 0', textAlign: 'center', color: '#938b87', fontSize: 12 }}>
                      No {addLabel.toLowerCase()}s found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </div>
        )}
      </section>

      {/* Add modals */}
      {kind === 'team' && (
        <AddMemberModal
          open={addModal}
          onClose={() => setAddModal(false)}
          existingEmails={localMembers.map(m => m.email).filter(Boolean)}
          onAdd={async m => {
            const created = await crewApi.create(m)
            setLocalMembers(p => [created, ...p])
            activityApi.log(`Team member ${created.name} added`).catch(() => {})
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
            activityApi.log(`SD card ${created.number} added`).catch(() => {})
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
            activityApi.log(`Hard drive ${created.name} added`).catch(() => {})
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
            activityApi.log(`Equipment ${created.name} added`).catch(() => {})
          }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />

      {kind !== 'team' && (
        <EditResourceModal
          kind={kind}
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}

      {(kind === 'sd' || kind === 'equipment') && (
        <BorrowModal
          kind={kind}
          item={borrowTarget}
          onClose={() => setBorrowTarget(null)}
          onBorrow={handleEditSave}
        />
      )}

      {kind !== 'team' && (
        <ViewDetailsModal
          kind={kind}
          item={detailsTarget}
          currentShoot={kind === 'equipment' && detailsTarget ? shootByEquipment[detailsTarget.name] : undefined}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {/* Team: popup listing the shoots a member is on */}
      <Modal
        open={!!memberShootsTarget}
        title={memberShootsTarget ? `${memberShootsTarget.name} — Shoots` : 'Shoots'}
        onClose={() => setMemberShootsTarget(null)}
      >
        {memberShootsTarget && memberShootsTarget.shoots.length === 0 ? (
          <p style={{ fontSize: 13, color: '#938b87', margin: 0 }}>Not assigned to any shoot.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {memberShootsTarget?.shoots.map(sh => (
              <Link
                key={sh.id}
                to={`/shoots/${sh.id}`}
                onClick={() => setMemberShootsTarget(null)}
                style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13, flex: 1 }}>{sh.name}</strong>
                  <Badge tone={statusTone(sh.stage)}>{sh.stage}</Badge>
                </div>
                <div style={{ fontSize: 11, color: '#625b58', marginTop: 4 }}>
                  {sh.date || '—'}{sh.venue ? ` · ${sh.venue}` : ''} · {sh.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
