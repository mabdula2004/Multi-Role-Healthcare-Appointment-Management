// Synthetic admin records only. Live workspaces continue to use the Supabase API.
export const ADMIN_DEMO_KEY = 'medoraAdminDemoV1'
export const adminStatuses = {
  doctors: ['Pending', 'Verified', 'Rejected'], patients: ['Active', 'Pending', 'Suspended'],
  appointments: ['Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled', 'No show'],
  specialties: ['Active', 'Inactive'], reviews: ['Published', 'Flagged', 'Hidden'],
  payments: ['Pending', 'Paid', 'Refund review', 'Refunded'], support: ['Open', 'In progress', 'Resolved'],
  users: ['Active', 'Pending', 'Suspended']
}

export function createAdminDemo(now = new Date()) {
  const date = offset => { const d = new Date(now); d.setDate(d.getDate() + offset); d.setHours(10, 0, 0, 0); return d.toISOString() }
  return {
    version: 1,
    users: [
      {id:'USR-1042',name:'Amina Khan',role:'Patient',email:'amina@example.test',city:'Lahore',age:32,status:'Active'},
      {id:'USR-1031',name:'Hassan Ali',role:'Patient',email:'hassan@example.test',city:'Lahore',age:51,status:'Active'},
      {id:'USR-0998',name:'Mariam Noor',role:'Patient',email:'mariam@example.test',city:'Karachi',age:27,status:'Pending'},
      {id:'USR-0974',name:'Usman Tariq',role:'Patient',email:'usman@example.test',city:'Islamabad',age:44,status:'Active'},
      {id:'USR-1017',name:'Dr. Sarah Malik',role:'Doctor',email:'sarah@example.test',city:'Lahore',specialty:'Cardiology',license:'DEMO-PMC-1017',verification:'Verified',status:'Active'},
      {id:'USR-1018',name:'Dr. Hamza Qureshi',role:'Doctor',email:'hamza@example.test',city:'Lahore',specialty:'Dermatology',license:'DEMO-PMC-1018',verification:'Verified',status:'Active'},
      {id:'USR-1008',name:'Dr. Hira Sheikh',role:'Doctor',email:'hira@example.test',city:'Karachi',specialty:'Endocrinology',license:'DEMO-PMC-1008',verification:'Pending',status:'Pending'},
      {id:'USR-1009',name:'Dr. Ali Raza',role:'Doctor',email:'ali@example.test',city:'Islamabad',specialty:'ENT',license:'DEMO-PMC-1009',verification:'Pending',status:'Pending'},
      {id:'USR-0992',name:'Support Admin',role:'Admin',email:'support@example.test',city:'Lahore',status:'Active'}
    ],
    appointments: [
      {id:'APT-1048',patient:'Amina Khan',doctor:'Dr. Sarah Malik',specialty:'Cardiology',date:date(1),mode:'Video',status:'Confirmed'},
      {id:'APT-1041',patient:'Hassan Ali',doctor:'Dr. Sarah Malik',specialty:'Cardiology',date:date(0),mode:'In-person',status:'Checked in'},
      {id:'APT-1034',patient:'Mariam Noor',doctor:'Dr. Hamza Qureshi',specialty:'Dermatology',date:date(-1),mode:'Video',status:'Completed'},
      {id:'APT-1028',patient:'Usman Tariq',doctor:'Dr. Sarah Malik',specialty:'Cardiology',date:date(-3),mode:'In-person',status:'Completed'},
      {id:'APT-1021',patient:'Hassan Ali',doctor:'Dr. Hamza Qureshi',specialty:'Dermatology',date:date(-5),mode:'Video',status:'Cancelled'},
      {id:'APT-1052',patient:'Usman Tariq',doctor:'Dr. Hira Sheikh',specialty:'Endocrinology',date:date(2),mode:'In-person',status:'Pending'}
    ],
    specialties: ['Cardiology','Dermatology','Endocrinology','ENT','General Medicine'].map((name,i)=>({id:'SP-'+(101+i),name,description:'Consultations and follow-up care in '+name.toLowerCase()+'.',status:'Active'})),
    reviews: [
      {id:'REV-102',patient:'Amina Khan',doctor:'Dr. Sarah Malik',rating:5,text:'Clear explanations and a thoughtful follow-up plan.',status:'Published',note:''},
      {id:'REV-101',patient:'Mariam Noor',doctor:'Dr. Hamza Qureshi',rating:4,text:'Helpful consultation. The waiting time could improve.',status:'Flagged',note:'Reported for review; assess before changing visibility.'},
      {id:'REV-099',patient:'Usman Tariq',doctor:'Dr. Sarah Malik',rating:5,text:'The appointment started on time and answered my questions.',status:'Published',note:''}
    ],
    payments: [
      {id:'INV-1048',patient:'Amina Khan',appointment:'APT-1048',amount:35,status:'Paid',note:''},
      {id:'INV-1041',patient:'Hassan Ali',appointment:'APT-1041',amount:35,status:'Paid',note:''},
      {id:'INV-1034',patient:'Mariam Noor',appointment:'APT-1034',amount:28,status:'Refund review',note:'Patient requested a review of the consultation charge.'},
      {id:'INV-1052',patient:'Usman Tariq',appointment:'APT-1052',amount:30,status:'Pending',note:''}
    ],
    support: [
      {id:'SUP-482',requester:'Amina Khan',subject:'Appointment reschedule',priority:'Normal',status:'Open',note:'Please help move my appointment to the next available slot.'},
      {id:'SUP-479',requester:'Dr. Hira Sheikh',subject:'Verification document',priority:'High',status:'In progress',note:'Credentials received. License verification remains pending.'},
      {id:'SUP-471',requester:'Hassan Ali',subject:'Invoice clarification',priority:'Normal',status:'Resolved',note:'Invoice line items explained to the patient.'}
    ],
    audit: [{id:'AUD-SEED',time:date(-1),actor:'Medora demo admin',action:'Reviewed clinician credentials',target:'Dr. Sarah Malik',detail:'Synthetic initial activity'}]
  }
}

export function readAdminDemo(storage) {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(ADMIN_DEMO_KEY) || 'null')
    if (saved?.version === 1 && ['users','appointments','specialties','reviews','payments','support','audit'].every(k=>Array.isArray(saved[k]))) return saved
  } catch { /* A blocked or outdated browser store falls back to fresh synthetic data. */ }
  return createAdminDemo()
}

export function updateAdminRecord(state, type, id, changes, now = new Date()) {
  const collection = type === 'doctors' || type === 'patients' ? 'users' : type
  const key = type === 'doctors' ? 'verification' : 'status'
  if (!adminStatuses[type] || !state[collection]?.some(r=>r.id===id)) throw new Error('Unsupported admin record.')
  if (changes[key] && !adminStatuses[type].includes(changes[key])) throw new Error('Invalid status for this section.')
  const before = state[collection].find(r=>r.id===id)
  const after = {...before,...changes,id:before.id,role:before.role}
  const detail = Object.keys(changes).map(k=>k+': '+String(before[k]??'—')+' → '+String(after[k])).join('; ')
  const event = {id:'AUD-'+crypto.randomUUID(),time:now.toISOString(),actor:'Medora demo admin',action:'Updated '+type,target:before.name||id,detail}
  return {...state,[collection]:state[collection].map(r=>r.id===id?after:r),audit:[event,...state.audit]}
}

export function addAdminRecord(state, type, record, now = new Date()) {
  if (!['doctors','specialties'].includes(type)) throw new Error('This section does not support manual records.')
  if (!record.name?.trim()) throw new Error('A name is required.')
  const collection = type === 'doctors' ? 'users' : 'specialties'
  if (type === 'specialties' && state.specialties.some(s=>s.name.toLowerCase()===record.name.trim().toLowerCase())) throw new Error('This specialty already exists.')
  if (type === 'doctors' && state.users.some(s=>s.email?.toLowerCase()===record.email?.trim().toLowerCase())) throw new Error('This email is already in the demo directory.')
  const item = {...record,name:record.name.trim(),id:(type==='doctors'?'USR-':'SP-')+crypto.randomUUID()}
  const event = {id:'AUD-'+crypto.randomUUID(),time:now.toISOString(),actor:'Medora demo admin',action:type==='doctors'?'Added demo clinician':'Created specialty',target:item.name,detail:'Synthetic record created'}
  return {...state,[collection]:[item,...state[collection]],audit:[event,...state.audit]}
}

export const demoMoney = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value)
export const demoDate = value => new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
export function adminCsv(labels, rows) {
  const cell = value => '"'+String(value??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"'
  return [labels,...rows].map(row=>row.map(cell).join(',')).join('\r\n')
}
