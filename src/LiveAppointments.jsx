import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCare } from './CareContext'
import { appointments as demoAppointmentSeed, doctors as demoDoctors } from './data'
import {
  cancelAppointment, careDate, careDateLabel, careTime, listAppointments, listSlots,
  rescheduleAppointment, submitReview
} from './careApi'

function ReschedulePanel({ appointment, doctor, onDone, onCancel }) {
  const [mode,setMode]=useState(appointment.consultation_mode)
  const [date,setDate]=useState(careDate(new Date(Math.max(Date.now()+86400000,new Date(appointment.starts_at).getTime()))))
  const [slots,setSlots]=useState([]),[slot,setSlot]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    let active=true
    if(!doctor)return
    setLoading(true);setError('');setSlot('')
    listSlots(appointment.doctor_id,date,mode).then(v=>{if(active)setSlots(v)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[appointment.doctor_id,date,mode,doctor])
  const save=async()=>{if(!slot)return;setBusy(true);setError('');try{await rescheduleAppointment(appointment.id,slot,mode);onDone()}catch(e){setError(e.message);setSlot('')}finally{setBusy(false)}}
  if(!doctor)return <div className="notice" role="alert"><p>This clinician is not currently available for rescheduling. Cancel and book another verified clinician if needed.</p><button onClick={onCancel}>Close</button></div>
  return <div className="settingsForm appointmentInlineEditor">
    <div className="formGrid">
      <label>Date<input aria-label="Reschedule date" type="date" min={careDate()} max={careDate(new Date(Date.now()+180*86400000))} value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Consultation<select aria-label="Reschedule mode" value={mode} onChange={e=>setMode(e.target.value)}>{doctor.mode.map(x=><option key={x}>{x}</option>)}</select></label>
    </div>
    {error&&<div className="notice" role="alert"><p>{error}</p></div>}
    {loading?<p>Checking live availability…</p>:slots.length?<div className="slotGrid">{slots.map(s=><button type="button" className={slot===s.starts_at?'selected':''} onClick={()=>setSlot(s.starts_at)} key={s.starts_at}>{careTime(s.starts_at)}</button>)}</div>:<p>No open slots on this date.</p>}
    <div className="bookingNav"><button className="btn btn-ghost" type="button" onClick={onCancel}>Close</button><button className="btn btn-primary" type="button" disabled={!slot||busy} onClick={save}>{busy?'Saving…':'Confirm new time'}</button></div>
  </div>
}

function ReviewPanel({ appointment, onDone, onCancel }) {
  const [rating,setRating]=useState(5),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await submitReview(appointment.id,rating,body);onDone()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <form className="settingsForm appointmentInlineEditor" onSubmit={save}>
    <div className="formGrid"><label>Rating<select aria-label="Review rating" value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(x=><option value={x} key={x}>{x} / 5</option>)}</select></label></div>
    <label>Review<textarea aria-label="Review text" rows="3" maxLength={2000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Share your experience (optional)"/></label>
    {error&&<div className="notice" role="alert"><p>{error}</p></div>}
    <div className="bookingNav"><button className="btn btn-ghost" type="button" onClick={onCancel}>Close</button><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Save review'}</button></div>
  </form>
}

function demoIso(dateLabel,timeLabel){
  const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
  const [mon,dayRaw,year]=dateLabel.replace(',','').split(' ')
  const [clock,period]=timeLabel.split(' ')
  let [hour,minute]=clock.split(':').map(Number)
  if(period==='PM'&&hour!==12)hour+=12
  if(period==='AM'&&hour===12)hour=0
  return new Date(`${year}-${months[mon]}-${String(Number(dayRaw)).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+05:00`).toISOString()
}

function getDemoAppointments(){
  const newlyBooked=JSON.parse(localStorage.getItem('medoraDemoAppointments')||'[]')
  const base=demoAppointmentSeed.map(a=>{
    const starts=demoIso(a.date,a.time)
    const doctor=demoDoctors.find(d=>d.name===a.doctor)
    return {
      id:a.id, doctor_id:doctor?.id, doctor_name:a.doctor, starts_at:starts,
      ends_at:new Date(new Date(starts).getTime()+30*60000).toISOString(),
      consultation_mode:a.type, reason:a.specialty+' consultation', status:a.status.toLowerCase(),
      fee_amount:doctor?.fee||0, clinic_name:a.location, demo:true
    }
  })
  const saved=JSON.parse(localStorage.getItem('medoraDemoAppointmentState')||'[]')
  const map=new Map([...base,...newlyBooked].map(x=>[x.id,x]))
  saved.forEach(x=>map.set(x.id,{...map.get(x.id),...x}))
  return [...map.values()].sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at))
}

function DemoAppointments(){
  const [items,setItems]=useState(()=>getDemoAppointments())
  const [message,setMessage]=useState('')
  const save=next=>{setItems(next);localStorage.setItem('medoraDemoAppointmentState',JSON.stringify(next))}
  const change=(id,patch,text)=>{save(items.map(x=>x.id===id?{...x,...patch}:x));setMessage(text)}
  const cancel=id=>change(id,{status:'cancelled'},'Demo appointment cancelled.')
  const reschedule=id=>{
    const item=items.find(x=>x.id===id)
    if(!item)return
    const start=new Date(item.starts_at).getTime()+86400000
    change(id,{starts_at:new Date(start).toISOString(),ends_at:new Date(start+30*60000).toISOString()},'Demo appointment moved forward by one day.')
  }
  const review=id=>change(id,{demo_reviewed:true},'Demo review saved.')
  return <><div className="contentHeader"><div><h2>Your demo appointments</h2><p>Synthetic visits let you test booking, rescheduling, cancellation and review states without real patient data.</p></div><Link className="btn btn-primary" to="/patient/book">Book demo appointment</Link></div>
    {message&&<div className="notice"><p>{message}</p></div>}
    <div className="notice demoBookingNotice"><p>Preview-only data is stored in this browser and can be changed freely.</p></div>
    <div className="tablePanel"><div className="responsiveTable"><div className="tableRow tableHead"><span>Appointment</span><span>Date</span><span>Type</span><span>Status</span><span>Actions</span></div>{items.map(a=>{
      const future=new Date(a.starts_at)>new Date()
      return <div className="appointmentRowGroup" key={a.id}><div className="tableRow"><span><strong>{a.doctor_name||demoDoctors.find(d=>d.id===a.doctor_id)?.name||a.clinic_name||'Clinician'}</strong><small>{a.id}</small></span><span><strong>{careDateLabel(a.starts_at)}</strong><small>{careTime(a.starts_at)} · Pakistan time</small></span><span>{a.consultation_mode}</span><span><span className={`badge ${a.status}`}>{a.status}</span></span><span className="liveActions">{['requested','confirmed'].includes(a.status)&&future&&<><button onClick={()=>reschedule(a.id)}>Move +1 day</button><button onClick={()=>cancel(a.id)}>Cancel</button></>}{a.status==='completed'&&<button disabled={a.demo_reviewed} onClick={()=>review(a.id)}>{a.demo_reviewed?'Reviewed':'Add review'}</button>}</span></div></div>
    })}</div></div>
  </>
}

export default function LiveAppointments() {
  const { session, profile, authLoading, doctors } = useCare()
  const demoMode=!session&&localStorage.getItem('medoraRole')==='patient'
  const [items,setItems]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[refresh,setRefresh]=useState(0)
  const [rescheduling,setRescheduling]=useState(''),[reviewing,setReviewing]=useState(''),[message,setMessage]=useState('')
  useEffect(()=>{
    let active=true
    if(demoMode){setLoading(false);return}
    if(!session||profile?.role!=='patient'){setLoading(false);return}
    setLoading(true);setError('')
    listAppointments().then(rows=>{if(active)setItems(rows)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[session?.user.id,profile?.role,refresh,demoMode])
  const reload=(text='')=>{setMessage(text);setRescheduling('');setReviewing('');setRefresh(v=>v+1)}
  const cancel=async id=>{setBusy(id);setError('');try{await cancelAppointment(id);reload('Appointment cancelled.')}catch(e){setError(e.message)}finally{setBusy('')}}
  if(demoMode)return <DemoAppointments/>
  if(authLoading)return <p>Loading your account…</p>
  if(!session)return <div className="bookingPane"><h2>Sign in to view live appointments</h2><p>Or open the Patient demo from the sign-in screen to explore synthetic appointment data.</p><Link className="btn btn-primary" to="/login">Sign in</Link></div>
  if(profile?.role!=='patient'||profile.status!=='active')return <p role="alert">An active patient account is required.</p>
  return <><div className="contentHeader"><div><h2>Your appointments</h2><p>Book, reschedule, cancel and review visits saved to your account.</p></div><Link className="btn btn-primary" to="/patient/book">Book appointment</Link></div>
    {message&&<div className="notice"><p>{message}</p></div>}
    {error&&<p className="notice" role="alert">{error}</p>}
    {loading?<p>Loading appointments…</p>:!items.length?<p>No appointments yet.</p>:<div className="tablePanel"><div className="responsiveTable"><div className="tableRow tableHead"><span>Appointment</span><span>Date</span><span>Type</span><span>Status</span><span>Actions</span></div>{items.map(a=>{
      const doctor=doctors.find(d=>d.id===a.doctor_id)
      const future=new Date(a.starts_at)>new Date()
      return <div className="appointmentRowGroup" key={a.id}><div className="tableRow"><span><strong>{doctor?.name||a.clinic_name||'Clinician'}</strong><small>{a.id}</small></span><span><strong>{careDateLabel(a.starts_at)}</strong><small>{careTime(a.starts_at)} · Pakistan time</small></span><span>{a.consultation_mode}</span><span><span className={`badge ${a.status}`}>{a.status}</span></span><span className="liveActions">{['requested','confirmed'].includes(a.status)&&future&&<><button disabled={!!busy} onClick={()=>{setReviewing('');setRescheduling(v=>v===a.id?'':a.id)}}>Reschedule</button><button disabled={!!busy} onClick={()=>cancel(a.id)}>{busy===a.id?'Cancelling…':'Cancel'}</button></>}{a.status==='completed'&&<button onClick={()=>{setRescheduling('');setReviewing(v=>v===a.id?'':a.id)}}>Review</button>}</span></div>
      {rescheduling===a.id&&<ReschedulePanel appointment={a} doctor={doctor} onCancel={()=>setRescheduling('')} onDone={()=>reload('Appointment rescheduled.')}/>}
      {reviewing===a.id&&<ReviewPanel appointment={a} onCancel={()=>setReviewing('')} onDone={()=>reload('Review saved.')}/>}
      </div>
    })}</div></div>}
  </>
}
