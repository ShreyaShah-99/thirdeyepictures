import { ClipboardList, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { tasksApi, type Task } from '../api'
import { useAuth, useCanWrite } from '../auth'
import { AppLayout, Badge, FormField, Modal, PageHeader, SearchFilter } from '../components'
import { useResources } from '../resources'

type TaskStatus = 'Pending' | 'In Progress' | 'Completed'
type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent'
type TaskType = 'Sorting' | 'Editing' | 'Data Copy' | 'Delivery' | 'General'

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  Low: 'neutral', Normal: 'info', High: 'warning', Urgent: 'danger',
}

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  Pending: 'neutral', 'In Progress': 'warning', Completed: 'success',
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  Pending: 'In Progress', 'In Progress': 'Completed', Completed: 'Pending',
}

// ─── Create Task Modal ────────────────────────────────────────────────────────
function CreateTaskModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (t: Task) => void
}) {
  const { members } = useResources()
  const blank = { title: '', description: '', assignedTo: '', priority: 'Normal' as TaskPriority, dueDate: '', type: 'General' as TaskType }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.title) return
    setSaving(true)
    try {
      const created = await tasksApi.create({ ...form, status: 'Pending' })
      onAdd(created)
      setForm(blank)
      onClose()
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Create Task" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Title">
          <input value={form.title} onChange={set('title')} placeholder="Task title" />
        </FormField>
        <FormField label="Type">
          <select value={form.type} onChange={set('type')}>
            {(['Sorting','Editing','Data Copy','Delivery','General'] as TaskType[]).map(t => <option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Assign To">
          <select value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">Select member</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
          </select>
        </FormField>
        <FormField label="Priority">
          <select value={form.priority} onChange={set('priority')}>
            {(['Low','Normal','High','Urgent'] as TaskPriority[]).map(p => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Due Date">
          <input type="date" value={form.dueDate} onChange={set('dueDate')} />
        </FormField>
      </div>
      <FormField label="Description">
        <textarea rows={3} value={form.description} onChange={set('description')} placeholder="What needs to be done?" />
      </FormField>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}><Plus size={14} /> {saving ? 'Creating...' : 'Create Task'}</button>
      </div>
    </Modal>
  )
}

// ─── Tasks Page ───────────────────────────────────────────────────────────────
export function TasksPage() {
  const { user } = useAuth()
  const { members } = useResources()
  const isSuperAdmin = user?.role === 'admin'
  const canWrite = useCanWrite()

  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [memberFilter, setMemberFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]         = useState('')

  useEffect(() => {
    tasksApi.list()
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

  const allMemberNames = Array.from(new Set(members.map(m => m.name)))

  const filtered = tasks.filter(t => {
    const matchMember = !memberFilter || t.assignedTo === memberFilter
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase())
    return matchMember && matchStatus && matchSearch
  })

  const cycleStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = STATUS_CYCLE[task.status]
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    try {
      await tasksApi.update(id, { status: newStatus })
    } catch (err: any) {
      // revert on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t))
    }
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await tasksApi.remove(id)
    } catch {}
  }

  const clearFilters = () => { setMemberFilter(''); setStatusFilter(''); setSearch('') }
  const hasFilters = memberFilter || statusFilter || search

  return (
    <AppLayout>
      <PageHeader
        title="Tasks"
        subtitle="Manage and track all production tasks"
        action={
          canWrite ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create Task
            </button>
          ) : null
        }
      />

      {/* ── Filter bar ── */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <SearchFilter value={search} onChange={setSearch} placeholder="Search tasks..." />

        {/* Crew member dropdown filter */}
        <select
          className="select"
          value={memberFilter}
          onChange={e => setMemberFilter(e.target.value)}
          style={{ height: 35, fontSize: 11 }}
        >
          <option value="">All Members</option>
          {allMemberNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 35, fontSize: 11 }}
        >
          <option value="">All Status</option>
          {(['Pending','In Progress','Completed'] as TaskStatus[]).map(s =>
            <option key={s}>{s}</option>
          )}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Task count ── */}
      {hasFilters && (
        <p style={{ fontSize: 11, color: '#938b87', marginBottom: 12 }}>
          Showing {filtered.length} of {tasks.length} tasks
        </p>
      )}

      {/* ── Loading ── */}
      {loading && (
        <p style={{ textAlign: 'center', padding: '48px 0', color: '#938b87', fontSize: 13 }}>Loading tasks...</p>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#938b87' }}>
          <ClipboardList size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {hasFilters ? 'No tasks match the filters' : 'No tasks yet'}
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {hasFilters ? 'Try changing the filters above.' : 'Create a task to get started.'}
          </div>
        </div>
      )}

      {/* ── Task cards ── */}
      <div className="resource-grid" style={{ marginTop: 4 }}>
        {filtered.map(task => (
          <div key={task.id} className="resource-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              <Badge tone="info">{task.type}</Badge>
              <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
              <div style={{ flex: 1 }} />
              {isSuperAdmin && (
                <button type="button" className="icon-btn delete-btn" title="Delete task" onClick={() => deleteTask(task.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Title */}
            <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>

            {/* Description */}
            {task.description && (
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{task.description}</div>
            )}

            {/* Meta */}
            <div style={{ fontSize: 11, color: '#625b58', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {task.assignedTo && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: memberFilter === task.assignedTo ? 'var(--primary)' : '#625b58', fontWeight: memberFilter === task.assignedTo ? 700 : 400, fontSize: 11 }}
                  onClick={() => setMemberFilter(prev => prev === task.assignedTo ? '' : task.assignedTo)}
                  title={`Filter by ${task.assignedTo}`}
                >
                  👤 {task.assignedTo}
                </button>
              )}
              {task.dueDate && <span>📅 {task.dueDate}</span>}
            </div>

            {/* Status toggle (writers only; viewers just see the badge) */}
            {canWrite ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: '3px 10px', marginTop: 2 }}
                onClick={() => cycleStatus(task.id)}
              >
                <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
                <span style={{ marginLeft: 6, color: '#625b58' }}>→ {STATUS_CYCLE[task.status]}</span>
              </button>
            ) : (
              <div style={{ marginTop: 2 }}>
                <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onAdd={t => setTasks(prev => [t, ...prev])}
      />
    </AppLayout>
  )
}
