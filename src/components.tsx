import {
  Activity, Archive, Bell, CalendarDays, Camera, Check,
  ClipboardList,
  Clock3,
  Crown,
  Database,
  ExternalLink,
  FileText,
  HardDrive, LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu, Package,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserRound,
  Users, X
} from 'lucide-react'
import React, { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { activityApi, crewApi, equipmentApi, sdCardsApi, shootsApi, tasksApi } from './api'
import logoImg from './assets/Images/ThirdEye_Logo.png'
import { useAuth } from './auth'
import { workflowStages } from './data'
import { useResources } from './resources'
import type { Shoot, WorkflowStage } from './types'

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ')

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'info'|'brown' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function statusTone(status?: string) {
  const s = (status ?? '').toLowerCase()
  if (s.includes('complete') || s === 'delivered' || s === 'available') return 'success' as const
  if (s.includes('pending') || s.includes('progress') || s === 'assigned' || s === 'in use' || s === 'wrapped') return 'warning' as const
  if (s.includes('lost') || s.includes('damaged') || s.includes('overdue')) return 'danger' as const
  if (s === 'editing' || s === 'scheduled' || s === 'borrowed') return 'info' as const
  return 'neutral' as const
}

const nav = [
  ['Dashboard', '/', LayoutDashboard],
  ['Shoots', '/shoots', Camera],
  ['Calendar', '/calendar', CalendarDays],
  ['Team', '/team', Users],
  ['Equipment', '/equipment', Package],
  ['SD Cards', '/sd-cards', Database],
  ['Hard Drives', '/hard-drives', HardDrive],
  ['Tasks', '/tasks', ClipboardList],
  ['Notifications', '/notifications', Bell],
  ['Activity', '/activity', Activity],
] as const

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={cx('sidebar', mobileOpen && 'sidebar-open')}>
        <div className="brand">
          <img src={logoImg} alt="Third Eye Photography" className="sidebar-logo" />
        </div>
        <nav className="nav">
          {nav.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileOpen(false)} className={({isActive}) => cx('nav-item', isActive && 'active')}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{user?.initials ?? 'AU'}</div>
            <div>
              <strong>{user?.name ?? 'User'}</strong>
              <small style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {user?.accessLevel === 'admin'
                  ? <><Crown size={9}/> Admin</>
                  : user?.accessLevel === 'team'
                  ? <><Shield size={9}/> Team</>
                  : <><Shield size={9}/> Viewer (read-only)</>
                }
              </small>
            </div>
          </div>
          <button className="icon-btn" title="Sign out" onClick={handleLogout}><LogOut size={17}/></button>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu icon-btn" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <div className="topbar-title">Production workspace</div>
          <div className="topbar-actions">
            <Link className="icon-btn" to="/notifications"><Bell size={18}/><span className="notification-dot"/></Link>
            <div className="top-avatar">{user?.initials ?? 'AU'}</div>
          </div>
        </header>
        <div className="content">
          {user?.accessLevel === 'viewer' && (
            <div className="role-notice" style={{ marginBottom: 16 }}>
              <Shield size={14} />
              <span>You have read-only access. An admin needs to add you to the team to enable editing.</span>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

// ─── View-only field ──────────────────────────────────────────────────────────
// Signature of a stage's saved data. Used in the StageForm `key` so the form
// remounts (and re-reads its inputs) whenever the data changes. This must be
// LOSSLESS: a length-based signature collides for same-length edits (e.g.
// changing a note to a different value of equal length), which would leave the
// form showing stale values after an edit.
function dataVersion(data?: Record<string, unknown>): string {
  if (!data) return 'none'
  try {
    return JSON.stringify(data)
  } catch {
    return 'x'
  }
}

function ViewField({ label, value }: { label: string; value?: string | boolean | null }) {
  if (value === undefined || value === null || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
  return (
    <div className="view-field">
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  )
}

// ─── Stage forms ─────────────────────────────────────────────────────────────

function InquiryForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    eventName: (existing?.eventName as string) ?? '',
    clientName: (existing?.clientName as string) ?? '',
    email: (existing?.email as string) ?? '',
    phone: (existing?.phone as string) ?? '',
    eventType: (existing?.eventType as string) ?? '',
    eventDate: (existing?.eventDate as string) ?? '',
    eventTime: (existing?.eventTime as string) ?? '',
    message: (existing?.message as string) ?? '',
  })
  const [error, setError] = useState('')
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    // Shoot Name and Shoot Date are mandatory.
    if (!form.eventName.trim()) { setError('Shoot Name is required.'); return }
    if (!form.eventDate) { setError('Shoot Date is required.'); return }
    setError('')
    onSubmit({ ...form, eventName: form.eventName.trim() })
  }

  if (existing && !editing) {
    return (
      <div className="stage-form-view">
        <div className="form-grid">
          <ViewField label="Shoot Name" value={existing.eventName as string} />
          <ViewField label="Client Name" value={existing.clientName as string} />
          <ViewField label="Email" value={existing.email as string} />
          <ViewField label="Phone" value={existing.phone as string} />
          <ViewField label="Shoot Type" value={existing.eventType as string} />
          <ViewField label="Shoot Date" value={existing.eventDate as string} />
          <ViewField label="Shoot Time" value={existing.eventTime as string} />
        </div>
        <ViewField label="Message" value={existing.message as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div className="form-grid">
        <FormField label="Shoot Name *"><input value={form.eventName} onChange={set('eventName')} placeholder="e.g. Patel Wedding" /></FormField>
        <FormField label="Client Name"><input value={form.clientName} onChange={set('clientName')} placeholder="Full name" /></FormField>
        <FormField label="Email"><input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" /></FormField>
        <FormField label="Phone"><input value={form.phone} onChange={set('phone')} placeholder="+91 00000 00000" /></FormField>
        <FormField label="Shoot Type">
          <select value={form.eventType} onChange={set('eventType')}>
            <option value="">Select type</option>
            <optgroup label="Events & Celebrations">
              {['Wedding','Pre-Wedding','Engagement','Birthday','Anniversary','Babyshower','Housewarming','Office Inauguration','Farewell & Retirement Parties','Corporate Event','Cultural Event','Social Event','Collage Event','Product Launches & Openings','BNI Shoot','V2VBN Shoot'].map(x=><option key={x}>{x}</option>)}
            </optgroup>
            <optgroup label="Commercial Shoots">
              {['Product Shoot','Brand Shoot','Podcast Shoot','Advertising Shoot','Car Delivery Shoot','Fashion Shoot','Jewellery Shoot','Industrial Shoot','Food / Restaurant Shoot','Podcast / Interview Shoot','Social Media Content Shoot','BTS Shoot','Travel Shoot'].map(x=><option key={x}>{x}</option>)}
            </optgroup>
            <optgroup label="Interior & Architecture">
              {['Interior Shoot','Architecture Shoot','Real Estate Shoot','Hotel / Resort Shoot','Construction Progress Shoot'].map(x=><option key={x}>{x}</option>)}
            </optgroup>
            <optgroup label="Other">
              <option>Other</option>
            </optgroup>
          </select>
        </FormField>
        <FormField label="Shoot Date *"><input type="date" value={form.eventDate} onChange={set('eventDate')} /></FormField>
        <FormField label="Shoot Time"><input type="time" value={form.eventTime} onChange={set('eventTime')} /></FormField>
      </div>
      <FormField label="Message"><textarea rows={3} value={form.message} onChange={set('message')} placeholder="Tell us about the event..." /></FormField>
      {error && <p style={{ color: 'crimson', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={submit}><Check size={14}/> Submit Inquiry</button>
      </div>
    </div>
  )
}

function ConfirmForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  if (existing && !editing) {
    const confirmed = existing.confirmed as boolean | undefined
    const cancelled = existing.status === 'cancelled'
    return (
      <div className="stage-form-view">
        <ViewField label="Notes" value={existing.notes as string} />
        <div style={{ marginTop: 8 }}>
          {cancelled
            ? <Badge tone="danger">Cancelled</Badge>
            : confirmed
              ? <Badge tone="success">Confirmed</Badge>
              : <Badge tone="neutral">Pending</Badge>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <FormField label="Notes">
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any confirmation details..." />
      </FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-danger" onClick={() => onSubmit({ notes, status: 'cancelled', confirmed: false })}>
          <X size={14}/> Cancel Shoot
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit({ notes, confirmed: true, status: 'confirmed' })}>
          <Check size={14}/> Confirm Booking
        </button>
      </div>
    </div>
  )
}

function ScheduleForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    shootDate: (existing?.shootDate as string) ?? '',
    startTime: (existing?.startTime as string) ?? '',
    endTime: (existing?.endTime as string) ?? '',
    venue: (existing?.venue as string) ?? '',
    city: (existing?.city as string) ?? '',
    mapLink: (existing?.mapLink as string) ?? '',
    contactPersonName: (existing?.contactPersonName as string) ?? '',
    contactPersonPhone: (existing?.contactPersonPhone as string) ?? '',
    notes: (existing?.notes as string) ?? '',
  })
  const [error, setError] = useState('')
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    // Venue and Shoot Date are mandatory.
    if (!form.venue.trim()) { setError('Venue is required.'); return }
    if (!form.shootDate) { setError('Shoot Date is required.'); return }
    setError('')
    onSubmit({ ...form, venue: form.venue.trim() })
  }

  if (existing && !editing) {
    return (
      <div className="stage-form-view">
        <div className="form-grid three">
          <ViewField label="Shoot Date" value={existing.shootDate as string} />
          <ViewField label="Start Time" value={existing.startTime as string} />
          <ViewField label="End Time" value={existing.endTime as string} />
          <ViewField label="Venue" value={existing.venue as string} />
          <ViewField label="City" value={existing.city as string} />
          {existing.mapLink ? (
            <div className="view-field">
              <span>Google Maps</span>
              <strong>
                <a href={existing.mapLink as string} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open location <ExternalLink size={12} />
                </a>
              </strong>
            </div>
          ) : null}
          <ViewField label="Contact Person" value={existing.contactPersonName as string} />
          <ViewField label="Contact Phone" value={existing.contactPersonPhone as string} />
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div className="form-grid three">
        <FormField label="Shoot Date *"><input type="date" value={form.shootDate} onChange={set('shootDate')} /></FormField>
        <FormField label="Start Time"><input type="time" value={form.startTime} onChange={set('startTime')} /></FormField>
        <FormField label="End Time"><input type="time" value={form.endTime} onChange={set('endTime')} /></FormField>
        <FormField label="Venue *"><input value={form.venue} onChange={set('venue')} placeholder="Venue name" /></FormField>
        <FormField label="City"><input value={form.city} onChange={set('city')} placeholder="City" /></FormField>
        <FormField label="Google Maps Link"><input type="url" value={form.mapLink} onChange={set('mapLink')} placeholder="https://maps.google.com/..." /></FormField>
        <FormField label="Contact Person Name"><input value={form.contactPersonName} onChange={set('contactPersonName')} placeholder="On-site contact name" /></FormField>
        <FormField label="Contact Person Phone"><input value={form.contactPersonPhone} onChange={set('contactPersonPhone')} placeholder="+91 00000 00000" /></FormField>
      </div>
      <FormField label="Notes"><textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Location details, parking, etc." /></FormField>
      {error && <p style={{ color: 'crimson', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={submit}><Check size={14}/> Save Schedule</button>
      </div>
    </div>
  )
}

// Crew Assign — crew selection with role dropdown per member
function CrewAssignForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members, refresh } = useResources()
  const CREW_ROLES = ['Photographer','Videographer','Candid Photographer','Traditional Photographer','Cinematographer','Traditional Videographer','Drone Operator','Assistant','Manager','Photographer + Coordinator','Videographer + Coordinator','Additional Photographer','Additional Videographer','Other']

  type CrewEntry = { crewId: string; role: string }

  const initCrew: CrewEntry[] = existing?.crewAssignments
    ? (existing.crewAssignments as CrewEntry[])
    : (existing?.crewIds as string[] ?? []).map(id => ({ crewId: id, role: 'Photographer' }))

  const [crewAssignments, setCrewAssignments] = useState<CrewEntry[]>(initCrew)
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  const toggleCrew = (id: string) => {
    setCrewAssignments(prev => {
      const exists = prev.find(e => e.crewId === id)
      if (exists) return prev.filter(e => e.crewId !== id)
      return [...prev, { crewId: id, role: 'Photographer' }]
    })
  }

  const setCrewRole = (crewId: string, role: string) => {
    setCrewAssignments(prev => prev.map(e => e.crewId === crewId ? { ...e, role } : e))
  }

  // Save the stage AND update crew availability. Always force the currently
  // selected members to 'Assigned' (idempotent). Any member who was in the
  // previously-saved assignment but is no longer selected is reset to 'Available'.
  const submitCrew = async () => {
    // Only operate on ids that map to a REAL existing crew member. Updating an
    // unknown id would make DynamoDB upsert a blank "ghost" member (no name).
    const validId = (id: string | undefined): id is string => !!id && members.some(m => m.id === id)
    const prevIds = ((existing?.crewAssignments as CrewEntry[] | undefined) ?? []).map(e => e.crewId).filter(validId)
    const nowIds = crewAssignments.map(e => e.crewId).filter(validId)
    const removed = prevIds.filter(id => !nowIds.includes(id))

    // For removed members, only mark Available if they're on NO other shoot.
    // Build the set of crew ids assigned on every OTHER shoot (this shoot uses
    // the new selection, nowIds, since its save hasn't landed yet).
    let stillAssignedElsewhere = new Set<string>()
    if (removed.length > 0) {
      try {
        const allShoots = await shootsApi.list()
        for (const sh of allShoots) {
          if (shoot && sh.id === shoot.id) continue // skip current shoot
          for (const cid of sh.crewIds ?? []) stillAssignedElsewhere.add(cid)
        }
      } catch (e) {
        console.error('Failed to load shoots for availability check', e)
        // On failure, be conservative and treat all removed as still assigned
        // (don't wrongly free them). They can be freed manually if needed.
        stillAssignedElsewhere = new Set(removed)
      }
    }
    const toFree = removed.filter(id => !stillAssignedElsewhere.has(id))

    await Promise.all([
      // Set every selected member to Assigned (idempotent).
      ...nowIds.map(id => crewApi.update(id, { availability: 'Assigned' }).catch((e: unknown) => console.error('crew assign failed', e))),
      // Free only members no longer on this or any other shoot.
      ...toFree.map(id => crewApi.update(id, { availability: 'Available' }).catch((e: unknown) => console.error('crew unassign failed', e))),
    ])
    onSubmit({ crewAssignments, notes })
    activityApi.log(`${nowIds.length} crew member(s) assigned`).catch(() => {})
    refresh()
  }

  if (existing && !editing) {
    const assignments = (existing.crewAssignments as CrewEntry[] | undefined) ?? []
    return (
      <div className="stage-form-view">
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Assigned Crew</span>
          <div className="crew-chips">
            {assignments.map(a => {
              const m = members.find(x => x.id === a.crewId)
              return m ? <span key={a.crewId} className="crew-chip">{m.name} — {a.role}</span> : null
            })}
          </div>
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>Select Crew Members</span>
        <div className="crew-check-list">
          {members.filter(m => m.availability !== 'On Leave' && m.name?.trim()).map(m => {
            const assigned = crewAssignments.find(e => e.crewId === m.id)
            return (
              <label key={m.id} className="crew-check-item" style={{ alignItems: 'center' }}>
                <input type="checkbox" checked={!!assigned} onChange={() => toggleCrew(m.id)} />
                <div style={{ flex: 1 }}>
                  <strong>{m.name}</strong>
                  <small>{m.role} · {m.availability}</small>
                </div>
                {assigned && (
                  <select
                    value={assigned.role}
                    onChange={e => { e.stopPropagation(); setCrewRole(m.id, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #d4cbc6', background: '#fff', cursor: 'pointer' }}
                  >
                    {CREW_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                )}
              </label>
            )
          })}
        </div>
      </div>
      <FormField label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Crew briefing notes..." /></FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={submitCrew}><Check size={14}/> Assign Crew</button>
      </div>
    </div>
  )
}

// Equipment Assign — its own pipeline stage
function EquipmentAssignForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members, equipment, refresh } = useResources()
  type EquipmentEntry = { equipment: string; assignedTo: string }

  // Equipment names assigned to OTHER shoots — those are busy and must not be
  // selectable here (prevents double-booking the same gear across shoots).
  const [busyElsewhere, setBusyElsewhere] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    shootsApi.list()
      .then(shoots => {
        const names = new Set<string>()
        for (const sh of shoots) {
          if (shoot && sh.id === shoot.id) continue // this shoot's own picks stay available
          const list = (sh.stageFormData?.['Equipment Assign']?.equipmentList as EquipmentEntry[] | undefined) ?? []
          for (const e of list) names.add(e.equipment)
        }
        if (!cancelled) setBusyElsewhere(names)
      })
      .catch(() => { if (!cancelled) setBusyElsewhere(new Set()) })
    return () => { cancelled = true }
  }, [shoot?.id])

  // Equipment options come from the Equipment resource (added in the Equipment
  // section), excluding any gear already assigned to another shoot.
  const equipmentNames = equipment.map(e => e.name).filter(n => !busyElsewhere.has(n))

  // Only crew assigned to THIS shoot (in the Crew Assign stage) can be chosen.
  type CrewEntry = { crewId: string; role: string }
  const assignedCrewIds = ((shoot?.stageFormData?.['Crew Assign']?.crewAssignments as CrewEntry[] | undefined) ?? [])
    .map(c => c.crewId)
  const assignableMembers = members.filter(m => assignedCrewIds.includes(m.id))

  const initList: EquipmentEntry[] = (existing?.equipmentList as EquipmentEntry[]) ?? []
  const [equipmentList, setEquipmentList] = useState<EquipmentEntry[]>(initList)
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  const toggle = (eq: string) => {
    setEquipmentList(prev => {
      const exists = prev.find(e => e.equipment === eq)
      if (exists) return prev.filter(e => e.equipment !== eq)
      return [...prev, { equipment: eq, assignedTo: '' }]
    })
  }

  const setAssignee = (eq: string, assignedTo: string) => {
    setEquipmentList(prev => prev.map(e => e.equipment === eq ? { ...e, assignedTo } : e))
  }

  // Save the stage AND update equipment status in the Equipment table:
  // selected items → 'Assigned' + record which shoot holds them; items removed
  // from the previous assignment → back to 'Available' (freed).
  const submitEquipment = async () => {
    const prevNames = ((existing?.equipmentList as EquipmentEntry[] | undefined) ?? []).map(e => e.equipment)
    const nowNames = equipmentList.map(e => e.equipment)
    const removedNames = prevNames.filter(n => !nowNames.includes(n))

    const assignOps = equipmentList.map(entry => {
      const rec = equipment.find(e => e.name === entry.equipment)
      if (!rec) return null
      return equipmentApi.update(rec.id, {
        status: 'Assigned',
        currentShootId: shoot?.id,
        currentShootName: shoot?.name,
      } as any).catch((err: unknown) => console.error('Failed to set equipment Assigned:', err))
    })

    const freeOps = removedNames.map(name => {
      const rec = equipment.find(e => e.name === name)
      if (!rec) return null
      return equipmentApi.update(rec.id, {
        status: 'Available',
        currentShootId: '',
        currentShootName: '',
      } as any).catch((err: unknown) => console.error('Failed to free equipment:', err))
    })

    await Promise.all([...assignOps, ...freeOps])
    onSubmit({ equipmentList, notes })
    activityApi.log(`${equipmentList.length} equipment item(s) assigned`).catch(() => {})
    refresh()
  }

  if (existing && !editing) {
    const list = (existing.equipmentList as EquipmentEntry[] | undefined) ?? []
    return (
      <div className="stage-form-view">
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Assigned Equipment</span>
          <div className="crew-chips">
            {list.map(e => {
              const m = members.find(x => x.id === e.assignedTo)
              return (
                <span key={e.equipment} className="crew-chip">
                  {e.equipment}{m ? ` → ${m.name}` : ''}
                </span>
              )
            })}
          </div>
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>
          Select equipment and assign to a crew member
        </span>
        <div className="crew-check-list">
          {equipmentNames.length === 0 && (
            <p style={{ fontSize: 12, color: '#938b87', padding: 8, margin: 0 }}>
              No equipment added yet. Add equipment in the Equipment section first.
            </p>
          )}
          {equipmentNames.map(eq => {
            const entry = equipmentList.find(e => e.equipment === eq)
            return (
              <label key={eq} className="crew-check-item" style={{ alignItems: 'center' }}>
                <input type="checkbox" checked={!!entry} onChange={() => toggle(eq)} />
                <div style={{ flex: 1 }}><strong>{eq}</strong></div>
                {entry && (
                  <select
                    value={entry.assignedTo}
                    onChange={e => { e.stopPropagation(); setAssignee(eq, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #d4cbc6', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">
                      {assignableMembers.length ? 'Assign to...' : 'No crew assigned yet'}
                    </option>
                    {assignableMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
              </label>
            )
          })}
        </div>
      </div>
      <FormField label="Notes">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Equipment notes..." />
      </FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={submitEquipment}>
          <Check size={14}/> Assign Equipment
        </button>
      </div>
    </div>
  )
}

function ShootDayNotesForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  if (existing && !editing) {
    return (
      <div className="stage-form-view">
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <FormField label="Notes"><textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Shoot day notes, instructions, shot lists..." /></FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit({ notes })}><Check size={14}/> Save Notes</button>
      </div>
    </div>
  )
}

function CardsAssignForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members, sdCards, refresh } = useResources()
  type CardEntry = { cardId: string; assignedTo: string }

  const initCards: CardEntry[] = existing?.cardAssignments
    ? (existing.cardAssignments as CardEntry[])
    : (existing?.cardIds as string[] ?? []).map(id => ({ cardId: id, assignedTo: '' }))

  const [cardAssignments, setCardAssignments] = useState<CardEntry[]>(initCards)
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  const toggleCard = (id: string) => {
    setCardAssignments(prev => {
      const exists = prev.find(e => e.cardId === id)
      if (exists) return prev.filter(e => e.cardId !== id)
      return [...prev, { cardId: id, assignedTo: '' }]
    })
  }

  const setAssignee = (cardId: string, assignedTo: string) => {
    setCardAssignments(prev => prev.map(e => e.cardId === cardId ? { ...e, assignedTo } : e))
  }

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
  }

  /**
   * For a member with multiple cards, returns "1st card" / "2nd card" etc.
   * Returns '' when the member has only one card (no label needed).
   * Order follows the order cards were assigned in `list`.
   */
  const cardLabelFor = (list: CardEntry[], entry: CardEntry): string => {
    if (!entry.assignedTo) return ''
    const sameMember = list.filter(e => e.assignedTo === entry.assignedTo)
    if (sameMember.length < 2) return ''
    const idx = sameMember.findIndex(e => e.cardId === entry.cardId)
    return `${ordinal(idx + 1)} card`
  }

  // Save the stage AND flip each selected card's status to 'Assigned' in the
  // SD Cards table so the resource list reflects it. Don't touch Borrowed/Damaged
  // etc. cards that aren't in this assignment.
  const submitCards = async () => {
    const assignedIds = new Set(cardAssignments.map(e => e.cardId))
    await Promise.all(
      [...assignedIds].map(id => {
        const card = sdCards.find(c => c.id === id)
        if (card && card.status !== 'Assigned') {
          return sdCardsApi.update(id, { status: 'Assigned' }).catch((err: unknown) => console.error('Failed to set card Assigned:', err))
        }
        return null
      })
    )
    onSubmit({ cardAssignments, notes })
    activityApi.log(`${assignedIds.size} SD card(s) assigned`).catch(() => {})
    refresh() // re-pull so the SD Cards list shows the new statuses
  }

  if (existing && !editing) {
    const assignments = (existing.cardAssignments as CardEntry[] | undefined) ?? []
    return (
      <div className="stage-form-view">
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Assigned Cards</span>
          <div className="crew-chips">
            {assignments.map(a => {
              const c = sdCards.find(x => x.id === a.cardId)
              const m = members.find(x => x.id === a.assignedTo)
              const label = cardLabelFor(assignments, a)
              return c ? (
                <span key={a.cardId} className="crew-chip">
                  {c.number} → {m ? m.name : 'Unassigned'}
                  {label ? ` (${label})` : ''}
                </span>
              ) : null
            })}
          </div>
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>Select SD Cards</span>
        <div className="crew-check-list">
          {sdCards.length === 0 && (
            <p style={{ fontSize: 12, color: '#938b87', padding: 8, margin: 0 }}>
              No SD cards added yet. Add cards in the SD Cards section first.
            </p>
          )}
          {sdCards.filter(c => !['Damaged', 'Lost', 'Retired'].includes(c.status)).map(c => {
            const entry = cardAssignments.find(e => e.cardId === c.id)
            return (
              <label key={c.id} className="crew-check-item" style={{ alignItems: 'center' }}>
                <input type="checkbox" checked={!!entry} onChange={() => toggleCard(c.id)} />
                <div style={{ flex: 1 }}>
                  <strong>{c.number} — {c.brand}</strong>
                  <small>{c.capacity}</small>
                </div>
                {entry && (() => {
                  const label = cardLabelFor(cardAssignments, entry)
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {label && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', background: '#f0e6e3', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                      )}
                      <select
                        value={entry.assignedTo}
                        onChange={e => { e.stopPropagation(); setAssignee(c.id, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #d4cbc6', background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="">Assign to...</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )
                })()}
              </label>
            )
          })}
        </div>
      </div>
      <FormField label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Card allocation notes..." /></FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={submitCards}><Check size={14}/> Assign Cards</button>
      </div>
    </div>
  )
}

function WrappedForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const initReturned: string[] = (existing?.equipmentReturned as string[]) ?? []
  const [packupTime, setPackupTime] = useState((existing?.packupTime as string) ?? '')
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')
  const [equipmentReturned, setEquipmentReturned] = useState<string[]>(initReturned)

  // Only equipment assigned to THIS shoot (in the Equipment Assign stage).
  type EquipmentEntry = { equipment: string; assignedTo: string }
  const shootEquipment = ((shoot?.stageFormData?.['Equipment Assign']?.equipmentList as EquipmentEntry[] | undefined) ?? [])
    .map(e => e.equipment)

  const toggleReturned = (eq: string) => {
    setEquipmentReturned(prev => prev.includes(eq) ? prev.filter(x => x !== eq) : [...prev, eq])
  }

  const allSelected = shootEquipment.length > 0 && shootEquipment.every(eq => equipmentReturned.includes(eq))
  const toggleAll = () => {
    setEquipmentReturned(allSelected ? [] : [...shootEquipment])
  }

  if (existing && !editing) {
    return (
      <div className="stage-form-view">
        <div className="form-grid">
          <ViewField label="Pack-up Time" value={existing.packupTime as string} />
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
        {((existing.equipmentReturned as string[]) ?? []).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Equipment Returned/Packed</span>
            <div className="crew-chips">
              {((existing.equipmentReturned as string[]) ?? []).map(eq =>
                <span key={eq} className="crew-chip">{eq}</span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      <div className="form-grid">
        <FormField label="Pack-up Time"><input type="time" value={packupTime} onChange={e => setPackupTime(e.target.value)} /></FormField>
      </div>
      <FormField label="Notes"><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Post-shoot notes..." /></FormField>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>Equipment Checklist — Returned / Packed</span>
        <div className="crew-check-list">
          {shootEquipment.length === 0 ? (
            <p style={{ fontSize: 12, color: '#938b87', padding: 8, margin: 0 }}>
              No equipment assigned to this shoot. Assign equipment in the Equipment Assign stage first.
            </p>
          ) : (
            <>
              <label className="crew-check-item" style={{ fontWeight: 600 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                <div><strong>Select All</strong></div>
              </label>
              {shootEquipment.map(eq => (
                <label key={eq} className="crew-check-item">
                  <input type="checkbox" checked={equipmentReturned.includes(eq)} onChange={() => toggleReturned(eq)} />
                  <div><strong>{eq}</strong></div>
                </label>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit({ packupTime, notes, equipmentReturned })}><Check size={14}/> Mark Wrapped</button>
      </div>
    </div>
  )
}

function DataCopyForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members, sdCards, hardDrives } = useResources()
  type CardCopyEntry = { cardId: string; assignedTo: string; status: string }

  // Get assigned cards from Cards Assign stage, falling back to non-Available sdCards
  const cardsAssignData = shoot?.stageFormData?.['Cards Assign']
  const assignedCards: CardCopyEntry[] = (() => {
    if (existing?.cardCopyStatus) return existing.cardCopyStatus as CardCopyEntry[]
    if (cardsAssignData?.cardAssignments) {
      return (cardsAssignData.cardAssignments as { cardId: string; assignedTo: string }[]).map(a => ({
        cardId: a.cardId,
        assignedTo: a.assignedTo,
        status: 'Pending',
      }))
    }
    // fallback: all non-Available sdCards
    return sdCards.filter(c => c.status !== 'Available').map(c => ({
      cardId: c.id,
      assignedTo: '',
      status: 'Pending',
    }))
  })()

  const [cardCopyStatus, setCardCopyStatus] = useState<CardCopyEntry[]>(assignedCards)
  const [driveId, setDriveId] = useState((existing?.driveId as string) ?? '')
  const [folderPath, setFolderPath] = useState((existing?.folderPath as string) ?? '')
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  const setCardStatus = (cardId: string, status: string) => {
    setCardCopyStatus(prev => prev.map(e => e.cardId === cardId ? { ...e, status } : e))
  }

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
  }

  /**
   * "1st card" / "2nd card" when a member has multiple cards in this list,
   * '' when they only have one. Order follows the list order.
   */
  const cardLabelFor = (list: CardCopyEntry[], entry: CardCopyEntry): string => {
    if (!entry.assignedTo) return ''
    const sameMember = list.filter(e => e.assignedTo === entry.assignedTo)
    if (sameMember.length < 2) return ''
    const idx = sameMember.findIndex(e => e.cardId === entry.cardId)
    return `${ordinal(idx + 1)} card`
  }

  if (existing && !editing) {
    const drive = hardDrives.find(h => h.id === existing.driveId)
    const statuses = (existing.cardCopyStatus as CardCopyEntry[]) ?? []
    return (
      <div className="stage-form-view">
        <div className="form-grid">
          <ViewField label="Hard Drive" value={drive ? `${drive.name} — ${drive.brand}` : existing.driveId as string} />
          <ViewField label="Folder Path" value={existing.folderPath as string} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Card Copy Status</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {statuses.map(e => {
              const c = sdCards.find(x => x.id === e.cardId)
              const m = members.find(x => x.id === e.assignedTo)
              const label = cardLabelFor(statuses, e)
              return c ? (
                <div key={e.cardId} className="data-copy-card-row">
                  {m
                    ? <span className="data-copy-member">{m.name}{label ? ` · ${label}` : ''}</span>
                    : <span className="data-copy-member" style={{ color: '#aaa' }}>Unassigned</span>
                  }
                  <span className="data-copy-card">{c.number} <small>{c.capacity}</small></span>
                  <Badge tone={e.status === 'Copied' ? 'success' : 'warning'}>{e.status}</Badge>
                </div>
              ) : null
            })}
          </div>
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      {/* Destination drive + folder path first */}
      <div className="form-grid">
        <FormField label="Destination Drive">
          <select value={driveId} onChange={e => setDriveId(e.target.value)}>
            <option value="">{hardDrives.length ? 'Select drive' : 'No hard drives added yet'}</option>
            {hardDrives.filter(h => !['Damaged', 'Lost', 'Retired'].includes(h.status)).map(h =>
              <option key={h.id} value={h.id}>{h.name} — {h.brand} · {h.capacity - h.used} TB free</option>
            )}
          </select>
        </FormField>
        <FormField label="Folder Path">
          <input value={folderPath} onChange={e => setFolderPath(e.target.value)} placeholder="/2026/Month/Shoot" />
        </FormField>
      </div>

      {/* SD card copy status — below drive/path, member name first */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>SD Card Copy Status</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cardCopyStatus.map(e => {
            const c = sdCards.find(x => x.id === e.cardId)
            const m = members.find(x => x.id === e.assignedTo)
            const label = cardLabelFor(cardCopyStatus, e)
            return c ? (
              <div key={e.cardId} className="data-copy-card-row">
                {m
                  ? <span className="data-copy-member">{m.name}{label ? ` · ${label}` : ''}</span>
                  : <span className="data-copy-member" style={{ color: '#aaa' }}>Unassigned</span>
                }
                <span className="data-copy-card">{c.number} <small>{c.capacity}</small></span>
                <select
                  value={e.status}
                  onChange={ev => setCardStatus(e.cardId, ev.target.value)}
                  style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #d4cbc6', background: '#fff' }}
                >
                  <option>Pending</option>
                  <option>Copied</option>
                </select>
              </div>
            ) : null
          })}
        </div>
      </div>

      <FormField label="Notes">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Transfer notes..." />
      </FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit({ cardCopyStatus, driveId, folderPath, notes })}>
          <Check size={14}/> Mark Copy Completed
        </button>
      </div>
    </div>
  )
}

function SortingStageForm({ existing, editing, onSubmit }: { existing?: Record<string, unknown>; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members, hardDrives } = useResources()
  type FileTypeRow = {
    type: 'JPG' | 'RAW' | 'Videos'
    sourceDriveId: string
    copyToDriveId: string
    done: boolean
  }

  const initRows: FileTypeRow[] = (existing?.fileTypeRows as FileTypeRow[]) ?? [
    { type: 'JPG',    sourceDriveId: '', copyToDriveId: '', done: false },
    { type: 'RAW',    sourceDriveId: '', copyToDriveId: '', done: false },
    { type: 'Videos', sourceDriveId: '', copyToDriveId: '', done: false },
  ]

  const [rows, setRows] = useState<FileTypeRow[]>(initRows)
  const [assignedTo, setAssignedTo] = useState((existing?.assignedTo as string) ?? '')
  const [deadline, setDeadline] = useState((existing?.deadline as string) ?? '')
  const [notes, setNotes] = useState((existing?.notes as string) ?? '')

  const updateRow = (type: string, key: keyof FileTypeRow, value: string | boolean) =>
    setRows(prev => prev.map(r => r.type === type ? { ...r, [key]: value } : r))

  if (existing && !editing) {
    const fileRows = (existing.fileTypeRows as FileTypeRow[]) ?? []
    return (
      <div className="stage-form-view">
        {/* <div className="form-grid">
          <ViewField label="Assigned To" value={existing.assignedTo as string} />
          <ViewField label="Deadline" value={existing.deadline as string} />
        </div> */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>File Type Sorting</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fileRows.map(r => {
              const src = hardDrives.find(h => h.id === r.sourceDriveId)
              const dst = hardDrives.find(h => h.id === r.copyToDriveId)
              return (
                <div key={r.type} className="sorting-type-row">
                  <span className="sorting-type-label">{r.type}</span>
                  <span style={{ fontSize: 11, color: '#625b58' }}>{src?.name ?? '—'}</span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>→</span>
                  <span style={{ fontSize: 11, color: '#625b58' }}>{dst?.name ?? '—'}</span>
                  <span className={`sorting-done-badge ${r.done ? 'done' : ''}`}>
                    {r.done ? '✓ Done' : 'Pending'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      {/* Assign + deadline */}
      {/* <div className="form-grid">
        <FormField label="Assign To">
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Select member</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
          </select>
        </FormField>
        <FormField label="Deadline">
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </FormField>
      </div> */}

      {/* File type rows */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>
          File Type · From Drive · To Drive · Done
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map(r => (
            <div key={r.type} className="sorting-type-row">
              {/* Label */}
              <span className="sorting-type-label">{r.type}</span>

              {/* From drive */}
              <select
                value={r.sourceDriveId}
                onChange={e => updateRow(r.type, 'sourceDriveId', e.target.value)}
                className="sorting-drive-select"
              >
                <option value="">From drive</option>
                {hardDrives.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>

              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>→</span>

              {/* To drive */}
              <select
                value={r.copyToDriveId}
                onChange={e => updateRow(r.type, 'copyToDriveId', e.target.value)}
                className="sorting-drive-select"
              >
                <option value="">To drive</option>
                {hardDrives.map(h =>
                  <option key={h.id} value={h.id}>{h.name}</option>
                )}
              </select>

              {/* Done checkbox */}
              <label className="sorting-done-check">
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={e => updateRow(r.type, 'done', e.target.checked)}
                />
                <span>Done</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <FormField label="Notes">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sorting instructions..." />
      </FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit({ assignedTo, deadline, fileTypeRows: rows, notes })}>
          <Check size={14}/> Create Sorting Task
        </button>
      </div>
    </div>
  )
}

function EditingStageForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members } = useResources()
  // `taskId` links this editing task to a row in the global Tasks table, so we
  // don't create a duplicate on re-save.
  type EditTask = { id: string; assignedTo: string; editType: string; notes: string; taskId?: string }

  const initTasks: EditTask[] = (existing?.editingTasks as EditTask[]) ?? []

  const [tasks, setTasks] = useState<EditTask[]>(initTasks)
  const [newTask, setNewTask] = useState<Omit<EditTask, 'id'>>({ assignedTo: '', editType: '', notes: '' })
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)
  // Which existing task is being edited inline, and its working draft.
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<EditTask, 'id'>>({ assignedTo: '', editType: '', notes: '' })

  const EDIT_TYPES = ['Cinematic Highlight','Cinematic Film','Reel Vertical','Reel Horizontal','Traditional Video','Cinematic Teaser','Social Media Content','Commercial / Brand Film Editing','Motion Graphics Edit','Podcast Editing','Other / Custom Requirement','Photo Selection','Photo Editing','Album Designer','Other']

  const addTask = () => {
    if (!newTask.assignedTo || !newTask.editType) {
      setAddError('Select a member and an edit type before adding.')
      return
    }
    setAddError('')
    setTasks(prev => [...prev, { id: `et-${Date.now()}`, ...newTask }])
    setNewTask({ assignedTo: '', editType: '', notes: '' })
  }

  // Delete a task. If it was pushed to the global Tasks table, remove it there too.
  const removeTask = (t: EditTask) => {
    setTasks(prev => prev.filter(x => x.id !== t.id))
    if (editingTaskId === t.id) setEditingTaskId(null)
    if (t.taskId) tasksApi.remove(t.taskId).catch(err => console.error('Failed to delete linked task:', err))
  }

  const startEdit = (t: EditTask) => {
    setEditingTaskId(t.id)
    setDraft({ assignedTo: t.assignedTo, editType: t.editType, notes: t.notes })
  }

  const cancelEdit = () => setEditingTaskId(null)

  const saveEdit = (id: string) => {
    if (!draft.assignedTo || !draft.editType) return
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...draft } : t))
    setEditingTaskId(null)
  }

  // Save the stage AND push each new editing task into the global Tasks list so
  // it shows up on the Tasks page. Tasks already pushed (have a taskId) are skipped.
  const saveTasks = async () => {
    setSaving(true)
    try {
      const withTaskIds = await Promise.all(
        tasks.map(async t => {
          const payload = {
            title: `${t.editType}${shoot ? ` — ${shoot.name}` : ''}`,
            description: t.notes,
            assignedTo: t.assignedTo,
          }
          if (t.taskId) {
            // Already in the Tasks table — push any edits to it.
            try {
              await tasksApi.update(t.taskId, payload)
            } catch (err) {
              console.error('Failed to update linked task:', err)
            }
            return t
          }
          try {
            const created = await tasksApi.create({ ...payload, type: 'Editing', priority: 'Normal', status: 'Pending' })
            return { ...t, taskId: created.id }
          } catch (err) {
            console.error('Failed to create task for editing entry:', err)
            return t // keep the editing task even if the global task creation fails
          }
        })
      )
      setTasks(withTaskIds)
      onSubmit({ editingTasks: withTaskIds })
    } finally {
      setSaving(false)
    }
  }

  if (existing && !editing && (existing.editingTasks as EditTask[] | undefined)?.length) {
    const taskList = existing.editingTasks as EditTask[]
    return (
      <div className="stage-form-view">
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Editing Tasks</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {taskList.map(t => (
            <div key={t.id} style={{ background: '#f9f6f4', borderRadius: 6, padding: '8px 12px', border: '1px solid #e8e0db' }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{t.assignedTo}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{t.editType}</div>
              {t.notes && <div style={{ fontSize: 11, marginTop: 2 }}>{t.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      {/* Existing tasks list */}
      {tasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Editing Tasks</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map(t => (
              editingTaskId === t.id ? (
                /* Inline edit mode for this task */
                <div key={t.id} style={{ background: '#fff', borderRadius: 6, padding: 10, border: '1px solid #d4cbc6' }}>
                  <div className="form-grid">
                    <FormField label="Assign To">
                      <select value={draft.assignedTo} onChange={e => setDraft(d => ({ ...d, assignedTo: e.target.value }))}>
                        <option value="">Select member</option>
                        {members.map(m => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Edit Type">
                      <select value={draft.editType} onChange={e => setDraft(d => ({ ...d, editType: e.target.value }))}>
                        <option value="">Select type</option>
                        {EDIT_TYPES.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <FormField label="Notes">
                    <textarea rows={2} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Task notes..." />
                  </FormField>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(t.id)}><Check size={13} /> Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}><X size={13} /> Cancel</button>
                  </div>
                </div>
              ) : (
                /* Read row with Edit + Delete */
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9f6f4', borderRadius: 6, padding: '6px 10px', border: '1px solid #e8e0db' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 12 }}>{t.assignedTo}</strong>
                    <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{t.editType}</span>
                    {t.notes && <div style={{ fontSize: 11, color: '#666' }}>{t.notes}</div>}
                  </div>
                  <button type="button" className="icon-btn" onClick={() => startEdit(t)} title="Edit task" style={{ color: '#625b58' }}>
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => removeTask(t)} title="Delete task" style={{ color: '#c0392b' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Add new task */}
      <div style={{ background: '#f9f6f4', borderRadius: 8, padding: 12, border: '1px solid #e8e0db', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 8 }}>Add Editing Task</span>
        <div className="form-grid">
          <FormField label="Assign To">
            <select value={newTask.assignedTo} onChange={e => setNewTask(f => ({ ...f, assignedTo: e.target.value }))}>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
            </select>
          </FormField>
          <FormField label="Edit Type">
            <select value={newTask.editType} onChange={e => setNewTask(f => ({ ...f, editType: e.target.value }))}>
              <option value="">Select type</option>
              {['Cinematic Highlight','Cinematic Film','Reel Vertical','Reel Horizontal','Traditional Video','Cinematic Teaser','Social Media Content','Commercial / Brand Film Editing','Motion Graphics Edit','Podcast Editing','Other / Custom Requirement','Photo Selection','Photo Editing','Album Designer','Other'].map(x => <option key={x}>{x}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Notes">
          <textarea rows={2} value={newTask.notes} onChange={e => setNewTask(f => ({ ...f, notes: e.target.value }))} placeholder="Task notes..." />
        </FormField>
        {addError && <p style={{ color: 'crimson', fontSize: 11, margin: '2px 0 6px' }}>{addError}</p>}
        <button type="button" className="btn btn-secondary" onClick={addTask} style={{ marginTop: 4 }}>
          <Plus size={13} /> Add Editing Task
        </button>
      </div>

      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={saveTasks} disabled={saving}><Check size={14}/> {saving ? 'Saving...' : 'Save Editing Tasks'}</button>
      </div>
    </div>
  )
}

function DeliveredStageForm({ existing, shoot, editing, onSubmit }: { existing?: Record<string, unknown>; shoot?: Shoot; editing?: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const { members } = useResources()
  type EditTask = { id: string; assignedTo: string; editType: string; notes: string }
  const editingTasks: EditTask[] = (shoot?.stageFormData?.['Editing']?.editingTasks as EditTask[]) ?? []

  const [form, setForm] = useState({
    deliveryType: (existing?.deliveryType as string) ?? '',
    deliveryLink: (existing?.deliveryLink as string) ?? '',
    deliveredBy: (existing?.deliveredBy as string) ?? '',
    notes: (existing?.notes as string) ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (existing && !editing) {
    return (
      <div className="stage-form-view">
        {editingTasks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Editing Tasks</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {editingTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <strong>{t.assignedTo}</strong>
                  <span style={{ color: '#888' }}>{t.editType}</span>
                  <Badge tone="success">Completed</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="form-grid">
          <ViewField label="Delivery Type" value={existing.deliveryType as string} />
          <ViewField label="Delivered By" value={existing.deliveredBy as string} />
          <ViewField label="Delivery Link" value={existing.deliveryLink as string} />
        </div>
        <ViewField label="Notes" value={existing.notes as string} />
      </div>
    )
  }

  return (
    <div className="stage-form-input">
      {/* Read-only editing tasks */}
      {editingTasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#625b58', display: 'block', marginBottom: 6 }}>Editing Tasks (from Editing stage)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {editingTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9f6f4', borderRadius: 6, padding: '6px 10px', border: '1px solid #e8e0db', fontSize: 12 }}>
                <strong>{t.assignedTo}</strong>
                <span style={{ color: '#888' }}>{t.editType}</span>
                <Badge tone="success">Completed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="form-grid">
        <FormField label="Delivery Type">
          <select value={form.deliveryType} onChange={set('deliveryType')}>
            <option value="">Select type</option>
            {['Google Drive','WeTransfer','Dropbox','USB Drive','Hard Drive Hand-off','Other'].map(x=><option key={x}>{x}</option>)}
          </select>
        </FormField>
        <FormField label="Delivered By">
          <select value={form.deliveredBy} onChange={set('deliveredBy')}>
            <option value="">Select member</option>
            {members.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </FormField>
        <FormField label="Delivery Link"><input value={form.deliveryLink} onChange={set('deliveryLink')} placeholder="https://..." /></FormField>
      </div>
      <FormField label="Notes"><textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Delivery notes..." /></FormField>
      <div className="modal-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSubmit(form)}><Check size={14}/> Mark Delivered</button>
      </div>
    </div>
  )
}

// Map each stage to its form component
function StageForm({ stage, existing, shoot, editing = false, onSubmit }: {
  stage: WorkflowStage
  existing?: Record<string, unknown>
  shoot?: Shoot
  editing?: boolean
  onSubmit: (d: Record<string, unknown>) => void
}) {
  switch (stage) {
    case 'Inquiry':         return <InquiryForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Confirm':         return <ConfirmForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Schedule':        return <ScheduleForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Crew Assign':     return <CrewAssignForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    case 'Equipment Assign': return <EquipmentAssignForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    case 'Shoot Day Notes': return <ShootDayNotesForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Cards Assign':    return <CardsAssignForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Wrapped':         return <WrappedForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    case 'Data Copy':       return <DataCopyForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    case 'Sorting':         return <SortingStageForm existing={existing} editing={editing} onSubmit={onSubmit} />
    case 'Editing':         return <EditingStageForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    case 'Delivered':       return <DeliveredStageForm existing={existing} shoot={shoot} editing={editing} onSubmit={onSubmit} />
    default:                return null
  }
}

// ─── Workflow Timeline ────────────────────────────────────────────────────────

export function WorkflowTimeline({ shoot, onStage, onStageFormSubmit, readOnly = false }: {
  shoot: Shoot
  onStage: (stage: WorkflowStage) => void
  onStageFormSubmit?: (stage: WorkflowStage, data: Record<string, unknown>) => void
  readOnly?: boolean
}) {
  const [selected, setSelected] = useState<WorkflowStage | null>(null)
  // Which submitted stage is currently being edited (prefilled, editable form).
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null)

  const handleClick = (stage: WorkflowStage) => {
    const item = shoot.workflow[stage]
    // Locked stages can't be opened
    if (item.status === 'locked') return
    setSelected(prev => prev === stage ? null : stage)
    setEditingStage(null) // leave edit mode when switching stages
    onStage(stage)
  }

  const handleSubmit = (stage: WorkflowStage, data: Record<string, unknown>) => {
    // Was this an edit of an already-submitted stage, or a fresh submission?
    const wasEdit = editingStage === stage || !!shoot.stageFormData?.[stage]
    onStageFormSubmit?.(stage, data)
    setEditingStage(null)

    if (wasEdit) {
      // Editing: stay on this stage and show the updated details.
      return
    }

    // Fresh submission: jump straight to the next stage's form so the user can
    // keep going without clicking. Stop at the last stage.
    const idx = workflowStages.indexOf(stage)
    const next = workflowStages[idx + 1]
    if (next) {
      setSelected(next)
      onStage(next)
    }
  }

  // Determine which stages are "highlighted" = completed or current
  const currentIndex = workflowStages.indexOf(shoot.currentStage)

  return (
    <section className="card workflow-card">
      <div className="card-title">
        <div><h3>Workflow Timeline</h3><p>Track every stage of this production</p></div>
      </div>
      <div className="workflow-scroll">
        <div className="workflow">
          {workflowStages.map((stage, i) => {
            const item = shoot.workflow[stage]
            const done = item.status === 'completed'
            const current = item.status === 'current'
            const highlighted = i <= currentIndex // all steps up to and including current
            const locked = item.status === 'locked'

            return (
              <button
                className={cx(
                  'workflow-step',
                  done && 'done',
                  current && 'current',
                  highlighted && !locked && 'highlighted',
                  selected === stage && 'selected',
                  locked && 'locked-step',
                )}
                key={stage}
                onClick={() => handleClick(stage)}
                title={locked ? 'Complete previous stage first' : undefined}
              >
                <span className="workflow-line-left">{i > 0 && <i />}</span>
                <span className="workflow-circle">
                  {done ? <Check size={14} /> : current ? <span className="current-dot" /> : locked ? <Lock size={12} /> : i + 1}
                </span>
                <span className="workflow-label">{stage}</span>
                <span className="workflow-line-right">{i < workflowStages.length - 1 && <i />}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selected && shoot.workflow[selected].status !== 'locked' && (() => {
        const hasData = !!shoot.stageFormData?.[selected]
        const isEditing = editingStage === selected
        return (
        <div className="stage-form-panel">
          <div className="stage-form-header">
            <div>
              <span className="eyebrow">{selected}</span>
              <h4>
                {isEditing
                  ? 'Edit stage details'
                  : hasData
                  ? 'Stage details (submitted)'
                  : shoot.workflow[selected].status === 'completed'
                  ? 'Stage completed — view details'
                  : 'Fill in stage details'
                }
              </h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasData && !isEditing && (
                <span className="submitted-badge"><Check size={11}/> Submitted</span>
              )}
              {/* Allow editing a submitted stage (unless read-only). */}
              {hasData && !readOnly && onStageFormSubmit && (
                isEditing ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingStage(null)}>
                    <X size={13}/> Cancel
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingStage(selected)}>
                    <Pencil size={13}/> Edit
                  </button>
                )
              )}
            </div>
          </div>
          {readOnly && !hasData ? (
            <p style={{ fontSize: 12, color: '#938b87', margin: 0 }}>
              You have read-only access. An admin needs to add you to a team before you can edit stages.
            </p>
          ) : (
            <StageForm
              // Remount the form whenever the stage, edit-mode, or saved data
              // changes so each field's local state is re-seeded from `existing`.
              // Without this React reuses the instance and shows stale values.
              key={`${selected}-${isEditing ? 'edit' : 'view'}-${shoot.updatedAt ?? ''}-${dataVersion(shoot.stageFormData?.[selected])}`}
              stage={selected}
              existing={shoot.stageFormData?.[selected]}
              shoot={shoot}
              editing={isEditing}
              onSubmit={(data) => handleSubmit(selected, data)}
            />
          )}
        </div>
        )
      })()}
    </section>
  )
}

export function Modal({ open, title, onClose, children, width = 520 }: { open: boolean; title: string; onClose: () => void; children: ReactNode; width?: number }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{maxWidth: width}}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
}

export function SearchFilter({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v:string)=>void; placeholder?: string }) {
  return <div className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><Archive size={28}/><strong>{title}</strong><span>{text}</span></div>
}

export function ActivityTimeline({ limit }: { limit?: number }) {
  return null
}

export function StageDetails({ shoot, stage, onComplete, onNotes }: {
  shoot: Shoot; stage: WorkflowStage; onComplete: () => void; onNotes: (notes:string)=>void
}) {
  const data = shoot.workflow[stage]
  const [notes, setNotes] = useState(data.notes ?? '')
  const locked = data.status === 'locked'
  const complete = data.status === 'completed'
  return (
    <section className="card stage-card">
      <div className="stage-head">
        <div><div className="eyebrow">{stage}</div><h2>{complete ? 'Stage completed' : locked ? 'Stage locked' : 'Current stage'}</h2>
          {complete && <p>Completed {data.completedAt} by {data.completedBy}</p>}</div>
        <div className="stage-actions">
          {!locked && !complete && <button className="btn btn-primary" onClick={onComplete}><Check size={15}/> Complete Stage</button>}
          {complete && <button className="btn btn-secondary"><X size={15}/> Mark Incomplete</button>}
        </div>
      </div>
      {locked ? <div className="locked-box"><Lock size={17}/><div><strong>This stage is locked</strong><span>Complete the previous workflow stage first.</span></div></div> :
        <div className="stage-content">
          <div className="field"><span>Step Notes</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add notes for this step..."/></div>
          <button className="btn btn-secondary" onClick={()=>onNotes(notes)}><Save size={15}/> Save Notes</button>
        </div>}
    </section>
  )
}

export function ShootSummary({ shoot }: { shoot: Shoot }) {
  return <div className="summary-grid">
    <div className="summary-item"><Clock3/><div><span>Date & time</span><strong>{shoot.date}</strong><small>{shoot.time}</small></div></div>
    <div className="summary-item"><MapPin/><div><span>Venue</span><strong>{shoot.venue}</strong><small>{shoot.city}</small></div></div>
    <div className="summary-item"><UserRound/><div><span>Client</span><strong>{shoot.client}</strong><small>{shoot.type}</small></div></div>
    <div className="summary-item"><FileText/><div><span>Priority</span><strong>{shoot.priority}</strong><small>{shoot.number}</small></div></div>
  </div>
}

export function MiniStat({ label, value, icon: Icon, detail }: { label:string; value:string|number; icon:any; detail?:string }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>
}

export function SectionTitle({ title, action }: { title:string; action?:ReactNode }) {
  return <div className="section-title"><h3>{title}</h3>{action}</div>
}
