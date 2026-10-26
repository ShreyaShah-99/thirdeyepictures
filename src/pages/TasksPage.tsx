import { CheckCircle2, Circle, ClipboardList, Clock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { activityApi, tasksApi, type Task } from '../api'
import { useAuth, useCanWrite } from '../auth'
import { AppLayout, Badge, FormField, Modal, PageHeader, Pagination, SearchFilter, usePagination } from '../components'
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
      activityApi.log(`Task created: ${created.title}`).catch(() => {})
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

// ─── Edit Task Modal ──────────────────────────────────────────────────────────
function EditTaskModal({ task, onClose, onSave }: {
  task: Task | null; onClose: () => void; onSave: (id: string, patch: Partial<Task>) => Promise<void>
}) {
  const { members } = useResources()
  const [form, setForm] = useState<Partial<Task>>({})
  const [saving, setSaving] = useState(false)

  // Re-seed the form whenever a new task is opened for editing.
  useEffect(() => {
    if (task) setForm({ ...task })
  }, [task])

  const set = (k: keyof Task) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!task || !form.title) return
    setSaving(true)
    try {
      await onSave(task.id, {
        title: form.title,
        description: form.description,
        assignedTo: form.assignedTo,
        priority: form.priority,
        dueDate: form.dueDate,
        type: form.type,
      })
      onClose()
    } catch (err: any) {
      alert(`Failed to update task: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!task} title="Edit Task" onClose={onClose}>
      <div className="form-grid">
        <FormField label="Title">
          <input value={form.title ?? ''} onChange={set('title')} placeholder="Task title" />
        </FormField>
        <FormField label="Type">
          <select value={form.type ?? 'General'} onChange={set('type')}>
            {(['Sorting','Editing','Data Copy','Delivery','General'] as TaskType[]).map(t => <option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Assign To">
          <select value={form.assignedTo ?? ''} onChange={set('assignedTo')}>
            <option value="">Select member</option>
            {members.map(m => <option key={m.id} value={m.name}>{m.name} — {m.role}</option>)}
          </select>
        </FormField>
        <FormField label="Priority">
          <select value={form.priority ?? 'Normal'} onChange={set('priority')}>
            {(['Low','Normal','High','Urgent'] as TaskPriority[]).map(p => <option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Due Date">
          <input type="date" value={form.dueDate ?? ''} onChange={set('dueDate')} />
        </FormField>
      </div>
      <FormField label="Description">
        <textarea rows={3} value={form.description ?? ''} onChange={set('description')} placeholder="What needs to be done?" />
      </FormField>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !form.title}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
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
  const [editTarget, setEditTarget] = useState<Task | null>(null)
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
      (t.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedTo ?? '').toLowerCase().includes(search.toLowerCase())
    return matchMember && matchStatus && matchSearch
  })

  // Summary stat cards (match the inventory pages).
  const countStatus = (s: TaskStatus) => tasks.filter(t => t.status === s).length
  const taskStats = [
    { label: 'Pending',     icon: Circle,      tone: '#8b8380', bg: '#f1ece9', value: countStatus('Pending') },
    { label: 'In Progress', icon: Clock,       tone: '#d98324', bg: '#fbefe0', value: countStatus('In Progress') },
    { label: 'Completed',   icon: CheckCircle2,tone: '#2e9e5b', bg: '#e8f6ee', value: countStatus('Completed') },
    { label: 'Total',       icon: ClipboardList,tone: '#2f6fb0', bg: '#e8f0fa', value: tasks.length },
  ]

  const cycleStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = STATUS_CYCLE[task.status]
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    try {
      await tasksApi.update(id, { status: newStatus })
      activityApi.log(`Task "${task.title}" marked ${newStatus}`).catch(() => {})
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

  const saveEdit = async (id: string, patch: Partial<Task>) => {
    const updated = await tasksApi.update(id, patch)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    activityApi.log(`Task updated: ${updated.title ?? patch.title ?? ''}`).catch(() => {})
  }

  const clearFilters = () => { setMemberFilter(''); setStatusFilter(''); setSearch('') }
  const hasFilters = memberFilter || statusFilter || search

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10)

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
          style={{ height: 44, fontSize: 12, borderRadius: 10 }}
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
          style={{ height: 44, fontSize: 12, borderRadius: 10 }}
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

      {/* ── Summary stat cards ── */}
      <div className="inv-stats">
        {taskStats.map(s => (
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

      <section className="card">
        {/* ── Loading ── */}
        {loading && (
          <p style={{ textAlign: 'center', padding: '48px 0', color: '#938b87', fontSize: 13 }}>Loading tasks...</p>
        )}

        {!loading && (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Status</th>
                  {canWrite && <th className="inv-action-col">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pageItems.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div className="inv-name">{task.title}</div>
                      {task.description && <div className="inv-serial">{task.description}</div>}
                    </td>
                    <td>{task.type}</td>
                    <td>{task.assignedTo || '—'}</td>
                    <td><Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge></td>
                    <td>{task.dueDate || '—'}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '3px 10px' }}
                          title={`Mark ${STATUS_CYCLE[task.status]}`}
                          onClick={() => cycleStatus(task.id)}
                        >
                          <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
                        </button>
                      ) : (
                        <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
                      )}
                    </td>
                    {canWrite && (
                      <td className="inv-action-col">
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button type="button" className="icon-btn" title="Edit task" onClick={() => setEditTarget(task)}>
                            <Pencil size={14} />
                          </button>
                          {isSuperAdmin && (
                            <button type="button" className="icon-btn delete-btn" title="Delete task" onClick={() => deleteTask(task.id)}>
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
                    <td colSpan={canWrite ? 7 : 6} style={{ padding: '40px 0', textAlign: 'center', color: '#938b87' }}>
                      <ClipboardList size={28} style={{ opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{hasFilters ? 'No tasks match the filters' : 'No tasks yet'}</div>
                      <div style={{ fontSize: 12, marginTop: 2 }}>{hasFilters ? 'Try changing the filters above.' : 'Create a task to get started.'}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </div>
        )}
      </section>

      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onAdd={t => setTasks(prev => [t, ...prev])}
      />

      <EditTaskModal
        task={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={saveEdit}
      />
    </AppLayout>
  )
}
