import type { Activity, CrewMember, HardDrive, Notification, SDCard, Shoot, WorkflowStage } from './types';

export const workflowStages: WorkflowStage[] = [
  'Inquiry', 'Confirm', 'Schedule', 'Crew Assign', 'Equipment Assign', 'Shoot Day Notes',
  'Cards Assign', 'Wrapped', 'Data Copy', 'Sorting', 'Editing', 'Delivered'
]

/**
 * Render an activity's timestamp as Indian date + time (IST), independent of
 * what the backend stored or where it runs. Prefers the ISO `createdAt`
 * (timezone-safe); falls back to the stored strings for older entries.
 */
export function formatActivityIST(a: Pick<Activity, 'createdAt' | 'date' | 'time'>): string {
  if (a.createdAt) {
    const d = new Date(a.createdAt)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    }
  }
  if (a.date && a.time && !a.time.includes(a.date)) return `${a.date}, ${a.time}`
  return a.time ?? ''
}

/**
 * Canonical Shoot Type options, grouped. Shared by the Inquiry stage form and
 * the "Create New Shoot" modal so both dropdowns stay identical.
 */
export const SHOOT_TYPE_GROUPS: { label: string; options: string[] }[] = [
  {
    label: 'Events & Celebrations',
    options: ['Wedding','Pre-Wedding','Engagement','Birthday','Anniversary','Babyshower','Housewarming','Office Inauguration','Farewell & Retirement Parties','Corporate Event','Cultural Event','Social Event','Collage Event','Product Launches & Openings','BNI Shoot','V2VBN Shoot'],
  },
  {
    label: 'Commercial Shoots',
    options: ['Product Shoot','Brand Shoot','Podcast Shoot','Advertising Shoot','Car Delivery Shoot','Fashion Shoot','Jewellery Shoot','Industrial Shoot','Food / Restaurant Shoot','Podcast / Interview Shoot','Social Media Content Shoot','BTS Shoot','Travel Shoot'],
  },
  {
    label: 'Interior & Architecture',
    options: ['Interior Shoot','Architecture Shoot','Real Estate Shoot','Hotel / Resort Shoot','Construction Progress Shoot'],
  },
  {
    label: 'Other',
    options: ['Other'],
  },
]

const workflow = (currentIndex: number, notes = '') => {
  const result = {} as Shoot['workflow']
  workflowStages.forEach((stage, index) => {
    result[stage] = {
      status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'locked',
      ...(index < currentIndex ? { completedAt: 'Jul 3, 8:09 PM', completedBy: 'Admin User' } : {}),
      ...(stage === workflowStages[currentIndex] ? { notes } : {}),
    }
  })
  return result
}

export const members: CrewMember[] = [
  { id: 'm1', name: 'Rahul Shah', role: 'Photographer', phone: '+91 98765 10001', email: 'rahul@thirdeye.in', availability: 'Assigned', shoots: 12 },
  { id: 'm2', name: 'Amit Patel', role: 'Videographer', phone: '+91 98765 10002', email: 'amit@thirdeye.in', availability: 'Assigned', shoots: 9 },
  { id: 'm3', name: 'Neha Shah', role: 'Assistant', phone: '+91 98765 10003', email: 'neha@thirdeye.in', availability: 'Available', shoots: 8 },
  { id: 'm4', name: 'Priya Shah', role: 'Editor', phone: '+91 98765 10004', email: 'priya@thirdeye.in', availability: 'Assigned', shoots: 16 },
  { id: 'm5', name: 'Karan Mehta', role: 'Data Manager', phone: '+91 98765 10005', email: 'karan@thirdeye.in', availability: 'Available', shoots: 7 },
  { id: 'm6', name: 'Digvijay Rajput', role: 'Photographer', phone: '+91 98765 10006', email: 'digvijay@thirdeye.in', availability: 'Available', shoots: 10 },
  { id: 'm7', name: 'Riya Joshi', role: 'Cinematographer', phone: '+91 98765 10007', email: 'riya@thirdeye.in', availability: 'On Leave', shoots: 6 },
  { id: 'm8', name: 'Dev Patel', role: 'Editor', phone: '+91 98765 10008', email: 'dev@thirdeye.in', availability: 'Available', shoots: 13 },
]

export const shoots: Shoot[] = [
  {
    id: 's1', number: 'SH-2026-0012', name: 'Gupta Anniversary', client: 'Gupta Family', type: 'Couple',
    date: 'Jul 8, 2026', time: '10:00 AM – 6:30 PM', venue: 'Riverfront Studio', city: 'Ahmedabad',
    priority: 'Normal', status: 'Delivered', currentStage: 'Delivered', crewIds: ['m1', 'm2', 'm3'], sdCardIds: ['sd1'],
    hardDriveIds: ['hd1'], notes: 'Keep the anniversary portraits warm and candid.', description: 'Anniversary couple shoot.',
    workflow: workflow(10, 'Final delivery completed.'),
    sorting: { assignedTo: 'Priya Shah', deadline: 'Jul 10, 2026', files: 1245, selected: 980, rejected: 265, status: 'Completed' },
    editing: { editor: 'Priya Shah', deadline: 'Jul 15, 2026', type: 'Wedding Highlights', priority: 'High', status: 'Completed' },
    delivery: { type: 'Google Drive', link: 'https://drive.google.com/', deliveredAt: 'Jul 16, 2026', deliveredBy: 'Admin User', status: 'Completed' }
  },
  {
    id: 's2', number: 'SH-2026-0018', name: 'Patel Wedding', client: 'Patel Family', type: 'Wedding',
    date: 'Aug 22, 2026', time: '9:00 AM – 10:00 PM', venue: 'The Fern', city: 'Ahmedabad',
    priority: 'High', status: 'Scheduled', currentStage: 'Crew Assign', crewIds: ['m6', 'm2'], sdCardIds: [], hardDriveIds: [],
    notes: 'Two-camera coverage required.', description: 'Full-day wedding coverage.', workflow: workflow(3)
  },
  {
    id: 's3', number: 'SH-2026-0021', name: 'Brand Product Launch', client: 'Aster Foods', type: 'Product',
    date: 'Aug 25, 2026', time: '11:00 AM – 5:00 PM', venue: 'Aster HQ', city: 'Mumbai',
    priority: 'Urgent', status: 'In Progress', currentStage: 'Cards Assign', crewIds: ['m1', 'm5'], sdCardIds: ['sd2'], hardDriveIds: [],
    notes: 'Product packshots and launch video.', description: 'Commercial product shoot.', workflow: workflow(5, 'Cards are being allocated.') 
  },
  {
    id: 's4', number: 'SH-2026-0024', name: 'Pre-Wedding Hills', client: 'Mehta Couple', type: 'Pre-Wedding',
    date: 'Aug 29, 2026', time: '5:30 AM – 4:00 PM', venue: 'Mount Abu', city: 'Rajasthan',
    priority: 'Normal', status: 'Scheduled', currentStage: 'Schedule', crewIds: [], sdCardIds: [], hardDriveIds: [],
    notes: 'Sunrise and golden-hour coverage.', description: 'Outdoor pre-wedding shoot.', workflow: workflow(2)
  },
  {
    id: 's5', number: 'SH-2026-0028', name: 'Corporate Portraits', client: 'Northstar Labs', type: 'Corporate',
    date: 'Sep 2, 2026', time: '9:00 AM – 3:00 PM', venue: 'Northstar Office', city: 'Bengaluru',
    priority: 'Normal', status: 'Inquiry', currentStage: 'Inquiry', crewIds: [], sdCardIds: [], hardDriveIds: [],
    notes: '', description: 'Leadership and employee portraits.', workflow: workflow(0)
  },
  {
    id: 's6', number: 'SH-2026-0031', name: 'Fashion Editorial', client: 'Mira Studio', type: 'Fashion',
    date: 'Sep 5, 2026', time: '8:00 AM – 7:00 PM', venue: 'Third Eye Studio', city: 'Ahmedabad',
    priority: 'High', status: 'Wrapped', currentStage: 'Wrapped', crewIds: ['m1', 'm3', 'm6'], sdCardIds: ['sd3', 'sd4'], hardDriveIds: ['hd2'],
    notes: 'Shoot wrapped; transfer pending.', description: 'Editorial fashion campaign.', workflow: workflow(6)
  },
  {
    id: 's7', number: 'SH-2026-0035', name: 'Baby Portraits', client: 'Shah Family', type: 'Photography',
    date: 'Sep 7, 2026', time: '4:00 PM – 7:00 PM', venue: 'Home Studio', city: 'Ahmedabad',
    priority: 'Low', status: 'Editing', currentStage: 'Editing', crewIds: ['m6'], sdCardIds: ['sd5'], hardDriveIds: ['hd3'],
    notes: 'Editing in progress.', description: 'Family portrait session.', workflow: workflow(9)
  },
  {
    id: 's8', number: 'SH-2026-0040', name: 'Cafe Campaign', client: 'Brew House', type: 'Commercial',
    date: 'Sep 10, 2026', time: '7:00 AM – 2:00 PM', venue: 'Brew House', city: 'Pune',
    priority: 'Normal', status: 'Wrapped', currentStage: 'Data Copy', crewIds: ['m2', 'm5'], sdCardIds: ['sd6'], hardDriveIds: ['hd1'],
    notes: 'Waiting for copy verification.', description: 'Food and lifestyle campaign.', workflow: workflow(7)
  },
  {
    id: 's9', number: 'SH-2026-0043', name: 'Engagement Ceremony', client: 'Desai Family', type: 'Event',
    date: 'Sep 12, 2026', time: '5:00 PM – 11:00 PM', venue: 'Courtyard Hall', city: 'Vadodara',
    priority: 'High', status: 'Scheduled', currentStage: 'Shoot Day Notes', crewIds: ['m1', 'm2', 'm3'], sdCardIds: [], hardDriveIds: [],
    notes: 'Confirm family group list before arrival.', description: 'Engagement event coverage.', workflow: workflow(4)
  },
  {
    id: 's10', number: 'SH-2026-0045', name: 'Jewellery Catalogue', client: 'Aarvi Jewels', type: 'Product',
    date: 'Sep 15, 2026', time: '10:00 AM – 4:00 PM', venue: 'Aarvi Studio', city: 'Surat',
    priority: 'Urgent', status: 'Scheduled', currentStage: 'Sorting', crewIds: ['m6', 'm5'], sdCardIds: ['sd7'], hardDriveIds: ['hd4'],
    notes: 'Select hero images before editing.', description: 'Jewellery catalogue photography.', workflow: workflow(8)
  }
]

export const sdCards: SDCard[] = [
  { id: 'sd1', number: 'SD-001', brand: 'Sony', capacity: '128 GB', serial: 'SN-001128', status: 'In Use', currentShootId: 's1', history: [{ shootId: 's1', shootName: 'Gupta Anniversary', date: 'Jul 14, 2026', member: 'Digvijay Rajput' }] },
  { id: 'sd2', number: 'SD-002', brand: 'SanDisk', capacity: '256 GB', serial: 'SN-002256', status: 'Assigned', currentShootId: 's3', history: [] },
  { id: 'sd3', number: 'SD-003', brand: 'Sony', capacity: '128 GB', serial: 'SN-003128', status: 'Data Copy Pending', currentShootId: 's6', history: [] },
  { id: 'sd4', number: 'SD-004', brand: 'Lexar', capacity: '256 GB', serial: 'SN-004256', status: 'Data Copied', history: [] },
  { id: 'sd5', number: 'SD-005', brand: 'Sony', capacity: '64 GB', serial: 'SN-005064', status: 'Data Copied', history: [] },
  { id: 'sd6', number: 'SD-006', brand: 'SanDisk', capacity: '128 GB', serial: 'SN-006128', status: 'Data Copy Pending', currentShootId: 's8', history: [] },
  { id: 'sd7', number: 'SD-007', brand: 'Lexar', capacity: '256 GB', serial: 'SN-007256', status: 'In Use', currentShootId: 's10', history: [] },
  { id: 'sd8', number: 'SD-008', brand: 'Sony', capacity: '128 GB', serial: 'SN-008128', status: 'Available', history: [] },
  { id: 'sd9', number: 'SD-009', brand: 'SanDisk', capacity: '64 GB', serial: 'SN-009064', status: 'Available', history: [] },
  { id: 'sd10', number: 'SD-010', brand: 'Sony', capacity: '256 GB', serial: 'SN-010256', status: 'Damaged', history: [] }
]

export const hardDrives: HardDrive[] = [
  {
    id: 'hd1', name: 'HD-001', brand: 'Samsung', serial: 'HD-SAM-001', capacity: 4, used: 2.8, status: 'In Use', location: 'Ahmedabad Studio',
    shoots: [
      { shootId: 's1', shootName: 'Gupta Anniversary', client: 'Gupta Family', date: 'Jul 8, 2026', folder: '/2026/July/SH-0012', size: 0.85, backup: 'Completed' },
      { shootId: 's8', shootName: 'Cafe Campaign', client: 'Brew House', date: 'Sep 10, 2026', folder: '/2026/Sep/SH-0040', size: 0.45, backup: 'Pending' },
      { shootId: 's6', shootName: 'Fashion Editorial', client: 'Mira Studio', date: 'Sep 5, 2026', folder: '/2026/Sep/SH-0031', size: 1.5, backup: 'Completed' }
    ]
  },
  {
    id: 'hd2', name: 'HD-002', brand: 'WD', serial: 'HD-WD-002', capacity: 8, used: 3.4, status: 'Available', location: 'Ahmedabad Studio',
    shoots: [{ shootId: 's6', shootName: 'Fashion Editorial', client: 'Mira Studio', date: 'Sep 5, 2026', folder: '/2026/Sep/SH-0031', size: 1.5, backup: 'Completed' }]
  },
  {
    id: 'hd3', name: 'HD-003', brand: 'LaCie', serial: 'HD-LAC-003', capacity: 4, used: 2.1, status: 'Backup Completed', location: 'Bengaluru',
    shoots: [{ shootId: 's7', shootName: 'Baby Portraits', client: 'Shah Family', date: 'Sep 7, 2026', folder: '/2026/Sep/SH-0035', size: 2.1, backup: 'Completed' }]
  },
  {
    id: 'hd4', name: 'HD-004', brand: 'SanDisk', serial: 'HD-SD-004', capacity: 2, used: 1.1, status: 'In Use', location: 'Surat',
    shoots: [{ shootId: 's10', shootName: 'Jewellery Catalogue', client: 'Aarvi Jewels', date: 'Sep 15, 2026', folder: '/2026/Sep/SH-0045', size: 1.1, backup: 'Pending' }]
  },
  {
    id: 'hd5', name: 'HD-005', brand: 'Samsung', serial: 'HD-SAM-005', capacity: 8, used: 7.7, status: 'Full', location: 'Archive',
    shoots: []
  }
]

export const activities: Activity[] = [
  { id: 'a1', text: 'Rahul started Gupta Anniversary', time: '10:05 AM', shoot: 'Gupta Anniversary', user: 'Rahul Shah' },
  { id: 'a2', text: 'SD-001 assigned to Gupta Anniversary', time: '10:15 AM', shoot: 'Gupta Anniversary', user: 'Admin User' },
  { id: 'a3', text: 'HD-002 assigned to Fashion Editorial', time: '10:20 AM', shoot: 'Fashion Editorial', user: 'Admin User' },
  { id: 'a4', text: 'Shoot marked Wrapped', time: '06:45 PM', shoot: 'Fashion Editorial', user: 'Rahul Shah' },
  { id: 'a5', text: 'Data Copy started', time: '07:30 PM', shoot: 'Cafe Campaign', user: 'Karan Mehta' },
  { id: 'a6', text: 'Sorting assigned to Priya Shah', time: 'Yesterday', shoot: 'Jewellery Catalogue', user: 'Admin User' },
  { id: 'a7', text: 'Editing completed', time: 'Yesterday', shoot: 'Gupta Anniversary', user: 'Priya Shah' },
  { id: 'a8', text: 'Delivery completed', time: 'Jul 16', shoot: 'Gupta Anniversary', user: 'Admin User' }
]

export const notifications: Notification[] = [
  { id: 'n1', title: 'Editing deadline tomorrow', detail: 'Jewellery Catalogue', time: '10 min ago', read: false },
  { id: 'n2', title: 'New shoot assigned', detail: 'Patel Wedding', time: '30 min ago', read: false },
  { id: 'n3', title: 'SD Card returned', detail: 'SD-004', time: '1 hour ago', read: true },
  { id: 'n4', title: 'Data copy pending', detail: 'Cafe Campaign', time: '2 hours ago', read: false }
]
