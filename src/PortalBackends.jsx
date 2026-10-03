import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CalendarCheck, CheckCircle2, CircleDollarSign, FileHeart, FileText, Inbox,
  MessageCircle, Pill, Plus, RefreshCw, ShieldCheck, Stethoscope, TestTube2, Trash2,
  Upload, UserCog, Users, WalletCards
} from 'lucide-react'
import { useCare } from './CareContext'
import { careDateLabel, careTime } from './careApi'
import {
  adminListAppointments, adminListAudit, adminListInvoices, adminListReviews, adminListSpecialties,
  adminListSupport, adminListUsers, adminModerateReview, adminReviewDoctor, adminUpdateAppointment,
  adminUpdateInvoice, adminUpdateSupport, adminUpdateUser, adminUpsertSpecialty, changePassword,
  createPatientDocument, deleteAvailability, deleteDoctorLab, deleteDoctorPrescription, deleteDoctorRecord,
  deleteInsurance, deletePatientDocument, doctorUpdateAppointment, getAdminDashboard, getDoctorDashboard,
  getDoctorProfile, getPatientDashboard, getPreferences, inviteClinician, listAvailability, listConversations,
  listDoctorAppointments, listDoctorInvoices, listDoctorLabs, listDoctorPatients, listDoctorPrescriptions,
  listDoctorRecords, listDoctorSpecialties, listMessages, listMyDoctors, listNotifications, listPatientInsurance,
  listPatientInvoices, listPatientLabs, listPatientPrescriptions, listPatientRecords, listSpecialties,
  markConversationRead, markNotificationRead, replaceDoctorSpecialties, saveAvailability, saveDoctorLab,
  saveDoctorPrescription, saveDoctorProfile, saveDoctorRecord, savePreferences, saveProfile, sendMessage,
  signedDocumentUrl, signOutOtherSessions, upsertInsurance, uploadMedicalDocument
} from './portalApi'

const money = v => new Intl.NumberFormat('en-PK', { style:'currency', currency:'PKR', maximumFractionDigits:0 }).format(Number(v || 0))
const when = v => v ? `${careDateLabel(v)} · ${careTime(v)}` : '—'
const cap = v => String(v || '').replaceAll('_',' ').replace(/\b\w/g, x => x.toUpperCase())

function Loading({text='Loading live data…'}) { return <div className="notice liveNotice"><RefreshCw size={17}/><p>{text}</p></div> }
function ErrorBox({error}) { return error ? <div className="notice liveNotice" role="alert"><p>{error}</p></div> : null }
function Empty({title='Nothing here yet',text='New activity will appear here.'}) { return <div className="emptyState"><span>—</span><h3>{title}</h3><p>{text}</p></div> }
function Status({value}) { return <span className={`badge ${String(value||'').toLowerCase()}`}>{cap(value)}</span> }
function Metric({icon:Icon,label,value,meta}) { return <div className="metricCard"><div className="metricIcon"><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div> }

function useLoader(loader,deps=[]) {
  const [data,setData]=useState(null), [loading,setLoading]=useState(true), [error,setError]=useState(''), [tick,setTick]=useState(0)
  useEffect(()=>{
    let active=true
    setLoading(true); setError('')
    Promise.resolve().then(loader).then(v=>{if(active)setData(v)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[tick,...deps])
  return {data,loading,error,refresh:()=>setTick(v=>v+1),setData}
}

export function PatientBackendDashboard(){
  const {doctors,profile}=useCare()
  const state=useLoader(getPatientDashboard,[])
  if(state.loading)return <Loading/>
  if(state.error)return <ErrorBox error={state.error}/>
  const d=state.data||{}
  const next=d.next_appointment
  const doctor=doctors.find(x=>x.id===next?.doctor_id)
  return <><div className="welcomeLine"><div><span className="eyebrow">Live patient workspace</span><h2>Welcome, {profile?.full_name||'Patient'}.</h2><p>Your current healthcare data is loaded from Supabase.</p></div><Link className="btn btn-primary" to="/patient/book"><Plus/>Book appointment</Link></div>
    <div className="metricsGrid">
      <Metric icon={CalendarCheck} label="Next appointment" value={next?careDateLabel(next.starts_at):'None scheduled'} meta={next?`${doctor?.name||'Clinician'} · ${careTime(next.starts_at)}`:'Book when you are ready'}/>
      <Metric icon={Pill} label="Active prescriptions" value={String(d.active_prescriptions||0)} meta="Saved clinical prescriptions"/>
      <Metric icon={TestTube2} label="New lab results" value={String(d.new_labs||0)} meta="Awaiting your review"/>
      <Metric icon={MessageCircle} label="Unread messages" value={String(d.unread_messages||0)} meta="From your care team"/>
    </div>
    <div className="dashboardGrid">
      <section className="panel span2"><h2>Upcoming care</h2>{next?<div className="appointmentFeature"><div className="dateTile"><strong>{new Date(next.starts_at).toLocaleDateString('en-PK',{day:'2-digit',timeZone:'Asia/Karachi'})}</strong><span>{new Date(next.starts_at).toLocaleDateString('en-PK',{month:'short',timeZone:'Asia/Karachi'}).toUpperCase()}</span></div><div className="appointmentInfo"><Status value={next.status}/><h3>{next.reason}</h3><p>{doctor?.name||next.clinic_name||'Clinician'}</p><div><span>{careTime(next.starts_at)}</span><span>{next.consultation_mode}</span></div></div><div className="appointmentActions"><Link className="btn btn-secondary" to="/patient/appointments">View appointment</Link></div></div>:<Empty title="No upcoming appointments" text="Your next confirmed visit will appear here."/>}</section>
      <section className="panel"><h2>Account</h2><div className="listRows"><div><span>Role</span><strong>Patient</strong></div><div><span>Status</span><strong>{cap(profile?.status)}</strong></div><div><span>City</span><strong>{profile?.city||'Not set'}</strong></div></div></section>
    </div></>
}

export function PatientBackendWorkspace({type}){
  const {profile,doctors}=useCare()
  if(type==='doctor') return <PatientDoctors doctors={doctors}/>
  if(type==='messages') return <MessagingWorkspace role="patient"/>
  if(type==='records') return <PatientRecords profile={profile}/>
  if(type==='prescriptions') return <PatientPrescriptions/>
  if(type==='labs') return <PatientLabs/>
  if(type==='billing') return <PatientBilling/>
  if(type==='insurance') return <PatientInsurance profile={profile}/>
  if(type==='notifications') return <Notifications/>
  if(type==='profile') return <ProfileSettings profile={profile}/>
  if(type==='settings') return <Preferences userId={profile.id}/>
  if(type==='security') return <SecurityPanel/>
  return <Empty/>
}

function PatientDoctors({doctors}){
  const state=useLoader(()=>listMyDoctors(doctors),[doctors.length])
  if(state.loading)return <Loading text="Loading your care team…"/>
  if(state.error)return <ErrorBox error={state.error}/>
  return <><div className="contentHeader"><div><h2>My doctors</h2><p>Clinicians connected through your appointment history.</p></div><Link className="btn btn-primary" to="/doctors">Find doctors</Link></div>{state.data?.length?<div className="doctorGrid twoCols">{state.data.map(d=><article className="doctorCard" key={d.id}><div className="doctorBody"><h3>{d.name}</h3><p>{d.specialty}</p><small>{d.clinic} · {d.location}</small><div className="doctorFoot"><strong>{money(d.fee)}</strong><Link className="btn btn-secondary" to={`/doctors/${d.id}`}>View profile</Link></div></div></article>)}</div>:<Empty title="No established care team yet" text="Book a clinician and they will appear here."/>}</>
}

function PatientRecords({profile}){
  const state=useLoader(listPatientRecords,[])
  const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const upload=async e=>{e.preventDefault();if(!file||!title.trim())return;setBusy(true);setError('');try{await createPatientDocument({patientId:profile.id,title,summary,file});setTitle('');setSummary('');setFile(null);state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const open=async path=>{try{window.open(await signedDocumentUrl(path),'_blank','noopener,noreferrer')}catch(err){setError(err.message)}}
  const remove=async rec=>{setBusy(true);try{await deletePatientDocument(rec);state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <><div className="contentHeader"><div><h2>Medical records</h2><p>Signed clinical records plus documents you upload yourself.</p></div></div><form className="settingsForm compactLiveForm" onSubmit={upload}><div className="formSection"><h3>Upload a document</h3><div className="formGrid"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120}/></label><label>File<input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} required/></label></div><label>Summary<textarea rows="2" value={summary} onChange={e=>setSummary(e.target.value)} maxLength={1000}/></label><button className="btn btn-primary" disabled={busy}><Upload size={16}/>{busy?'Uploading…':'Upload document'}</button></div></form><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="recordList">{state.data.map(r=><div key={r.id}><span>{careDateLabel(r.occurred_at)}</span><div><strong>{r.title}</strong><small>{cap(r.record_type)} · {r.status}{r.summary?` · ${r.summary}`:''}</small></div><div className="liveActions">{r.document_url&&<button onClick={()=>open(r.document_url)}>Open</button>}{r.doctor_id===null&&<button disabled={busy} onClick={()=>remove(r)}><Trash2 size={15}/></button>}</div></div>)}</div>:<Empty title="No medical records yet"/>}</>
}

function PatientPrescriptions(){
  const state=useLoader(listPatientPrescriptions,[])
  return <><div className="contentHeader"><div><h2>Prescriptions</h2><p>Medication instructions saved by your clinicians.</p></div></div><ErrorBox error={state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="cardGrid">{state.data.map(x=><article className="infoCard" key={x.id}><Pill/><Status value={x.status}/><h3>{x.medication}</h3><p>{x.dose} · {x.frequency}</p><small>{x.duration||'No duration'} · {x.refills} refill(s)</small>{x.instructions&&<p>{x.instructions}</p>}</article>)}</div>:<Empty title="No prescriptions yet"/>}</>
}

function PatientLabs(){
  const state=useLoader(listPatientLabs,[])
  return <><div className="contentHeader"><div><h2>Lab results</h2><p>Results added and reviewed by your clinical team.</p></div></div><ErrorBox error={state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="cardGrid">{state.data.map(x=><article className="infoCard" key={x.id}><TestTube2/><Status value={x.status}/><h3>{x.test_name}</h3><p>{x.laboratory_name||'Laboratory'}</p><small>{careDateLabel(x.resulted_at)}</small><pre className="resultPayload">{JSON.stringify(x.result_payload,null,2)}</pre></article>)}</div>:<Empty title="No lab results yet"/>}</>
}

function PatientBilling(){
  const state=useLoader(listPatientInvoices,[])
  const rows=state.data||[]
  const outstanding=rows.filter(x=>x.status==='pending').reduce((a,b)=>a+Number(b.amount),0)
  const paid=rows.filter(x=>x.status==='paid').reduce((a,b)=>a+Number(b.amount),0)
  return <><div className="contentHeader"><div><h2>Bills & payments</h2><p>Invoice status is stored in the healthcare database. No card data is stored by Medora.</p></div></div><div className="billingGrid"><Metric icon={WalletCards} label="Outstanding" value={money(outstanding)} meta="Pending invoices"/><Metric icon={CheckCircle2} label="Paid" value={money(paid)} meta="Recorded payments"/><div className="panel span2"><h2>Invoices</h2><ErrorBox error={state.error}/>{state.loading?<Loading/>:rows.length?<div className="listRows">{rows.map(x=><div key={x.id}><span>{x.appointment_id?`Appointment ${x.appointment_id.slice(0,8)}`:'Invoice'}</span><strong>{money(x.amount)}</strong><small>{cap(x.status)} · {careDateLabel(x.created_at)}</small></div>)}</div>:<Empty title="No invoices yet"/>}</div></div></>
}

function PatientInsurance({profile}){
  const state=useLoader(listPatientInsurance,[])
  const current=state.data?.[0]
  const [form,setForm]=useState({provider_name:'',policy_number_masked:'',valid_until:'',coverage_payload:'{}',active:true})
  useEffect(()=>{if(current)setForm({...current,coverage_payload:JSON.stringify(current.coverage_payload||{},null,2),valid_until:current.valid_until||''})},[current?.id])
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  const save=async e=>{e.preventDefault();setBusy(true);setError('');try{let coverage;try{coverage=JSON.parse(form.coverage_payload||'{}')}catch{throw new Error('Coverage details must be valid JSON.')}await upsertInsurance({...(form.id?{id:form.id}:{}),patient_id:profile.id,provider_name:form.provider_name,policy_number_masked:form.policy_number_masked,coverage_payload:coverage,valid_until:form.valid_until||null,active:form.active});state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const remove=async()=>{if(!current)return;setBusy(true);try{await deleteInsurance(current.id);setForm({provider_name:'',policy_number_masked:'',valid_until:'',coverage_payload:'{}',active:true});state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <><div className="contentHeader"><div><h2>Insurance</h2><p>Manage coverage information used during appointment administration.</p></div></div><form className="settingsForm" onSubmit={save}><div className="formSection"><div className="formGrid"><label>Provider<input value={form.provider_name} onChange={e=>setForm(v=>({...v,provider_name:e.target.value}))} required/></label><label>Masked policy number<input value={form.policy_number_masked} onChange={e=>setForm(v=>({...v,policy_number_masked:e.target.value}))} placeholder="•••• 4218" required/></label><label>Valid until<input type="date" value={form.valid_until} onChange={e=>setForm(v=>({...v,valid_until:e.target.value}))}/></label><label className="toggleRow"><span><strong>Active coverage</strong></span><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/></label></div><label>Coverage details (JSON)<textarea rows="5" value={form.coverage_payload} onChange={e=>setForm(v=>({...v,coverage_payload:e.target.value}))}/></label><div className="liveActions"><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Save insurance'}</button>{current&&<button type="button" className="btn btn-secondary" disabled={busy} onClick={remove}>Remove</button>}</div></div></form><ErrorBox error={error||state.error}/></>
}

function Notifications(){
  const state=useLoader(listNotifications,[])
  const read=async id=>{try{await markNotificationRead(id);state.refresh()}catch{}}
  return <><div className="contentHeader"><div><h2>Notifications</h2><p>Appointment, prescription, lab and messaging activity.</p></div></div><ErrorBox error={state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="notificationList">{state.data.map(x=><div key={x.id} className={!x.read_at?'unreadLive':''}><span><Bell/></span><div><strong>{x.title}</strong><p>{x.body}</p></div><small>{careDateLabel(x.created_at)}</small>{!x.read_at&&<button onClick={()=>read(x.id)}>Mark read</button>}</div>)}</div>:<Empty title="No notifications yet"/>}</>
}

function ProfileSettings({profile}){
  const [form,setForm]=useState({full_name:profile.full_name||'',phone:profile.phone||'',date_of_birth:profile.date_of_birth||'',gender:profile.gender||'',city:profile.city||'',emergency_contact:profile.emergency_contact||{}})
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const save=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await saveProfile(profile.id,{...form,date_of_birth:form.date_of_birth||null});setMessage('Profile saved to Supabase.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  return <><div className="contentHeader"><div><h2>Profile</h2><p>Your live patient profile and emergency contact.</p></div></div><form className="settingsForm" onSubmit={save}><div className="formSection"><h3>Personal information</h3><div className="formGrid"><label>Full name<input value={form.full_name} onChange={e=>setForm(v=>({...v,full_name:e.target.value}))}/></label><label>Date of birth<input type="date" value={form.date_of_birth||''} onChange={e=>setForm(v=>({...v,date_of_birth:e.target.value}))}/></label><label>Phone<input value={form.phone||''} onChange={e=>setForm(v=>({...v,phone:e.target.value}))}/></label><label>Gender<input value={form.gender||''} onChange={e=>setForm(v=>({...v,gender:e.target.value}))}/></label><label>City<input value={form.city||''} onChange={e=>setForm(v=>({...v,city:e.target.value}))}/></label></div></div><div className="formSection"><h3>Emergency contact</h3><div className="formGrid"><label>Name<input value={form.emergency_contact?.name||''} onChange={e=>setForm(v=>({...v,emergency_contact:{...v.emergency_contact,name:e.target.value}}))}/></label><label>Relationship<input value={form.emergency_contact?.relationship||''} onChange={e=>setForm(v=>({...v,emergency_contact:{...v.emergency_contact,relationship:e.target.value}}))}/></label><label>Phone<input value={form.emergency_contact?.phone||''} onChange={e=>setForm(v=>({...v,emergency_contact:{...v.emergency_contact,phone:e.target.value}}))}/></label></div></div>{message&&<div className="notice"><p>{message}</p></div>}<button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Save changes'}</button></form></>
}

function Preferences({userId}){
  const state=useLoader(()=>getPreferences(userId),[userId])
  const [form,setForm]=useState(null),[message,setMessage]=useState('')
  useEffect(()=>{if(state.data)setForm(state.data)},[state.data])
  if(state.loading||!form)return <Loading/>
  const toggles=[['appointment_reminders','Appointment reminders'],['prescription_reminders','Prescription reminders'],['lab_result_alerts','Lab result alerts'],['message_alerts','Care team messages'],['email_notifications','Email notifications'],['sms_notifications','SMS notifications']]
  const save=async()=>{try{const v=await savePreferences(userId,{appointment_reminders:form.appointment_reminders,prescription_reminders:form.prescription_reminders,lab_result_alerts:form.lab_result_alerts,message_alerts:form.message_alerts,email_notifications:form.email_notifications,sms_notifications:form.sms_notifications,text_size:form.text_size});setForm(v);setMessage('Preferences saved.')}catch(e){setMessage(e.message)}}
  return <div className="settingsForm"><div className="formSection"><h3>Communication preferences</h3>{toggles.map(([key,label])=><label className="toggleRow" key={key}><span><strong>{label}</strong><small>Stored with your account</small></span><input type="checkbox" checked={!!form[key]} onChange={e=>setForm(v=>({...v,[key]:e.target.checked}))}/></label>)}</div><div className="formSection"><h3>Accessibility</h3><label>Text size<select value={form.text_size} onChange={e=>setForm(v=>({...v,text_size:e.target.value}))}><option value="default">Default</option><option value="large">Large</option></select></label></div>{message&&<div className="notice"><p>{message}</p></div>}<button className="btn btn-primary" onClick={save}>Save preferences</button></div>
}

function SecurityPanel(){
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const change=async e=>{e.preventDefault();if(password.length<8)return setMessage('Use at least 8 characters.');if(password!==confirm)return setMessage('Passwords do not match.');setBusy(true);try{await changePassword(password);setPassword('');setConfirm('');setMessage('Password updated.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  const signOthers=async()=>{setBusy(true);try{await signOutOtherSessions();setMessage('Other sessions signed out.')}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  return <div className="settingsForm"><div className="securityHero"><ShieldCheck/><div><h3>Account protection</h3><p>Password changes and session revocation use Supabase Auth.</p></div><span>Live</span></div><form className="formSection" onSubmit={change}><h3>Change password</h3><div className="formGrid"><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8}/></label></div><button className="btn btn-primary" disabled={busy}>Update password</button></form><div className="formSection"><h3>Other sessions</h3><p>Revoke other browser/device sessions while keeping this one active.</p><button className="btn btn-secondary" disabled={busy} onClick={signOthers}>Sign out other sessions</button></div>{message&&<div className="notice"><p>{message}</p></div>}</div>
}

function MessagingWorkspace({role}){
  const {profile,doctors}=useCare()
  const conversations=useLoader(listConversations,[])
  const patients=useLoader(()=>role==='doctor'?listDoctorPatients():Promise.resolve([]),[role])
  const [active,setActive]=useState(''),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{if(!active&&conversations.data?.length)setActive(conversations.data[0].id)},[conversations.data,active])
  const messages=useLoader(()=>active?listMessages(active):Promise.resolve([]),[active])
  useEffect(()=>{if(active&&profile?.id)markConversationRead(active,profile.id).catch(()=>{})},[active,profile?.id,messages.data?.length])
  const personName=c=>role==='patient'?(doctors.find(d=>d.id===c.doctor_id)?.name||'Clinician'):(patients.data?.find(p=>p.id===c.patient_id)?.full_name||'Patient')
  const send=async e=>{e.preventDefault();if(!text.trim()||!active)return;setBusy(true);setError('');try{await sendMessage(active,profile.id,text);setText('');messages.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  if(conversations.loading)return <Loading text="Loading secure conversations…"/>
  return <><div className="contentHeader"><div><h2>Messages</h2><p>Messages are stored under participant-only RLS policies.</p></div></div><ErrorBox error={error||conversations.error||messages.error}/>{conversations.data?.length?<div className="messageShell"><div className="conversationList">{conversations.data.map(c=><button className={active===c.id?'active':''} onClick={()=>setActive(c.id)} key={c.id}><span className="avatarText">{personName(c).split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{personName(c)}</strong><small>{c.appointment_id?`Appointment ${c.appointment_id.slice(0,8)}`:'Secure conversation'}</small></div></button>)}</div><div className="chatPanel"><div className="chatHead"><div><strong>{personName(conversations.data.find(c=>c.id===active)||conversations.data[0])}</strong><small>Encrypted in transit · protected by RLS</small></div></div><div className="chatBody">{messages.loading?<Loading/>:messages.data?.map(m=><div className={`bubble ${m.sender_id===profile.id?'mine':'theirs'}`} key={m.id}>{m.body}<small>{careTime(m.created_at)}</small></div>)}</div><form className="chatInput" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={5000} placeholder="Write a secure message…"/><button disabled={busy||!text.trim()}>Send</button></form></div></div>:<Empty title="No conversations yet" text="A conversation is created automatically when an appointment is booked."/>}</>
}

export function DoctorBackendDashboard(){
  const {profile}=useCare()
  const state=useLoader(getDoctorDashboard,[])
  const appts=useLoader(listDoctorAppointments,[])
  if(state.loading)return <Loading/>
  const d=state.data||{}
  const today=(appts.data||[]).filter(a=>new Date(a.starts_at).toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'})===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Karachi'}))
  return <><div className="welcomeLine"><div><span className="eyebrow">Live clinician workspace</span><h2>Welcome, {profile?.full_name||'Doctor'}.</h2><p>Schedule and clinical activity are loaded from Supabase.</p></div></div><div className="metricsGrid"><Metric icon={CalendarCheck} label="Today" value={String(d.today||0)} meta="Active appointments"/><Metric icon={Inbox} label="Upcoming" value={String(d.upcoming||0)} meta="Future visits"/><Metric icon={Users} label="Patients" value={String(d.patients||0)} meta="Unique patients"/><Metric icon={CircleDollarSign} label="Paid revenue" value={money(d.paid_revenue)} meta="Recorded invoices"/></div><section className="panel"><h2>Today’s schedule</h2>{today.length?<AppointmentRows rows={today} doctorMode/>:<Empty title="No appointments today"/>}</section></>
}

export function DoctorBackendWorkspace({type}){
  const {profile}=useCare()
  if(type==='schedule'||type==='requests') return <DoctorAppointments mode={type}/>
  if(type==='patients') return <DoctorPatients/>
  if(type==='availability') return <DoctorAvailability profile={profile}/>
  if(type==='notes') return <DoctorRecords editor/>
  if(type==='rx') return <DoctorPrescriptions/>
  if(type==='records') return <DoctorRecords labs/>
  if(type==='messages') return <MessagingWorkspace role="doctor"/>
  if(type==='earnings') return <DoctorEarnings/>
  if(type==='doctorprofile') return <DoctorProfile profile={profile}/>
  if(type==='doctorsettings') return <Preferences userId={profile.id}/>
  return <Empty/>
}

function AppointmentRows({rows,doctorMode=false,onUpdate}){
  return <div className="responsiveTable"><div className="tableRow tableHead"><span>Reason</span><span>Date</span><span>Type</span><span>Status</span><span>Actions</span></div>{rows.map(a=><div className="tableRow" key={a.id}><span><strong>{a.reason}</strong><small>{a.id.slice(0,8)}</small></span><span>{when(a.starts_at)}</span><span>{a.consultation_mode}</span><span><Status value={a.status}/></span><span className="liveActions">{doctorMode&&onUpdate&&a.status==='confirmed'&&<button onClick={()=>onUpdate(a,'checked_in')}>Check in</button>}{doctorMode&&onUpdate&&['confirmed','checked_in'].includes(a.status)&&<button onClick={()=>onUpdate(a,'completed')}>Complete</button>}{doctorMode&&onUpdate&&['requested','confirmed'].includes(a.status)&&<button onClick={()=>onUpdate(a,'cancelled')}>Cancel</button>}</span></div>)}</div>
}

function DoctorAppointments({mode}){
  const state=useLoader(listDoctorAppointments,[])
  const [error,setError]=useState(''),[busy,setBusy]=useState('')
  const rows=(state.data||[]).filter(a=>mode==='requests'?a.status==='requested':true)
  const update=async(a,status)=>{setBusy(a.id);setError('');try{await doctorUpdateAppointment(a.id,status,a.doctor_note||null);state.refresh()}catch(e){setError(e.message)}finally{setBusy('')}}
  return <><div className="contentHeader"><div><h2>{mode==='requests'?'Appointment requests':'Appointments'}</h2><p>Update live consultation status. Patients receive a notification.</p></div></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:rows.length?<AppointmentRows rows={rows} doctorMode onUpdate={(a,s)=>!busy&&update(a,s)}/>:<Empty title={mode==='requests'?'No pending requests':'No appointments yet'}/>}</>
}

function DoctorPatients(){
  const state=useLoader(listDoctorPatients,[])
  return <><div className="contentHeader"><div><h2>Patients</h2><p>Only patients with an appointment relationship are visible.</p></div></div><ErrorBox error={state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>Patient</span><span>Contact</span><span>City</span><span>Last appointment</span><span>Status</span></div>{state.data.map(p=><div className="tableRow" key={p.id}><span><strong>{p.full_name||'Patient'}</strong><small>{p.id.slice(0,8)}</small></span><span>{p.phone||'—'}</span><span>{p.city||'—'}</span><span>{p.lastAppointment?when(p.lastAppointment.starts_at):'—'}</span><span><Status value={p.status}/></span></div>)}</div>:<Empty title="No patients yet"/>}</>
}

function DoctorAvailability({profile}){
  const state=useLoader(()=>listAvailability(profile.id),[profile.id])
  const [form,setForm]=useState({day_of_week:1,start_time:'09:00',end_time:'17:00',slot_minutes:30,consultation_mode:'In-person',active:true})
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await saveAvailability({...form,doctor_id:profile.id});state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const remove=async id=>{setBusy(true);try{await deleteAvailability(id);state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  return <><div className="contentHeader"><div><h2>Schedule & availability</h2><p>These working hours generate the live booking slots patients see.</p></div></div><form className="settingsForm compactLiveForm" onSubmit={save}><div className="formGrid"><label>Day<select value={form.day_of_week} onChange={e=>setForm(v=>({...v,day_of_week:Number(e.target.value)}))}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><label>Start<input type="time" value={form.start_time} onChange={e=>setForm(v=>({...v,start_time:e.target.value}))}/></label><label>End<input type="time" value={form.end_time} onChange={e=>setForm(v=>({...v,end_time:e.target.value}))}/></label><label>Slot minutes<input type="number" min="10" max="180" value={form.slot_minutes} onChange={e=>setForm(v=>({...v,slot_minutes:Number(e.target.value)}))}/></label><label>Mode<select value={form.consultation_mode} onChange={e=>setForm(v=>({...v,consultation_mode:e.target.value}))}><option>In-person</option><option>Video</option></select></label><button className="btn btn-primary" disabled={busy}><Plus size={16}/>Add hours</button></div></form><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="listRows">{state.data.map(x=><div key={x.id}><span>{days[x.day_of_week]} · {x.consultation_mode}</span><strong>{x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</strong><small>{x.slot_minutes} min · {x.active?'Active':'Off'}</small><button disabled={busy} onClick={()=>remove(x.id)}><Trash2 size={15}/></button></div>)}</div>:<Empty title="No availability configured"/>}</>
}

function DoctorRecords({editor=false,labs=false}){
  const {profile}=useCare()
  const appointments=useLoader(listDoctorAppointments,[])
  const records=useLoader(listDoctorRecords,[])
  const labState=useLoader(()=>labs?listDoctorLabs():Promise.resolve([]),[labs])
  const [record,setRecord]=useState({appointment_id:'',record_type:'consultation',title:'',summary:'',status:'signed'})
  const [lab,setLab]=useState({patient_id:'',test_name:'',laboratory_name:'',result_payload:'{}',status:'new'})
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  const appt=appointments.data?.find(a=>a.id===record.appointment_id)
  const save=async e=>{e.preventDefault();if(!appt)return;setBusy(true);setError('');try{await saveDoctorRecord({patient_id:appt.patient_id,doctor_id:profile.id,appointment_id:appt.id,record_type:record.record_type,title:record.title,summary:record.summary||null,status:record.status,occurred_at:new Date().toISOString()});setRecord({appointment_id:'',record_type:'consultation',title:'',summary:'',status:'signed'});records.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const saveLab=async e=>{e.preventDefault();setBusy(true);setError('');try{let payload;try{payload=JSON.parse(lab.result_payload||'{}')}catch{throw new Error('Lab result payload must be valid JSON.')}await saveDoctorLab({patient_id:lab.patient_id,reviewing_doctor_id:profile.id,test_name:lab.test_name,laboratory_name:lab.laboratory_name||null,result_payload:payload,status:lab.status,resulted_at:new Date().toISOString(),reviewed_at:lab.status==='reviewed'?new Date().toISOString():null});setLab({patient_id:'',test_name:'',laboratory_name:'',result_payload:'{}',status:'new'});labState.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  const patientOptions=useMemo(()=>{const m=new Map();(appointments.data||[]).forEach(a=>m.set(a.patient_id,a.patient_id));return [...m.keys()]},[appointments.data])
  return <><div className="contentHeader"><div><h2>{editor?'Consultation notes':'Clinical records'}</h2><p>Clinical writes are limited to patients connected to your appointments.</p></div></div>{editor&&<form className="settingsForm compactLiveForm" onSubmit={save}><div className="formGrid"><label>Appointment<select required value={record.appointment_id} onChange={e=>setRecord(v=>({...v,appointment_id:e.target.value}))}><option value="">Choose appointment</option>{appointments.data?.map(a=><option value={a.id} key={a.id}>{when(a.starts_at)} · {a.reason}</option>)}</select></label><label>Type<select value={record.record_type} onChange={e=>setRecord(v=>({...v,record_type:e.target.value}))}><option value="consultation">Consultation</option><option value="diagnosis">Diagnosis</option><option value="procedure">Procedure</option><option value="other">Other</option></select></label><label>Status<select value={record.status} onChange={e=>setRecord(v=>({...v,status:e.target.value}))}><option value="draft">Draft</option><option value="signed">Signed</option></select></label><label>Title<input required value={record.title} onChange={e=>setRecord(v=>({...v,title:e.target.value}))}/></label></div><label>Clinical note<textarea rows="5" value={record.summary} onChange={e=>setRecord(v=>({...v,summary:e.target.value}))}/></label><button className="btn btn-primary" disabled={busy}>Save clinical record</button></form>}{labs&&<form className="settingsForm compactLiveForm" onSubmit={saveLab}><div className="formSection"><h3>Add lab result</h3><div className="formGrid"><label>Patient ID<select required value={lab.patient_id} onChange={e=>setLab(v=>({...v,patient_id:e.target.value}))}><option value="">Choose patient</option>{patientOptions.map(id=><option value={id} key={id}>{id.slice(0,8)}</option>)}</select></label><label>Test name<input required value={lab.test_name} onChange={e=>setLab(v=>({...v,test_name:e.target.value}))}/></label><label>Laboratory<input value={lab.laboratory_name} onChange={e=>setLab(v=>({...v,laboratory_name:e.target.value}))}/></label><label>Status<select value={lab.status} onChange={e=>setLab(v=>({...v,status:e.target.value}))}><option value="new">New</option><option value="reviewed">Reviewed</option></select></label></div><label>Result payload (JSON)<textarea rows="4" value={lab.result_payload} onChange={e=>setLab(v=>({...v,result_payload:e.target.value}))}/></label><button className="btn btn-primary" disabled={busy}>Save lab result</button></div></form>}<ErrorBox error={error||records.error||labState.error}/>{records.loading?<Loading/>:records.data?.length?<div className="recordList">{records.data.map(r=><div key={r.id}><span>{careDateLabel(r.occurred_at)}</span><div><strong>{r.title}</strong><small>{cap(r.record_type)} · {r.status}</small></div>{r.status==='draft'&&<button disabled={busy} onClick={async()=>{try{await deleteDoctorRecord(r.id);records.refresh()}catch(e){setError(e.message)}}}>Delete draft</button>}</div>)}</div>:<Empty title="No clinical records yet"/>}{labs&&labState.data?.length>0&&<div className="cardGrid liveTopGap">{labState.data.map(x=><article className="infoCard" key={x.id}><TestTube2/><Status value={x.status}/><h3>{x.test_name}</h3><p>{x.laboratory_name||'Laboratory'}</p>{x.status==='new'&&<button onClick={async()=>{try{await deleteDoctorLab(x.id);labState.refresh()}catch(e){setError(e.message)}}}>Delete new result</button>}</article>)}</div>}</>
}

function DoctorPrescriptions(){
  const {profile}=useCare()
  const appointments=useLoader(listDoctorAppointments,[])
  const state=useLoader(listDoctorPrescriptions,[])
  const [form,setForm]=useState({appointment_id:'',medication:'',dose:'',frequency:'Once daily',duration:'',instructions:'',refills:0,status:'active'})
  const [error,setError]=useState(''),[busy,setBusy]=useState(false)
  const appt=appointments.data?.find(a=>a.id===form.appointment_id)
  const save=async e=>{e.preventDefault();if(!appt)return;setBusy(true);setError('');try{await saveDoctorPrescription({patient_id:appt.patient_id,doctor_id:profile.id,appointment_id:appt.id,medication:form.medication,dose:form.dose,frequency:form.frequency,duration:form.duration||null,instructions:form.instructions||null,refills:Number(form.refills),status:form.status});setForm({appointment_id:'',medication:'',dose:'',frequency:'Once daily',duration:'',instructions:'',refills:0,status:'active'});state.refresh()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <><div className="contentHeader"><div><h2>Prescriptions</h2><p>Create prescriptions only for patients linked to one of your appointments.</p></div></div><form className="settingsForm compactLiveForm" onSubmit={save}><div className="formGrid"><label>Appointment<select value={form.appointment_id} onChange={e=>setForm(v=>({...v,appointment_id:e.target.value}))} required><option value="">Choose appointment</option>{appointments.data?.map(a=><option value={a.id} key={a.id}>{when(a.starts_at)} · {a.reason}</option>)}</select></label><label>Medication<input required value={form.medication} onChange={e=>setForm(v=>({...v,medication:e.target.value}))}/></label><label>Dose<input required value={form.dose} onChange={e=>setForm(v=>({...v,dose:e.target.value}))}/></label><label>Frequency<input required value={form.frequency} onChange={e=>setForm(v=>({...v,frequency:e.target.value}))}/></label><label>Duration<input value={form.duration} onChange={e=>setForm(v=>({...v,duration:e.target.value}))}/></label><label>Refills<input type="number" min="0" value={form.refills} onChange={e=>setForm(v=>({...v,refills:e.target.value}))}/></label></div><label>Instructions<textarea rows="3" value={form.instructions} onChange={e=>setForm(v=>({...v,instructions:e.target.value}))}/></label><button className="btn btn-primary" disabled={busy}>Sign prescription</button></form><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="cardGrid liveTopGap">{state.data.map(x=><article className="infoCard" key={x.id}><Pill/><Status value={x.status}/><h3>{x.medication}</h3><p>{x.dose} · {x.frequency}</p><small>{x.refills} refill(s)</small>{x.status==='draft'&&<button onClick={async()=>{try{await deleteDoctorPrescription(x.id);state.refresh()}catch(e){setError(e.message)}}}>Delete draft</button>}</article>)}</div>:<Empty title="No prescriptions yet"/>}</>
}

function DoctorEarnings(){
  const state=useLoader(listDoctorInvoices,[])
  const rows=state.data||[], paid=rows.filter(x=>x.status==='paid').reduce((a,b)=>a+Number(b.amount),0), pending=rows.filter(x=>x.status==='pending').reduce((a,b)=>a+Number(b.amount),0)
  return <><div className="contentHeader"><div><h2>Earnings</h2><p>Revenue is derived from recorded appointment invoices.</p></div></div><div className="billingGrid"><Metric icon={CircleDollarSign} label="Paid revenue" value={money(paid)} meta="All recorded paid invoices"/><Metric icon={WalletCards} label="Pending" value={money(pending)} meta="Awaiting payment status"/><Metric icon={CalendarCheck} label="Invoices" value={String(rows.length)} meta="Linked to appointments"/><div className="panel span2">{state.loading?<Loading/>:rows.length?<div className="listRows">{rows.map(x=><div key={x.id}><span>{x.appointment_id?.slice(0,8)||'Invoice'}</span><strong>{money(x.amount)}</strong><small>{cap(x.status)} · {careDateLabel(x.created_at)}</small></div>)}</div>:<Empty title="No invoice activity yet"/>}</div></div></>
}

function DoctorProfile({profile}){
  const doc=useLoader(()=>getDoctorProfile(profile.id),[profile.id])
  const specs=useLoader(listSpecialties,[])
  const selected=useLoader(()=>listDoctorSpecialties(profile.id),[profile.id])
  const [form,setForm]=useState(null),[chosen,setChosen]=useState([]),[message,setMessage]=useState('')
  useEffect(()=>{if(doc.data)setForm(doc.data)},[doc.data])
  useEffect(()=>{if(selected.data)setChosen(selected.data.map(x=>x.specialty_id))},[selected.data])
  if(doc.loading||!form)return <Loading/>
  const save=async e=>{e.preventDefault();try{await Promise.all([saveDoctorProfile(profile.id,{professional_title:form.professional_title,bio:form.bio,qualification:form.qualification,license_number:form.license_number,years_experience:Number(form.years_experience),consultation_fee:Number(form.consultation_fee),clinic_name:form.clinic_name,clinic_address:form.clinic_address,city:form.city,languages:String(form.languagesText||form.languages?.join(', ')||'').split(',').map(x=>x.trim()).filter(Boolean),consultation_modes:form.consultation_modes,accepting_patients:form.accepting_patients}),replaceDoctorSpecialties(profile.id,chosen)]);setMessage('Doctor profile saved. Verification status remains controlled by admins.');doc.refresh();selected.refresh()}catch(err){setMessage(err.message)}}
  return <><div className="contentHeader"><div><h2>Doctor profile</h2><p>Public clinician details, specialties, credentials and consultation settings.</p></div><Status value={form.verification_status}/></div><form className="settingsForm" onSubmit={save}><div className="formSection"><div className="formGrid"><label>Professional title<input value={form.professional_title||''} onChange={e=>setForm(v=>({...v,professional_title:e.target.value}))}/></label><label>Qualification<input value={form.qualification||''} onChange={e=>setForm(v=>({...v,qualification:e.target.value}))}/></label><label>License number<input value={form.license_number||''} onChange={e=>setForm(v=>({...v,license_number:e.target.value}))}/></label><label>Experience (years)<input type="number" min="0" value={form.years_experience} onChange={e=>setForm(v=>({...v,years_experience:e.target.value}))}/></label><label>Consultation fee<input type="number" min="0" value={form.consultation_fee} onChange={e=>setForm(v=>({...v,consultation_fee:e.target.value}))}/></label><label>Clinic name<input value={form.clinic_name||''} onChange={e=>setForm(v=>({...v,clinic_name:e.target.value}))}/></label><label>Clinic address<input value={form.clinic_address||''} onChange={e=>setForm(v=>({...v,clinic_address:e.target.value}))}/></label><label>City<input value={form.city||''} onChange={e=>setForm(v=>({...v,city:e.target.value}))}/></label><label>Languages<input value={form.languagesText??form.languages?.join(', ')??''} onChange={e=>setForm(v=>({...v,languagesText:e.target.value}))}/></label></div><label>Bio<textarea rows="5" value={form.bio||''} onChange={e=>setForm(v=>({...v,bio:e.target.value}))}/></label><div className="modeCards">{['In-person','Video'].map(m=><label key={m} className={form.consultation_modes?.includes(m)?'selected':''}><input type="checkbox" checked={form.consultation_modes?.includes(m)||false} onChange={e=>setForm(v=>({...v,consultation_modes:e.target.checked?[...(v.consultation_modes||[]),m]:(v.consultation_modes||[]).filter(x=>x!==m)}))}/><strong>{m}</strong></label>)}</div><label className="toggleRow"><span><strong>Accepting new patients</strong></span><input type="checkbox" checked={form.accepting_patients} onChange={e=>setForm(v=>({...v,accepting_patients:e.target.checked}))}/></label></div><div className="formSection"><h3>Specialties</h3><div className="liveChipGrid">{specs.data?.map(s=><label className={chosen.includes(s.id)?'active':''} key={s.id}><input type="checkbox" checked={chosen.includes(s.id)} onChange={e=>setChosen(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))}/>{s.name}</label>)}</div></div>{message&&<div className="notice"><p>{message}</p></div>}<button className="btn btn-primary">Save doctor profile</button></form></>
}

export function AdminBackendDashboard(){
  const state=useLoader(getAdminDashboard,[])
  const users=useLoader(adminListUsers,[])
  const support=useLoader(adminListSupport,[])
  const [invite,setInvite]=useState({email:'',fullName:'',role:'doctor'}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const submit=async e=>{e.preventDefault();setBusy(true);setMessage('');try{await inviteClinician(invite);setInvite({email:'',fullName:'',role:'doctor'});setMessage('Invite created. The user must accept the Auth email before signing in.');users.refresh()}catch(err){setMessage(err.message)}finally{setBusy(false)}}
  if(state.loading)return <Loading/>
  const d=state.data||{}
  const pending=(users.data||[]).filter(x=>x.role==='doctor'&&x.doctor_verification==='pending').slice(0,5)
  return <><div className="welcomeLine"><div><span className="eyebrow">Live platform operations</span><h2>Medora control center.</h2><p>Administration actions are checked server-side and written to the audit log.</p></div></div><div className="metricsGrid"><Metric icon={Users} label="Active patients" value={String(d.patients||0)} meta="Live accounts"/><Metric icon={Stethoscope} label="Verified doctors" value={String(d.verified_doctors||0)} meta={`${d.pending_doctors||0} pending`}/><Metric icon={CalendarCheck} label="Appointments" value={String(d.appointments||0)} meta="All-time records"/><Metric icon={CircleDollarSign} label="Paid revenue" value={money(d.paid_revenue)} meta="Recorded invoice status"/></div><div className="dashboardGrid"><section className="panel span2"><h2>Doctor verification queue</h2>{pending.length?<div className="verificationList">{pending.map(x=><div key={x.id}><span className="avatarText">{(x.full_name||'D').split(' ').map(n=>n[0]).slice(0,2).join('')}</span><div><strong>{x.full_name||x.email}</strong><small>{x.email}</small></div><Status value={x.doctor_verification}/><button onClick={async()=>{await adminReviewDoctor(x.id,'verified');users.refresh();state.refresh()}}>Verify</button></div>)}</div>:<Empty title="No doctors awaiting verification"/>}</section><section className="panel"><h2>Open support</h2><div className="supportStats"><strong>{d.open_support||0}</strong><p>tickets open or in progress</p></div></section><section className="panel span2"><h2>Invite clinician or admin</h2><form className="formGrid liveInviteForm" onSubmit={submit}><label>Full name<input value={invite.fullName} onChange={e=>setInvite(v=>({...v,fullName:e.target.value}))} required/></label><label>Email<input type="email" value={invite.email} onChange={e=>setInvite(v=>({...v,email:e.target.value}))} required/></label><label>Role<select value={invite.role} onChange={e=>setInvite(v=>({...v,role:e.target.value}))}><option value="doctor">Doctor</option><option value="admin">Admin</option></select></label><button className="btn btn-primary" disabled={busy}>{busy?'Sending…':'Send secure invite'}</button></form>{message&&<div className="notice"><p>{message}</p></div>}</section></div></>
}

export function AdminBackendWorkspace({type}){
  if(type==='doctors'||type==='patients'||type==='users')return <AdminUsers mode={type}/>
  if(type==='appointments')return <AdminAppointments/>
  if(type==='specialties')return <AdminSpecialties/>
  if(type==='reviews')return <AdminReviews/>
  if(type==='payments')return <AdminPayments/>
  if(type==='analytics')return <AdminAnalytics/>
  if(type==='support')return <AdminSupport/>
  if(type==='audit')return <AdminAudit/>
  return <Empty/>
}

function AdminUsers({mode}){
  const state=useLoader(adminListUsers,[])
  const [error,setError]=useState('')
  const rows=(state.data||[]).filter(x=>mode==='doctors'?x.role==='doctor':mode==='patients'?x.role==='patient':true)
  const update=async(x,role=x.role,status=x.status)=>{setError('');try{await adminUpdateUser(x.id,role,status);state.refresh()}catch(e){setError(e.message)}}
  const verify=async(x,status)=>{setError('');try{await adminReviewDoctor(x.id,status);state.refresh()}catch(e){setError(e.message)}}
  return <><div className="contentHeader"><div><h2>{mode==='doctors'?'Doctors':mode==='patients'?'Patients':'User access'}</h2><p>Roles and account status are updated through admin-only RPCs.</p></div></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:rows.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>User</span><span>Role</span><span>Account</span><span>Verification</span><span>Actions</span></div>{rows.map(x=><div className="tableRow" key={x.id}><span><strong>{x.full_name||'Unnamed user'}</strong><small>{x.email||x.id.slice(0,8)}</small></span><span><select value={x.role} onChange={e=>update(x,e.target.value,x.status)}><option value="patient">Patient</option><option value="doctor">Doctor</option><option value="admin">Admin</option></select></span><span><select value={x.status} onChange={e=>update(x,x.role,e.target.value)}><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select></span><span>{x.role==='doctor'?<Status value={x.doctor_verification}/>:<span>—</span>}</span><span className="liveActions">{x.role==='doctor'&&<><button onClick={()=>verify(x,'verified')}>Verify</button><button onClick={()=>verify(x,'rejected')}>Reject</button></>}</span></div>)}</div>:<Empty title="No matching users"/>}</>
}

function AdminAppointments(){
  const state=useLoader(adminListAppointments,[])
  const users=useLoader(adminListUsers,[])
  const [error,setError]=useState('')
  const name=id=>users.data?.find(x=>x.id===id)?.full_name||id?.slice(0,8)
  const update=async(id,status)=>{try{await adminUpdateAppointment(id,status);state.refresh()}catch(e){setError(e.message)}}
  return <><div className="contentHeader"><div><h2>Appointments</h2><p>Platform-wide appointment operations.</p></div></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>Patient / doctor</span><span>Date</span><span>Reason</span><span>Status</span><span>Manage</span></div>{state.data.map(a=><div className="tableRow" key={a.id}><span><strong>{name(a.patient_id)}</strong><small>{name(a.doctor_id)}</small></span><span>{when(a.starts_at)}</span><span>{a.reason}</span><span><Status value={a.status}/></span><span><select value={a.status} onChange={e=>update(a.id,e.target.value)}>{['requested','confirmed','checked_in','completed','cancelled','no_show'].map(s=><option value={s} key={s}>{cap(s)}</option>)}</select></span></div>)}</div>:<Empty title="No appointments"/>}</>
}

function AdminSpecialties(){
  const state=useLoader(adminListSpecialties,[])
  const [form,setForm]=useState({name:'',slug:'',description:'',icon:'',active:true}),[error,setError]=useState('')
  const save=async e=>{e.preventDefault();try{await adminUpsertSpecialty(form);setForm({name:'',slug:'',description:'',icon:'',active:true});state.refresh()}catch(err){setError(err.message)}}
  const edit=x=>setForm({...x})
  return <><div className="contentHeader"><div><h2>Specialties</h2><p>Create, edit and activate the clinical directory.</p></div></div><form className="settingsForm compactLiveForm" onSubmit={save}><div className="formGrid"><label>Name<input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value,slug:v.id?v.slug:e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}))} required/></label><label>Slug<input value={form.slug} onChange={e=>setForm(v=>({...v,slug:e.target.value}))} required/></label><label>Icon key<input value={form.icon||''} onChange={e=>setForm(v=>({...v,icon:e.target.value}))}/></label><label className="toggleRow"><span><strong>Active</strong></span><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/></label></div><label>Description<textarea rows="2" value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label><button className="btn btn-primary">{form.id?'Update specialty':'Add specialty'}</button></form><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:<div className="listRows liveTopGap">{state.data?.map(x=><div key={x.id}><span>{x.name}</span><strong>{x.slug}</strong><small>{x.active?'Active':'Inactive'}</small><button onClick={()=>edit(x)}>Edit</button></div>)}</div>}</>
}

function AdminReviews(){
  const state=useLoader(adminListReviews,[])
  const users=useLoader(adminListUsers,[])
  const [error,setError]=useState('')
  const name=id=>users.data?.find(x=>x.id===id)?.full_name||id.slice(0,8)
  const update=async(id,status)=>{try{await adminModerateReview(id,status);state.refresh()}catch(e){setError(e.message)}}
  return <><div className="contentHeader"><div><h2>Reviews</h2><p>Moderate patient feedback without changing the rating or text.</p></div></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>Review</span><span>Doctor</span><span>Rating</span><span>Status</span><span>Moderate</span></div>{state.data.map(r=><div className="tableRow" key={r.id}><span><strong>{r.body||'No written review'}</strong><small>{name(r.patient_id)}</small></span><span>{name(r.doctor_id)}</span><span>{r.rating}/5</span><span><Status value={r.status}/></span><span><select value={r.status} onChange={e=>update(r.id,e.target.value)}><option value="published">Published</option><option value="flagged">Flagged</option><option value="hidden">Hidden</option></select></span></div>)}</div>:<Empty title="No reviews yet"/>}</>
}

function AdminPayments(){
  const state=useLoader(adminListInvoices,[])
  const [error,setError]=useState('')
  const update=async(id,status)=>{try{await adminUpdateInvoice(id,status);state.refresh()}catch(e){setError(e.message)}}
  const total=(state.data||[]).filter(x=>x.status==='paid').reduce((a,b)=>a+Number(b.amount),0)
  return <><div className="contentHeader"><div><h2>Payments</h2><p>Manage invoice lifecycle. This records status; it does not store card credentials.</p></div></div><div className="metricsGrid"><Metric icon={WalletCards} label="Paid total" value={money(total)} meta="Recorded invoices"/><Metric icon={FileText} label="Invoices" value={String(state.data?.length||0)} meta="All statuses"/></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>Invoice</span><span>Amount</span><span>Created</span><span>Status</span><span>Update</span></div>{state.data.map(x=><div className="tableRow" key={x.id}><span><strong>{x.id.slice(0,8)}</strong><small>{x.appointment_id?.slice(0,8)}</small></span><span>{money(x.amount)}</span><span>{careDateLabel(x.created_at)}</span><span><Status value={x.status}/></span><span><select value={x.status} onChange={e=>update(x.id,e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option><option value="void">Void</option></select></span></div>)}</div>:<Empty title="No invoices"/>}</>
}

function AdminAnalytics(){
  const dash=useLoader(getAdminDashboard,[])
  const apps=useLoader(adminListAppointments,[])
  const reviews=useLoader(adminListReviews,[])
  const completed=(apps.data||[]).filter(x=>x.status==='completed').length
  const video=(apps.data||[]).filter(x=>x.consultation_mode==='Video').length
  const avg=(reviews.data||[]).length?((reviews.data.reduce((a,b)=>a+Number(b.rating),0))/reviews.data.length).toFixed(2):'—'
  return <><div className="contentHeader"><div><h2>Analytics</h2><p>Live operational counts derived from Supabase records.</p></div></div><div className="analyticsGrid"><Metric icon={Users} label="Active patients" value={String(dash.data?.patients||0)} meta="Current accounts"/><Metric icon={CalendarCheck} label="Completed visits" value={String(completed)} meta="All-time"/><Metric icon={MessageCircle} label="Video share" value={apps.data?.length?`${Math.round(video/apps.data.length*100)}%`:'0%'} meta="of appointments"/><Metric icon={Stethoscope} label="Average review" value={avg} meta={`${reviews.data?.length||0} review(s)`}/><section className="panel span2"><h2>Appointment status mix</h2><div className="progressList">{['requested','confirmed','checked_in','completed','cancelled','no_show'].map(status=>{const count=(apps.data||[]).filter(x=>x.status===status).length;const pct=apps.data?.length?Math.round(count/apps.data.length*100):0;return <div key={status}><span>{cap(status)}</span><div><i style={{width:`${pct}%`}}/></div><strong>{count}</strong></div>})}</div></section></div></>
}

function AdminSupport(){
  const state=useLoader(adminListSupport,[])
  const users=useLoader(adminListUsers,[])
  const [error,setError]=useState('')
  const name=id=>users.data?.find(x=>x.id===id)?.full_name||'Guest'
  const update=async(id,status)=>{try{await adminUpdateSupport(id,status,null);state.refresh()}catch(e){setError(e.message)}}
  return <><div className="contentHeader"><div><h2>Support</h2><p>Track and resolve patient or clinician requests.</p></div></div><ErrorBox error={error||state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="responsiveTable"><div className="tableRow tableHead"><span>Request</span><span>User</span><span>Priority</span><span>Status</span><span>Update</span></div>{state.data.map(x=><div className="tableRow" key={x.id}><span><strong>{x.subject}</strong><small>{x.body}</small></span><span>{x.user_id?name(x.user_id):'Guest'}</span><span>{cap(x.priority)}</span><span><Status value={x.status}/></span><span><select value={x.status} onChange={e=>update(x.id,e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></span></div>)}</div>:<Empty title="No support requests"/>}</>
}

function AdminAudit(){
  const state=useLoader(adminListAudit,[])
  return <><div className="contentHeader"><div><h2>Audit activity</h2><p>Administrative and clinical actions recorded by trusted backend functions.</p></div></div><ErrorBox error={state.error}/>{state.loading?<Loading/>:state.data?.length?<div className="recordList">{state.data.map(x=><div key={x.id}><span>{careDateLabel(x.created_at)}</span><div><strong>{cap(x.action)}</strong><small>{x.entity_type} · {x.entity_id||'—'}</small></div><code>{JSON.stringify(x.metadata)}</code></div>)}</div>:<Empty title="No audit events yet"/>}</>
}
