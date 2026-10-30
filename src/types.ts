export type WorkflowStage =
  | 'Inquiry'
  | 'Confirm'
  | 'Schedule'
  | 'Crew Assign'
  | 'Equipment Assign'
  | 'Shoot Day Notes'
  | 'Cards Assign'
  | 'Wrapped'
  | 'Data Copy'
  | 'Sorting'
  | 'Editing'
  | 'Delivered'

export type WorkflowStatus = 'completed' | 'current' | 'pending' | 'locked'

export type ShootStatus = 'Inquiry' | 'Scheduled' | 'In Progress' | 'Wrapped' | 'Editing' | 'Delivered'
export type Priority = 'Low' | 'Normal' | 'High' | 'Urgent'

export interface CrewMember {
  id: string
  name: string
  role: string
  phone: string
  email: string
  availability: 'Available' | 'Assigned' | 'On Leave'
  shoots: number
}

export interface SDCard {
  id: string
  number: string
  brand: string
  capacity: string
  serial: string
  status: 'Available' | 'Assigned' | 'In Use' | 'Data Copy Pending' | 'Data Copied' | 'Borrowed' | 'Damaged' | 'Lost' | 'Retired'
  currentShootId?: string
  history: { shootId: string; shootName: string; date: string; member: string }[]
  /** Borrow tracking — set while status is 'Borrowed', cleared on return. */
  borrowedBy?: string
  pickupDate?: string
  returnDate?: string
  borrowNotes?: string
}

export interface HardDriveShoot {
  shootId: string
  shootName: string
  client: string
  date: string
  folder: string
  size: number
  backup: 'Completed' | 'Pending'
}

export interface HardDrive {
  id: string
  name: string
  brand: string
  serial: string
  capacity: number
  used: number
  status: 'Available' | 'In Use' | 'Full' | 'Backup Pending' | 'Backup Completed' | 'Damaged' | 'Lost' | 'Retired'
  location: string
  shoots: HardDriveShoot[]
}

export interface Shoot {
  id: string
  number: string
  name: string
  client: string
  type: string
  date: string
  time: string
  venue: string
  city: string
  priority: Priority
  status: ShootStatus
  currentStage: WorkflowStage
  crewIds: string[]
  sdCardIds: string[]
  hardDriveIds: string[]
  notes: string
  description: string
  workflow: Record<WorkflowStage, {
    status: WorkflowStatus
    completedAt?: string
    completedBy?: string
    notes?: string
  }>
  sorting?: {
    assignedTo: string
    deadline: string
    files: number
    selected: number
    rejected: number
    status: string
  }
  editing?: {
    editor: string
    deadline: string
    type: string
    priority: Priority
    status: string
  }
  delivery?: {
    type: string
    link: string
    deliveredAt?: string
    deliveredBy?: string
    status: string
  }
  /** Submitted form data keyed by stage name */
  stageFormData?: Partial<Record<WorkflowStage, Record<string, unknown>>>
  createdAt?: string
  /** Bumped by the backend on every update — used to force UI remounts after a save */
  updatedAt?: string
}

// Per-stage form data stored after submission
export interface InquiryFormData {
  eventName: string; clientName: string; email: string; phone: string; eventType: string; eventDate: string; eventTime: string; budget: string; message: string
}
export interface ConfirmFormData {
  contractSigned: boolean; advancePaid: string; advanceDate: string; notes: string
}
export interface ScheduleFormData {
  shootDate: string; startTime: string; endTime: string; venue: string; city: string; mapLink: string; notes: string
}
export interface CrewAssignFormData {
  crewIds: string[]; notes: string
}
export interface ShootDayNotesFormData {
  shotList: string; specialRequirements: string; clientInstructions: string; notes: string
}
export interface CardsAssignFormData {
  cardIds: string[]; notes: string
}
export interface WrappedFormData {
  totalFootage: string; packupTime: string; notes: string
}
export interface DataCopyFormData {
  driveId: string; folderPath: string; dataSize: string; backupStatus: string; notes: string
}
export interface SortingFormData {
  assignedTo: string; deadline: string; totalFiles: string; notes: string
}
export interface EditingFormData {
  editor: string; deadline: string; editType: string; priority: string; notes: string
}
export interface DeliveredFormData {
  deliveryType: string; deliveryLink: string; deliveredBy: string; notes: string
}

export type StageFormData =
  | { stage: 'Inquiry';         data: InquiryFormData }
  | { stage: 'Confirm';         data: ConfirmFormData }
  | { stage: 'Schedule';        data: ScheduleFormData }
  | { stage: 'Crew Assign';     data: CrewAssignFormData }
  | { stage: 'Shoot Day Notes'; data: ShootDayNotesFormData }
  | { stage: 'Cards Assign';    data: CardsAssignFormData }
  | { stage: 'Wrapped';         data: WrappedFormData }
  | { stage: 'Data Copy';       data: DataCopyFormData }
  | { stage: 'Sorting';         data: SortingFormData }
  | { stage: 'Editing';         data: EditingFormData }
  | { stage: 'Delivered';       data: DeliveredFormData }

export interface Activity {
  id: string
  text: string
  /** Date + time stamp, e.g. "23 Oct 2026, 02:30 PM". */
  time: string
  /** Date-only portion (new entries). Older entries may not have it. */
  date?: string
  /** ISO timestamp set by the backend. Used to render an accurate IST stamp. */
  createdAt?: string
  shoot?: string
  user: string
}

export interface Notification {
  id: string
  title: string
  detail: string
  time: string
  read: boolean
  /** Target user this notification was addressed to (null = broadcast). */
  userEmail?: string | null
  userName?: string | null
  /** Optional shoot this notification links to (enables a "View Shoot" action). */
  shootId?: string | null
}
