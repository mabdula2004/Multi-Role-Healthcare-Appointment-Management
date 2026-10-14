import React, {useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {Activity,Calendar,CheckCircle2,Download,History,LifeBuoy,Plus,Search,ShieldCheck,Star,Stethoscope,Users,X} from 'lucide-react'
import {ADMIN_DEMO_KEY,addAdminRecord,adminCsv,adminStatuses,demoDate,demoMoney,readAdminDemo,updateAdminRecord} from './adminDemoData'

const badgeTone = s => ['Active','Verified','Published','Paid','Resolved','Confirmed'].includes(s)?'confirmed':['Rejected','Suspended','Cancelled','Hidden','Inactive','Refunded'].includes(s)?'cancelled':s==='Completed'?'completed':'pending'
const Badge = ({value}) => <span className={'badge '+badgeTone(value)}>{value}</span>
const Field = ({label,children}) => <label className="demoField"><span>{label}</span>{children}</label>
const Metric = ({icon:Icon,label,value,meta}) => <div className="metricCard"><div className="metricIcon"><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>
const initial = name => name.split(' ').filter(Boolean).slice(-2).map(n=>n[0]).join('')

function Editor({type,record,isNew,specialties,onSave,onClose}) {
  const [draft,setDraft] = useState({...record})
  const [error,setError] = useState('')
  const ref = useRef(null)
  useEffect(()=>{
    const previous=document.activeElement
    ref.current?.querySelector('input,select,textarea,button')?.focus()
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();onClose()}
      if(e.key==='Tab'){
        const elements=[...ref.current.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled)
        const first=elements[0],last=elements.at(-1)
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
      }
    }
    document.addEventListener('keydown',key)
    return ()=>{document.removeEventListener('keydown',key);previous?.focus()}
  },[onClose])
  const change=(key,value)=>setDraft(d=>({...d,[key]:value}))
  const submit=e=>{e.preventDefault();try{onSave(draft)}catch(err){setError(err.message)}}
  const statusKey=type==='doctors'?'verification':'status'
  const title=type==='audit'?'Audit event':isNew?(type==='doctors'?'Add demo clinician':'Add specialty'):(record.name||record.id)+' details'
  return <div className="demoModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <form ref={ref} className="demoModal adminEditor" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" onSubmit={submit}>
      <div className="demoModalHead"><div><small>Synthetic admin workspace</small><h3 id="admin-dialog-title">{title}</h3><p>{type==='audit'?'Read-only activity record.':'Changes are saved only after you confirm.'}</p></div><button type="button" className="iconBtn" aria-label="Close dialog" onClick={onClose}><X/></button></div>
      <div className="demoModalBody">
        {isNew?<>
          <Field label={type==='doctors'?'Full name':'Specialty name'}><input required maxLength={100} value={draft.name||''} onChange={e=>change('name',e.target.value)}/></Field>
          {type==='doctors'?<><Field label="Email"><input type="email" required value={draft.email||''} onChange={e=>change('email',e.target.value)}/></Field><Field label="Specialty"><select value={draft.specialty} onChange={e=>change('specialty',e.target.value)}>{specialties.map(s=><option key={s.id}>{s.name}</option>)}</select></Field><Field label="City"><input required value={draft.city||''} onChange={e=>change('city',e.target.value)}/></Field></>:<Field label="Description"><textarea required maxLength={500} value={draft.description||''} onChange={e=>change('description',e.target.value)}/></Field>}
        </>:<dl className="adminDetails">{Object.entries(record).filter(([k])=>k!=='note'&&k!=='status'&&k!=='verification').map(([key,value])=><div key={key}><dt>{key}</dt><dd>{key==='amount'?demoMoney(value):key==='date'||key==='time'?demoDate(value):String(value)}</dd></div>)}</dl>}
        {type!=='audit'&&!isNew&&<Field label={type==='doctors'?'Verification status':'Status'}><select value={draft[statusKey]} onChange={e=>change(statusKey,e.target.value)}>{adminStatuses[type].map(s=><option key={s}>{s}</option>)}</select></Field>}
        {['reviews','support','payments'].includes(type)&&<Field label={type==='reviews'?'Moderation note':type==='support'?'Support note':'Payment note'}><textarea maxLength={1000} value={draft.note||''} onChange={e=>change('note',e.target.value)}/></Field>}
        {type==='doctors'&&!isNew&&<p className="adminHint">Verification records the credential review. Account access is managed separately in User status.</p>}
        {type==='payments'&&<p className="adminHint">This updates a synthetic invoice. No payment or refund is processed.</p>}
        {error&&<p className="notice" role="alert">{error}</p>}
      </div>
      <div className="demoModalFooter"><button type="button" className="btn btn-secondary" onClick={onClose}>{type==='audit'?'Close inspection':'Cancel'}</button>{type!=='audit'&&<button className="btn btn-primary" type="submit">{isNew?'Create record':'Save changes'}</button>}</div>
    </form>
  </div>
}

function Table({labels,rows,values,onOpen,action='Manage',type}) {
  return <div className="adminTableScroll"><table className="adminDataTable" data-testid={'admin-table-'+type}><thead><tr>{labels.map(l=><th key={l} scope="col">{l}</th>)}<th scope="col">Action</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{values(r).map((v,i)=><td key={i}>{i===labels.length-1?<Badge value={v}/>:v}</td>)}<td><button className="btn btn-ghost" aria-label={action+' '+r.id} onClick={()=>onOpen(r)}>{action}</button></td></tr>)}</tbody></table></div>
}

export function AdminDemoWorkspace({title='Medora control center',subtitle='Monitor access, care operations and platform activity.',type='overview'}) {
  const [data,setData] = useState(()=>readAdminDemo(window.localStorage))
  const [query,setQuery] = useState('')
  const [status,setStatus] = useState('All')
  const [editor,setEditor] = useState(null)
  const [notice,setNotice] = useState('')
  const [storageError,setStorageError] = useState('')
  // Remount for every section: table data, filters and dialogs cannot leak across routes.
  const save=next=>{try{localStorage.setItem(ADMIN_DEMO_KEY,JSON.stringify(next));setStorageError('')}catch{setStorageError('Browser storage is unavailable. Changes will last only while this page is open.')}setData(next)}
  const edit=record=>{setNotice('');setEditor({record,isNew:false})}
  const close=React.useCallback(()=>setEditor(null),[])
  const submit=draft=>{
    if(editor.isNew)save(addAdminRecord(data,type,draft))
    else {
      const key=type==='doctors'?'verification':'status'
      const changes={[key]:draft[key]}
      if(['reviews','support','payments'].includes(type))changes.note=draft.note.trim()
      save(updateAdminRecord(data,type,editor.record.id,changes))
    }
    setEditor(null);setNotice('Demo changes saved to '+title.toLowerCase()+'.')
  }
  const rows=type==='doctors'?data.users.filter(u=>u.role==='Doctor'):type==='patients'?data.users.filter(u=>u.role==='Patient'):data[type]||[]
  const filtered=rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(query.trim().toLowerCase())&&(status==='All'||r[type==='doctors'?'verification':'status']===status))
  const verified=data.users.filter(u=>u.role==='Doctor'&&u.verification==='Verified')
  const pending=data.users.filter(u=>u.role==='Doctor'&&u.verification==='Pending')
  const openTickets=data.support.filter(t=>t.status!=='Resolved')
  const paid=data.payments.filter(p=>p.status==='Paid').reduce((n,p)=>n+p.amount,0)
  const configs={
    appointments:{labels:['Appointment','Patient / doctor','Schedule','Mode','Status'],values:r=>[r.id,r.patient+' · '+r.doctor,demoDate(r.date),r.mode,r.status]},
    payments:{labels:['Invoice','Patient','Appointment','Amount','Status'],values:r=>[r.id,r.patient,r.appointment,demoMoney(r.amount),r.status]},
    users:{labels:['Account','Email','Role','City','Status'],values:r=>[r.name,r.email,r.role,r.city,r.status]}
  }
  const csvConfigs={
    doctors:{labels:['Doctor','Email','Specialty','City','Verification','Account'],values:r=>[r.name,r.email,r.specialty,r.city,r.verification,r.status]},
    patients:{labels:['Patient','Patient ID','City','Age','Status'],values:r=>[r.name,r.id,r.city,r.age,r.status]},
    specialties:{labels:['Specialty','Description','Status'],values:r=>[r.name,r.description,r.status]},
    reviews:{labels:['Review','Patient','Doctor','Rating','Feedback','Status'],values:r=>[r.id,r.patient,r.doctor,r.rating,r.text,r.status]},
    support:{labels:['Ticket','Requester','Subject','Priority','Status','Note'],values:r=>[r.id,r.requester,r.subject,r.priority,r.status,r.note]},
    audit:{labels:['Time','Actor','Action','Target','Details'],values:r=>[r.time,r.actor,r.action,r.target,r.detail]},...configs
  }
  const exportRows=()=>{
    const config=csvConfigs[type]
    const url=URL.createObjectURL(new Blob(['\uFEFF'+adminCsv(config.labels,filtered.map(config.values))],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download='medora-'+type+'-demo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    setNotice(filtered.length+' '+title.toLowerCase()+' records exported.')
  }
  const newRecord=()=>setEditor({isNew:true,record:type==='doctors'?{name:'',email:'',city:'',role:'Doctor',specialty:data.specialties.find(s=>s.status==='Active')?.name||'General Medicine',status:'Pending',verification:'Pending',license:'Awaiting documents'}:{name:'',description:'',status:'Active'}})

  return <section className="adminWorkspace" data-testid={'admin-section-'+type}>
    <div className="contentHeader"><div><span className="eyebrow">{type==='overview'?'Platform operations':'Admin / '+title}</span><h2>{title}</h2><p>{subtitle}</p></div>{['doctors','specialties'].includes(type)&&<button className="btn btn-primary" onClick={newRecord}><Plus size={16}/>{type==='doctors'?'Add clinician':'Add specialty'}</button>}</div>
    {notice&&<div className="notice demoSuccess" role="status"><CheckCircle2 size={18}/><p>{notice}</p></div>}
    {storageError&&<div className="notice" role="alert"><p>{storageError}</p></div>}
    {type==='overview'?<>
      <div className="metricsGrid"><Metric icon={Users} label="Active patients" value={data.users.filter(u=>u.role==='Patient'&&u.status==='Active').length} meta="Synthetic accounts"/><Metric icon={Stethoscope} label="Verified doctors" value={verified.length} meta={pending.length+' awaiting review'}/><Metric icon={Calendar} label="Appointments" value={data.appointments.length} meta="Synthetic booking records"/><Metric icon={LifeBuoy} label="Open support" value={openTickets.length} meta="Open and in progress"/></div>
      <div className="dashboardGrid"><section className="panel span2"><div className="panelTitle"><h3>Doctor verification queue</h3><Link to="/admin/doctors">Manage doctors →</Link></div><div className="verificationList">{pending.map(d=><div key={d.id}><span className="avatarText">{initial(d.name)}</span><div><strong>{d.name}</strong><small>{d.specialty} · {d.city}</small></div><Badge value={d.verification}/></div>)}{!pending.length&&<p>All clinician reviews are complete.</p>}</div></section><section className="panel"><h3>Recorded payments</h3><div className="supportStats"><strong>{demoMoney(paid)}</strong><p>Paid synthetic invoices</p><Link to="/admin/payments">Review payments →</Link></div></section><section className="panel span2"><div className="panelTitle"><h3>Recent administrative activity</h3><Link to="/admin/audit">View audit log →</Link></div><div className="adminActivity">{data.audit.slice(0,4).map(e=><article key={e.id}><History size={18}/><div><strong>{e.action}</strong><p>{e.target}</p><small>{demoDate(e.time)}</small></div></article>)}</div></section><section className="panel"><h3>Support queue</h3>{openTickets.map(t=><div className="adminQueueItem" key={t.id}><strong>{t.subject}</strong><small>{t.requester} · {t.status}</small></div>)}<Link to="/admin/support">Open support →</Link></section></div>
    </>:type==='analytics'?<>
      <div className="metricsGrid"><Metric icon={Calendar} label="Total appointments" value={data.appointments.length} meta="All demo bookings"/><Metric icon={CheckCircle2} label="Completed visits" value={data.appointments.filter(a=>a.status==='Completed').length} meta="Recorded status"/><Metric icon={Activity} label="Video consultations" value={Math.round(data.appointments.filter(a=>a.mode==='Video').length/Math.max(data.appointments.length,1)*100)+'%'} meta="Share of all bookings"/><Metric icon={Star} label="Published review rating" value={(data.reviews.filter(r=>r.status==='Published').reduce((n,r)=>n+r.rating,0)/Math.max(data.reviews.filter(r=>r.status==='Published').length,1)).toFixed(1)} meta="Published reviews only"/></div>
      <div className="twoPane adminCharts"><section className="panel"><h3>Appointments by specialty</h3>{data.specialties.map(s=>{const count=data.appointments.filter(a=>a.specialty===s.name).length;return <div className="progressRow" key={s.id}><div><span>{s.name}</span><b>{count} visits</b></div><i><span style={{width:count/Math.max(data.appointments.length,1)*100+'%'}}/></i></div>})}</section><section className="panel"><h3>Appointment status distribution</h3><div className="adminStatusChart">{adminStatuses.appointments.map(s=>{const count=data.appointments.filter(a=>a.status===s).length;return <div key={s}><span>{s}</span><meter min="0" max={Math.max(data.appointments.length,1)} value={count} aria-label={s+' appointments'}/><strong>{count}</strong></div>})}</div><p className="adminHint">Charts reflect the same records managed in Appointments.</p></section></div>
    </>:<>
      <div className="adminFilters"><div className="searchBox"><Search size={17}/><input aria-label={'Search '+title} value={query} onChange={e=>setQuery(e.target.value)} placeholder={'Search '+title.toLowerCase()+'…'}/></div>{type!=='audit'&&<label className="adminFilterLabel"><span>Status</span><select aria-label={'Filter '+title+' by status'} value={status} onChange={e=>setStatus(e.target.value)}><option>All</option>{adminStatuses[type]?.map(s=><option key={s}>{s}</option>)}</select></label>}<button className="btn btn-secondary" onClick={exportRows} disabled={!filtered.length}><Download size={16}/>Export CSV</button><span className="adminResultCount">{filtered.length} of {rows.length} records</span></div>
      {type==='payments'&&<div className="metricsGrid adminSummary"><Metric icon={CheckCircle2} label="Paid invoices" value={demoMoney(paid)} meta="Recorded demo revenue"/><Metric icon={History} label="Refund review" value={demoMoney(data.payments.filter(p=>p.status==='Refund review').reduce((n,p)=>n+p.amount,0))} meta="Review required"/><Metric icon={Calendar} label="Awaiting payment" value={demoMoney(data.payments.filter(p=>p.status==='Pending').reduce((n,p)=>n+p.amount,0))} meta="Synthetic invoices"/><Metric icon={ShieldCheck} label="Refunded" value={demoMoney(data.payments.filter(p=>p.status==='Refunded').reduce((n,p)=>n+p.amount,0))} meta="No real transactions"/></div>}
      {!filtered.length?<div className="emptyState"><Search/><h3>No matching {title.toLowerCase()}</h3><p>Try another search or clear your status filter.</p><button className="btn btn-secondary" onClick={()=>{setQuery('');setStatus('All')}}>Clear filters</button></div>:configs[type]?<div className="tablePanel"><Table labels={configs[type].labels} rows={filtered} values={configs[type].values} onOpen={edit} type={type}/></div>:type==='doctors'?<div className="enhancedGrid adminCardGrid">{filtered.map(d=><article className="panel careCard" key={d.id}><div className="adminCardTop"><span className="avatarText">{initial(d.name)}</span><Badge value={d.verification}/></div><h3>{d.name}</h3><p>{d.specialty} · {d.city}</p><small>{d.license}</small><small>Account: {d.status}</small><button className="btn btn-secondary" onClick={()=>edit(d)}>Review credentials</button></article>)}</div>:type==='patients'?<div className="enhancedGrid adminCardGrid">{filtered.map(p=><article className="panel patientCard" key={p.id}><div className="adminCardTop"><span className="avatarText">{initial(p.name)}</span><Badge value={p.status}/></div><h3>{p.name}</h3><p>{p.id} · Age {p.age}</p><small>{p.city} · {p.email}</small><div className="adminPatientStats"><strong>{data.appointments.filter(a=>a.patient===p.name).length} appointments</strong><small>{data.support.filter(t=>t.requester===p.name&&t.status!=='Resolved').length} open support requests</small></div><button className="btn btn-secondary" onClick={()=>edit(p)}>View patient</button></article>)}</div>:type==='specialties'?<div className="enhancedGrid adminCardGrid">{filtered.map(s=><article className="panel careCard" key={s.id}><div className="adminCardTop"><Activity/><Badge value={s.status}/></div><h3>{s.name}</h3><p>{s.description}</p><div className="adminPatientStats"><strong>{data.users.filter(u=>u.role==='Doctor'&&u.specialty===s.name).length} clinicians</strong><small>{data.appointments.filter(a=>a.specialty===s.name).length} appointments</small></div><button className="btn btn-secondary" onClick={()=>edit(s)}>Manage specialty</button></article>)}</div>:type==='reviews'?<div className="adminReviewList">{filtered.map(r=><article className="panel" key={r.id}><div className="adminCardTop"><strong>{r.patient} → {r.doctor}</strong><Badge value={r.status}/></div><p className="adminStars" aria-label={r.rating+' out of 5 stars'}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</p><blockquote>{r.text}</blockquote><small>{r.id}{r.note&&' · '+r.note}</small><button className="btn btn-secondary" onClick={()=>edit(r)}>Moderate review</button></article>)}</div>:type==='support'?<div className="adminSupportList">{filtered.map(t=><article className="panel" key={t.id}><LifeBuoy/><div><small>{t.id} · {t.priority} priority</small><h3>{t.subject}</h3><p>{t.requester}</p><small>{t.note}</small></div><Badge value={t.status}/><button className="btn btn-secondary" onClick={()=>edit(t)}>Open ticket</button></article>)}</div>:type==='audit'?<div className="adminActivity panel">{filtered.map(e=><article key={e.id}><History/><div><strong>{e.action}</strong><p>{e.target}</p><small>{e.actor} · {demoDate(e.time)}</small><p>{e.detail}</p></div><button className="btn btn-ghost" onClick={()=>edit(e)}>Inspect</button></article>)}</div>:null}
    </>}
    {editor&&<Editor type={type} record={editor.record} isNew={editor.isNew} specialties={data.specialties.filter(s=>s.status==='Active')} onSave={submit} onClose={close}/>}
  </section>
}
