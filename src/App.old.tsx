import {
    ArrowLeft, ArrowUpRight, CalendarDays, Camera, Check, ChevronLeft, ChevronRight,
    Clock3, Database, Edit3, ExternalLink,
    FileText,
    HardDrive, ListFilter, MoreHorizontal,
    Package, Play, Plus,
    ShieldCheck,
    UserPlus,
    UserRound,
    Users
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
    AppLayout, Badge, EmptyState, FormField, MiniStat, Modal, PageHeader, SearchFilter,
    SectionTitle, ShootSummary, StageDetails, WorkflowTimeline,
    cx,
    statusTone
} from './components'
import { activities, hardDrives, members, notifications, sdCards, shoots, workflowStages } from './data'
import type { Shoot, WorkflowStage } from './types'

function Dashboard() {
  const navigate = useNavigate()
  const counts = {
    total: shoots.length,
    upcoming: shoots.filter(s => ['Scheduled','Inquiry'].includes(s.status)).length,
    progress: shoots.filter(s => s.status === 'In Progress').length,
    wrapped: shoots.filter(s => s.status === 'Wrapped').length,
    data: shoots.filter(s => s.currentStage === 'Data Copy').length,
    sorting: shoots.filter(s => s.currentStage === 'Sorting').length,
    editing: shoots.filter(s => s.currentStage === 'Editing').length,
    delivered: shoots.filter(s => s.status === 'Delivered').length,
  }
  const stageCount = workflowStages.map(stage => ({stage, count: shoots.filter(s => s.currentStage === stage).length}))
  return <AppLayout>
    <PageHeader title="Dashboard" subtitle="A quick view of today's production operations" action={<Link to="/shoots" className="btn btn-primary"><Plus size={16}/> New Shoot</Link>} />
    <div className="stats-grid">
      <MiniStat label="Total Shoots" value={counts.total} icon={Camera} detail="Across all projects"/>
      <MiniStat label="Upcoming" value={counts.upcoming} icon={CalendarDays} detail="Scheduled / enquiry"/>
      <MiniStat label="In Progress" value={counts.progress} icon={Play} detail="Currently shooting"/>
      <MiniStat label="Wrapped" value={counts.wrapped} icon={Check} detail="Awaiting post-production"/>
      <MiniStat label="Data Copy" value={counts.data} icon={HardDrive} detail="Storage action needed"/>
      <MiniStat label="Sorting" value={counts.sorting} icon={ListFilter} detail="Selection in progress"/>
      <MiniStat label="Editing" value={counts.editing} icon={Edit3} detail="Post-production"/>
      <MiniStat label="Delivered" value={counts.delivered} icon={ShieldCheck} detail="Closed successfully"/>
    </div>

    <div className="dashboard-grid">
      <section className="card">
        <SectionTitle title="Workflow Overview" action={<Link to="/shoots" className="text-link">View shoots <ArrowUpRight size={14}/></Link>}/>
        <div className="stage-bars">
          {stageCount.map(({stage,count}) => <div className="stage-bar-row" key={stage}>
            <span>{stage}</span><div className="bar-track"><i style={{width:`${Math.max(4, count / Math.max(1, shoots.length) * 100)}%`}}/></div><strong>{count}</strong>
          </div>)}
        </div>
      </section>
      <section className="card">
        <SectionTitle title="Today's / Upcoming Shoots" action={<Link to="/calendar" className="text-link">Calendar <ArrowUpRight size={14}/></Link>}/>
        <div className="compact-list">
          {shoots.slice(0,5).map(s => <button key={s.id} className="compact-row" onClick={()=>navigate(`/shoots/${s.id}`)}>
            <div className="date-box"><strong>{s.date.split(' ')[1]?.replace(',','') ?? '08'}</strong><span>{s.date.split(' ')[0]}</span></div>
            <div className="grow"><strong>{s.name}</strong><span>{s.venue} · {s.city}</span></div><Badge tone={statusTone(s.status)}>{s.currentStage}</Badge>
          </button>)}
        </div>
      </section>
    </div>
    <div className="dashboard-grid">
      <section className="card">
        <SectionTitle title="Recent Activity" action={<Link to="/activity" className="text-link">View all <ArrowUpRight size={14}/></Link>}/>
        <div className="activity-list">{activities.slice(0,6).map(a => <div className="activity-row" key={a.id}><span className="activity-dot"/><div><strong>{a.text}</strong><span>{a.time} · {a.user}</span></div></div>)}</div>
      </section>
      <section className="card storage-overview">
        <SectionTitle title="Storage Overview" action={<Link to="/hard-drives" className="text-link">Manage <ArrowUpRight size={14}/></Link>}/>
        {hardDrives.slice(0,3).map(h => <div className="storage-row" key={h.id}><div><strong>{h.name}</strong><span>{h.used} TB of {h.capacity} TB used</span></div><div className="storage-bar"><i style={{width:`${h.used/h.capacity*100}%`}}/></div></div>)}
      </section>
    </div>
  </AppLayout>
}

function ShootsPage() {
  const [query,setQuery] = useState('')
  const [stage,setStage] = useState('All')
  const [modal,setModal] = useState(false)
  const [localShoots,setLocalShoots] = useState(shoots)
  const filtered = localShoots.filter(s => `${s.name} ${s.client} ${s.number} ${s.venue}`.toLowerCase().includes(query.toLowerCase()) && (stage === 'All' || s.currentStage === stage))
  return <AppLayout>
    <PageHeader title="Shoots" subtitle="Manage the complete photography production pipeline" action={<button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> New Shoot</button>} />
    <section className="card">
      <div className="toolbar"><SearchFilter value={query} onChange={setQuery} placeholder="Search shoots, clients or venues..." />
        <select className="select" value={stage} onChange={e=>setStage(e.target.value)}><option>All</option>{workflowStages.map(s=><option key={s}>{s}</option>)}</select>
        <button className="btn btn-secondary"><ListFilter size={15}/> Filters</button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Shoot</th><th>Client</th><th>Type</th><th>Date</th><th>Venue</th><th>Crew</th><th>Current Stage</th><th>Status</th><th/></tr></thead>
      <tbody>{filtered.map(s=><tr key={s.id}><td><Link className="table-primary" to={`/shoots/${s.id}`}>{s.name}</Link><small>{s.number}</small></td><td>{s.client}</td><td><Badge tone="neutral">{s.type}</Badge></td><td>{s.date}<small>{s.time}</small></td><td>{s.venue}<small>{s.city}</small></td><td>{s.crewIds.length} members</td><td><Badge tone={statusTone(s.currentStage)}>{s.currentStage}</Badge></td><td><Badge tone={statusTone(s.status)}>{s.status}</Badge></td><td><button className="icon-btn"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <EmptyState title="No shoots found" text="Try changing your search or filters."/>}
    </section>
    <ShootModal open={modal} onClose={()=>setModal(false)} onCreate={s=>setLocalShoots(prev=>[s,...prev])}/>
  </AppLayout>
}

function ShootModal({open,onClose,onCreate}:{open:boolean;onClose:()=>void;onCreate:(s:Shoot)=>void}) {
  const [name,setName]=useState(''), [client,setClient]=useState(''), [type,setType]=useState('Couple'), [date,setDate]=useState(''), [venue,setVenue]=useState(''), [city,setCity]=useState('Ahmedabad')
  const create=()=>{
    if(!name||!client||!date||!venue) return
    const s = {
      id:`new-${Date.now()}`, number:`SH-2026-${Math.floor(1000+Math.random()*8999)}`, name, client, type,
      date:new Date(date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), time:'10:00 AM – 6:00 PM',
      venue, city, priority:'Normal' as const, status:'Inquiry' as const, currentStage:'Inquiry' as const,
      crewIds:[],sdCardIds:[],hardDriveIds:[],notes:'',description:'',workflow: Object.fromEntries(workflowStages.map((x,i)=>[x,{status:i===0?'current':'locked'}])) as Shoot['workflow']
    }
    onCreate(s); onClose(); setName('');setClient('');setDate('');setVenue('')
  }
  return <Modal open={open} title="Create New Shoot" onClose={onClose}>
    <div className="form-grid"><FormField label="Shoot Name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Gupta Anniversary"/></FormField>
    <FormField label="Client"><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Client name"/></FormField>
    <FormField label="Shoot Type"><select value={type} onChange={e=>setType(e.target.value)}>{['Wedding','Couple','Corporate','Product','Fashion','Event','Pre-Wedding','Commercial','Photography','Videography','Other'].map(x=><option key={x}>{x}</option>)}</select></FormField>
    <FormField label="Shoot Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></FormField>
    <FormField label="Venue"><input value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Venue"/></FormField>
    <FormField label="City"><input value={city} onChange={e=>setCity(e.target.value)}/></FormField></div>
    <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={create}><Plus size={15}/> Create Shoot</button></div>
  </Modal>
}

function ShootDetails() {
  const {id}=useParams(); const navigate=useNavigate()
  const [shoot,setShoot]=useState(()=>shoots.find(s=>s.id===id) ?? shoots[0])
  const [stage,setStage]=useState<WorkflowStage>(shoot.currentStage)
  const [tab,setTab]=useState('Overview')
  const [notes,setNotes]=useState(shoot.workflow[stage]?.notes ?? '')
  const [assignModal,setAssignModal]=useState(false)
  const [sdModal,setSdModal]=useState(false)

  const crew=shoot.crewIds.map(id=>members.find(m=>m.id===id)).filter(Boolean)
  const cards=shoot.sdCardIds.map(id=>sdCards.find(c=>c.id===id)).filter(Boolean)
  const drives=shoot.hardDriveIds.map(id=>hardDrives.find(h=>h.id===id)).filter(Boolean)
  const stageIndex=workflowStages.indexOf(stage)

  const selectStage=(s:WorkflowStage)=>{
    setStage(s); setNotes(shoot.workflow[s]?.notes ?? '')
  }
  const completeStage=()=>{
    if(shoot.workflow[stage].status==='locked') return
    const nextIndex=Math.min(stageIndex+1,workflowStages.length-1)
    const updated={...shoot, currentStage: workflowStages[nextIndex], status: workflowStages[nextIndex]==='Delivered'?'Delivered':shoot.status,
      workflow:{...shoot.workflow,[stage]:{...shoot.workflow[stage],status:'completed',completedAt:'Aug 21, 2026 12:10 PM',completedBy:'Admin User'},
      [workflowStages[nextIndex]]:{...shoot.workflow[workflowStages[nextIndex]],status:'current'}}}
    setShoot(updated); setStage(stage); 
  }
  const saveNotes=(value:string)=>{setNotes(value);setShoot({...shoot,workflow:{...shoot.workflow,[stage]:{...shoot.workflow[stage],notes:value}}})}
  return <AppLayout>
    <div className="details-head"><button className="icon-btn back-btn" onClick={()=>navigate('/shoots')}><ArrowLeft size={18}/></button><div className="details-title"><div className="title-line"><h1>{shoot.name}</h1><Badge tone="info">{shoot.priority}</Badge></div><div className="subtitle-line"><Badge tone="brown">{shoot.type}</Badge><Badge tone={statusTone(shoot.status)}>{shoot.status}</Badge><span><CalendarDays size={14}/> {shoot.date}</span></div></div></div>
    <WorkflowTimeline shoot={shoot} onStage={selectStage}/>
    <StageDetails shoot={{...shoot,workflow:{...shoot.workflow,[stage]:{...shoot.workflow[stage],notes}}}} stage={stage} onComplete={completeStage} onNotes={saveNotes}/>
    <div className="tabs">{['Overview','Crew','Media','Data','Sorting','Editing','Delivery','Activity'].map(x=><button className={cx('tab',tab===x&&'active')} key={x} onClick={()=>setTab(x)}>{x}</button>)}</div>
    <div className="tab-content">
      {tab==='Overview' && <Overview shoot={shoot}/>}
      {tab==='Crew' && <CrewTab crew={crew as any} onAssign={()=>setAssignModal(true)}/>}
      {tab==='Media' && <MediaTab cards={cards as any} drives={drives as any} onCard={()=>setSdModal(true)}/>}
      {tab==='Data' && <DataTab shoot={shoot} drives={drives as any}/>}
      {tab==='Sorting' && <SortingTab shoot={shoot}/>}
      {tab==='Editing' && <EditingTab shoot={shoot}/>}
      {tab==='Delivery' && <DeliveryTab shoot={shoot}/>}
      {tab==='Activity' && <ActivityTab/>}
    </div>
    <CrewModal open={assignModal} onClose={()=>setAssignModal(false)} shoot={shoot}/>
    <SDModal open={sdModal} onClose={()=>setSdModal(false)} shoot={shoot}/>
  </AppLayout>
}

function Overview({shoot}:{shoot:Shoot}) {
  return <div className="stack"><ShootSummary shoot={shoot}/><section className="card"><SectionTitle title="Shoot Description"/><p className="body-copy">{shoot.description}</p><div className="note-box"><strong>Notes</strong><p>{shoot.notes || 'No notes added yet.'}</p></div></section></div>
}
function CrewTab({crew,onAssign}:{crew:any[];onAssign:()=>void}) {
  return <section className="card"><SectionTitle title="Assigned Crew" action={<button className="btn btn-primary" onClick={onAssign}><UserPlus size={15}/> Assign Crew</button>}/><div className="crew-grid">{crew.length?crew.map(m=><div className="crew-card" key={m.id}><div className="avatar large">{m.name.split(' ').map((x:string)=>x[0]).join('')}</div><div className="grow"><strong>{m.name}</strong><span>{m.role}</span><small>{m.email}</small></div><Badge tone={statusTone(m.availability)}>{m.availability}</Badge></div>):<EmptyState title="No crew assigned" text="Assign crew members for this shoot."/ >}</div></section>
}
function MediaTab({cards,drives,onCard}:{cards:any[];drives:any[];onCard:()=>void}) {
  return <div className="stack">
    <section className="card">
      <SectionTitle title="SD Card Assignments" action={<button className="btn btn-secondary" onClick={onCard}><Plus size={15}/> Assign SD Card</button>}/>
      {cards.length?cards.map(c=><div className="media-row" key={c.id}><div className="device-icon"><Database size={17}/></div><div className="grow"><strong>{c.number}</strong><span>{c.brand} · {c.capacity} · {c.serial}</span></div><Badge tone={statusTone(c.status)}>{c.status}</Badge></div>):<EmptyState title="No SD cards assigned" text="Assign an SD card when the shoot starts."/>}
    </section>
    <section className="card">
      <SectionTitle title="Hard Drive Storage"/>
      {drives.length?drives.map(h=><div className="drive-summary" key={h.id}><div className="device-icon"><HardDrive size={17}/></div><div className="grow"><strong>{h.name}</strong><span>{h.brand} · {h.capacity} TB · {h.location}</span><div className="storage-bar"><i style={{width:`${h.used/h.capacity*100}%`}}/></div><strong>{h.used} / {h.capacity} TB</strong><Link className="text-link" to={`/hard-drives/${h.id}`}>View <ExternalLink size={13}/></Link></div></div>):<EmptyState title="No hard drive assigned" text="Storage will appear here after allocation."/>}
    </section>
  </div>
}
function DataTab({shoot,drives}:{shoot:Shoot;drives:any[]}) {
  return <section className="card"><SectionTitle title="Data Copy"/><div className="data-copy-grid"><div className="data-box"><span>Source</span><strong>{shoot.sdCardIds[0] ? sdCards.find(x=>x.id===shoot.sdCardIds[0])?.number : 'Not assigned'}</strong><small>SD card</small></div><div className="data-arrow">→</div><div className="data-box"><span>Destination</span><strong>{drives[0]?.name ?? 'Not assigned'}</strong><small>{drives[0]?.capacity ?? 0} TB hard drive</small></div></div><div className="form-grid three"><FormField label="Folder / Path"><input defaultValue={`/2026/${shoot.date.split(' ')[0]}/${shoot.number}`}/></FormField><FormField label="Data Size"><input defaultValue="186 GB"/></FormField><FormField label="Backup Status"><select defaultValue="Pending"><option>Pending</option><option>Completed</option></select></FormField></div><button className="btn btn-primary"><Check size={15}/> Mark Copy Completed</button></section>
}
function SortingTab({shoot}:{shoot:Shoot}) {
  const x=shoot.sorting
  return <section className="card"><SectionTitle title="Sorting Task" action={<button className="btn btn-secondary"><Edit3 size={15}/> Edit Task</button>}/>{x?<><div className="summary-grid"><div className="summary-item"><UserRound/><div><span>Assigned To</span><strong>{x.assignedTo}</strong></div></div><div className="summary-item"><Clock3/><div><span>Deadline</span><strong>{x.deadline}</strong></div></div><div className="summary-item"><FileText/><div><span>Total Files</span><strong>{x.files}</strong></div></div><div className="summary-item"><Check/><div><span>Status</span><strong>{x.status}</strong></div></div></div><div className="file-stats"><div><span>Selected</span><strong>{x.selected}</strong></div><div><span>Rejected</span><strong>{x.rejected}</strong></div></div></>:<EmptyState title="No sorting task" text="Create a sorting task after data copy."/ >}</section>
}
function EditingTab({shoot}:{shoot:Shoot}) {
  const x=shoot.editing
  return <section className="card"><SectionTitle title="Editing Task" action={<button className="btn btn-primary"><Plus size={15}/> Assign Editor</button>}/>{x?<><div className="summary-grid"><div className="summary-item"><UserRound/><div><span>Editor</span><strong>{x.editor}</strong></div></div><div className="summary-item"><Clock3/><div><span>Deadline</span><strong>{x.deadline}</strong></div></div><div className="summary-item"><Edit3/><div><span>Type</span><strong>{x.type}</strong></div></div><div className="summary-item"><Check/><div><span>Status</span><strong>{x.status}</strong></div></div></div><div className="modal-actions"><button className="btn btn-secondary"><Play size={15}/> Start Editing</button><button className="btn btn-primary"><Check size={15}/> Mark Completed</button></div></>:<EmptyState title="No editing task" text="Assign an editor after sorting is complete."/ >}</section>
}
function DeliveryTab({shoot}:{shoot:Shoot}) {
  const x=shoot.delivery
  return <section className="card"><SectionTitle title="Delivery" action={<button className="btn btn-primary"><Plus size={15}/> Create Delivery</button>}/>{x?<div className="delivery-card"><div><span>Delivery Type</span><strong>{x.type}</strong></div><div><span>Status</span><Badge tone={statusTone(x.status)}>{x.status}</Badge></div><div><span>Delivered By</span><strong>{x.deliveredBy}</strong></div><div><span>Link</span><a href={x.link} target="_blank" rel="noreferrer">Open delivery <ExternalLink size={13}/></a></div></div>:<EmptyState title="No delivery yet" text="Create delivery after editing is completed."/ >}</section>
}
function ActivityTab() {
  return <section className="card"><SectionTitle title="Activity"/><div className="activity-list large">{activities.map(a=><div className="activity-row" key={a.id}><span className="activity-dot"/><div><strong>{a.text}</strong><span>{a.time} · {a.user}</span></div></div>)}</div></section>
}
function CrewModal({open,onClose,shoot}:{open:boolean;onClose:()=>void;shoot:Shoot}) {
  const [selected,setSelected]=useState('')
  return <Modal open={open} title="Assign Crew" onClose={onClose}><FormField label="Team Member"><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select member</option>{members.filter(m=>m.availability!=='On Leave').map(m=><option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}</select></FormField><FormField label="Role"><select><option>Photographer</option><option>Videographer</option><option>Assistant</option><option>Data Manager</option></select></FormField><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={onClose}><UserPlus size={15}/> Assign Member</button></div></Modal>
}
function SDModal({open,onClose,shoot}:{open:boolean;onClose:()=>void;shoot:Shoot}) {
  return <Modal open={open} title="Assign SD Card" onClose={onClose}><FormField label="SD Card"><select><option>Select available card</option>{sdCards.filter(c=>c.status==='Available').map(c=><option key={c.id}>{c.number} — {c.capacity} — {c.brand}</option>)}</select></FormField><FormField label="Crew Member"><select><option>Select crew member</option>{shoot.crewIds.map(id=>members.find(m=>m.id===id)).filter(Boolean).map(m=><option key={m!.id}>{m!.name}</option>)}</select></FormField><FormField label="Notes"><textarea rows={3} placeholder="Add allocation notes..."/></FormField><div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={onClose}><Database size={15}/> Assign Card</button></div></Modal>
}

function SimpleCrud({title, subtitle, kind}:{title:string;subtitle:string;kind:'team'|'sd'|'hard'|'equipment'}) {
  const [query,setQuery]=useState('')
  const data = kind==='team' ? members.map(x=>({id:x.id,name:x.name,meta:x.role,status:x.availability,extra:`${x.shoots} shoots`}))
    : kind==='sd' ? sdCards.map(x=>({id:x.id,name:x.number,meta:`${x.brand} · ${x.capacity}`,status:x.status,extra:x.serial}))
    : kind==='hard' ? hardDrives.map(x=>({id:x.id,name:x.name,meta:`${x.brand} · ${x.capacity} TB`,status:x.status,extra:`${x.used} TB used`}))
    : ['Camera A7', '24-70mm Lens', '70-200mm Lens', 'Aputure Light', 'Rode Mic', 'DJI Gimbal'].map((x,i)=>({id:`e${i}`,name:x,meta:i%2?'Lens':'Camera / Lighting',status:i%3===0?'Assigned':'Available',extra:'Third Eye Equipment'}))
  const filtered=data.filter(x=>`${x.name} ${x.meta} ${x.extra}`.toLowerCase().includes(query.toLowerCase()))
  const paths={team:'/team',sd:'/sd-cards',hard:'/hard-drives',equipment:'/equipment'} as const
  return <AppLayout><PageHeader title={title} subtitle={subtitle} action={<button className="btn btn-primary"><Plus size={16}/> Add {kind==='team'?'Member':kind==='sd'?'SD Card':kind==='hard'?'Hard Drive':'Equipment'}</button>}/><section className="card"><div className="toolbar"><SearchFilter value={query} onChange={setQuery}/><button className="btn btn-secondary"><ListFilter size={15}/> Filters</button></div><div className="resource-grid">{filtered.map(x=><div className="resource-card" key={x.id}><div className="resource-icon">{kind==='team'?<Users/>:kind==='sd'?<Database/>:kind==='hard'?<HardDrive/>:<Package/>}</div><div className="grow"><Link to={kind==='hard'?`/hard-drives/${x.id}`:paths[kind]} className="resource-name">{x.name}</Link><span>{x.meta}</span><small>{x.extra}</small></div><Badge tone={statusTone(x.status)}>{x.status}</Badge><button className="icon-btn"><MoreHorizontal size={16}/></button></div>)}</div></section></AppLayout>
}

function HardDriveDetails() {
  const {id}=useParams(); const drive=hardDrives.find(h=>h.id===id) ?? hardDrives[0]
  return <AppLayout><div className="details-head"><Link className="icon-btn back-btn" to="/hard-drives"><ArrowLeft size={18}/></Link><div className="details-title"><div className="title-line"><h1>{drive.name}</h1><Badge tone={statusTone(drive.status)}>{drive.status}</Badge></div><div className="subtitle-line"><span>{drive.brand} · {drive.serial}</span><span>{drive.location}</span></div></div></div>
    <div className="stats-grid four"><MiniStat label="Capacity" value={`${drive.capacity} TB`} icon={HardDrive}/><MiniStat label="Used" value={`${drive.used} TB`} icon={Database}/><MiniStat label="Free" value={`${(drive.capacity-drive.used).toFixed(1)} TB`} icon={Package}/><MiniStat label="Shoots Stored" value={drive.shoots.length} icon={Camera}/></div>
    <section className="card"><SectionTitle title="Storage"/><div className="big-storage"><div className="storage-bar big"><i style={{width:`${drive.used/drive.capacity*100}%`}}/></div><div className="storage-legend"><span>{drive.used} TB used</span><strong>{(drive.capacity-drive.used).toFixed(1)} TB free</strong></div></div></section>
    <section className="card"><SectionTitle title="Stored Shoots" action={<button className="btn btn-primary"><Plus size={15}/> Add Shoot Storage</button>}/><div className="table-wrap"><table><thead><tr><th>Shoot</th><th>Client</th><th>Date</th><th>Folder</th><th>Size</th><th>Backup</th></tr></thead><tbody>{drive.shoots.map(s=><tr key={s.shootId}><td><Link className="table-primary" to={`/shoots/${s.shootId}`}>{s.shootName}</Link></td><td>{s.client}</td><td>{s.date}</td><td><code>{s.folder}</code></td><td>{s.size} TB</td><td><Badge tone={statusTone(s.backup)}>{s.backup}</Badge></td></tr>)}</tbody></table></div></section>
  </AppLayout>
}

function CalendarPage() {
  return <AppLayout><PageHeader title="Calendar" subtitle="Plan and view upcoming shoots"/><section className="card"><div className="calendar-head"><button className="btn btn-secondary"><ChevronLeft size={15}/></button><h2>August 2026</h2><button className="btn btn-secondary"><ChevronRight size={15}/></button><div className="grow"/><button className="btn btn-secondary">Month</button><button className="btn btn-secondary">Week</button><button className="btn btn-secondary">Day</button></div><div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><div className="cal-head" key={x}>{x}</div>)}{Array.from({length:35},(_,i)=><div className="cal-cell" key={i}><span>{i<6?'':i-5}</span>{shoots.filter(s=>{const n=Number(s.date.match(/\d+/)?.[0]);return n===i-5}).map(s=><Link key={s.id} to={`/shoots/${s.id}`} className="cal-event"><strong>{s.name}</strong><small>{s.type}</small></Link>)}</div>)}</div></section></AppLayout>
}
function NotificationsPage(){return <AppLayout><PageHeader title="Notifications" subtitle="Stay on top of production updates"/><section className="card notification-list">{notifications.map(n=><div className={n.read?'notification read':'notification'} key={n.id}><span className="notification-icon"><BellIcon/></span><div className="grow"><strong>{n.title}</strong><span>{n.detail}</span><small>{n.time}</small></div>{!n.read&&<span className="unread"/>}</div>)}</section></AppLayout>}
function BellIcon(){return <span>!</span>}
function ActivityPage(){return <AppLayout><PageHeader title="Activity" subtitle="Complete production history"/><section className="card"><div className="toolbar"><SearchFilter value="" onChange={()=>{}} placeholder="Search activity..."/><button className="btn btn-secondary"><ListFilter size={15}/> Filters</button></div><div className="activity-list large">{activities.concat(activities).map((a,i)=><div className="activity-row" key={`${a.id}-${i}`}><span className="activity-dot"/><div><strong>{a.text}</strong><span>{a.time} · {a.user}{a.shoot?` · ${a.shoot}`:''}</span></div></div>)}</div></section></AppLayout>}

function Login(){return <div className="login-page"><div className="login-card"><div className="brand centered"><div className="brand-mark">THIRD EYE</div><div className="brand-sub">photography</div></div><h1>Welcome back</h1><p>Sign in to your production workspace.</p><FormField label="Email"><input defaultValue="admin@thirdeye.in"/></FormField><FormField label="Password"><input type="password" defaultValue="password"/></FormField><Link to="/" className="btn btn-primary full">Sign In</Link><small className="login-note">Demo frontend · authentication will connect to the backend later.</small></div></div>}

function App(){
 return <Routes>
   <Route path="/login" element={<Login/>}/>
   <Route path="/" element={<Dashboard/>}/>
   <Route path="/shoots" element={<ShootsPage/>}/>
   <Route path="/shoots/:id" element={<ShootDetails/>}/>
   <Route path="/calendar" element={<CalendarPage/>}/>
   <Route path="/team" element={<SimpleCrud title="Team" subtitle="Manage photographers, videographers and editors" kind="team"/>}/>
   <Route path="/equipment" element={<SimpleCrud title="Equipment" subtitle="Manage cameras, lenses, lighting and production equipment" kind="equipment"/>}/>
   <Route path="/sd-cards" element={<SimpleCrud title="SD Cards" subtitle="Manage memory cards and assignment history" kind="sd"/>}/>
   <Route path="/hard-drives" element={<SimpleCrud title="Hard Drives" subtitle="Manage storage drives and stored shoot data" kind="hard"/>}/>
   <Route path="/hard-drives/:id" element={<HardDriveDetails/>}/>
   <Route path="/notifications" element={<NotificationsPage/>}/>
   <Route path="/activity" element={<ActivityPage/>}/>
   <Route path="*" element={<Navigate to="/"/>}/>
 </Routes>
}
