import { ArrowLeft, CalendarDays, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { shootsApi } from '../api'
import { useAuth, useCanWrite } from '../auth'
import { AppLayout, Badge, Modal, WorkflowTimeline, statusTone } from '../components'
import { workflowStages } from '../data'
import { PageLoader } from '../Spinner'
import type { Shoot, WorkflowStage } from '../types'

export function ShootDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'admin'
  const canWrite = useCanWrite()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shoot, setShoot] = useState<Shoot | null>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<WorkflowStage>('Inquiry')

  useEffect(() => {
    if (!id) return
    shootsApi.get(id)
      .then(s => {
        setShoot(s)
        setStage(s.currentStage)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <AppLayout><PageLoader message="Loading shoot..." /></AppLayout>
  if (!shoot) return <AppLayout><p style={{ padding: 32, color: 'red' }}>Shoot not found.</p></AppLayout>

  const selectStage = (s: WorkflowStage) => setStage(s)

  // Derive the shoot's resource id arrays from a stage's submitted data, so the
  // shoot list / counts stay in sync with what was assigned in each stage.
  const resourceIdsFromStage = (s: WorkflowStage, data: Record<string, unknown>): Partial<Shoot> => {
    if (s === 'Crew Assign') {
      const crewIds = ((data.crewAssignments as { crewId: string }[] | undefined) ?? []).map(c => c.crewId)
      return { crewIds }
    }
    if (s === 'Cards Assign') {
      const sdCardIds = ((data.cardAssignments as { cardId: string }[] | undefined) ?? []).map(c => c.cardId)
      return { sdCardIds }
    }
    return {}
  }

  // Mirror a stage's submitted data onto the shoot's TOP-LEVEL fields so the
  // details header and later stages reflect what was entered.
  // - Inquiry sets the initial name/client/type/date/time.
  // - Schedule (being more specific) overrides date/time/venue/city.
  // Only non-empty values overwrite, so later stages don't wipe earlier data.
  const topLevelFromStage = (s: WorkflowStage, data: Record<string, unknown>): Partial<Shoot> => {
    const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
    const out: Partial<Shoot> = {}
    if (s === 'Inquiry') {
      const set = (k: keyof Shoot, v?: string) => { if (v !== undefined) (out as any)[k] = v }
      set('name', pick(data.eventName))
      set('client', pick(data.clientName))
      set('type', pick(data.eventType))
      set('date', pick(data.eventDate))
      set('time', pick(data.eventTime))
    }
    if (s === 'Schedule') {
      const set = (k: keyof Shoot, v?: string) => { if (v !== undefined) (out as any)[k] = v }
      set('date', pick(data.shootDate))
      set('time', pick(data.startTime))
      set('venue', pick(data.venue))
      set('city', pick(data.city))
    }
    return out
  }

  const handleStageFormSubmit = async (s: WorkflowStage, data: Record<string, unknown>) => {
    // Can't submit a locked stage.
    if (shoot.workflow[s].status === 'locked') return

    // If this stage was already submitted, we're editing it: just overwrite the
    // saved form data and keep the workflow position/progress untouched.
    const isEdit = !!shoot.stageFormData?.[s]
    if (isEdit) {
      const updated: Partial<Shoot> = {
        stageFormData: { ...shoot.stageFormData, [s]: data },
        ...resourceIdsFromStage(s, data),
        ...topLevelFromStage(s, data),
      }
      try {
        const saved = await shootsApi.update(shoot.id, updated)
        setShoot(saved)
      } catch (err: any) {
        console.error('Failed to update stage form:', err.message)
      }
      return
    }

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
      ...resourceIdsFromStage(s, data),
      ...topLevelFromStage(s, data),
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
