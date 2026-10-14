import React,{useMemo,useState} from 'react'
import {
  Activity,AlertCircle,ArrowRight,BadgeCheck,Bell,Calendar,Check,CheckCircle2,Clock3,CreditCard,
  Download,FileHeart,FileText,History,LifeBuoy,LockKeyhole,MapPin,MessageCircle,Pill,Plus,Search,
  Settings,ShieldCheck,Star,Stethoscope,TestTube2,Upload,UserRound,Users,WalletCards,X
} from 'lucide-react'

const doctors=[
  {id:'d1',name:'Dr. Sarah Malik',specialty:'Cardiology',city:'Lahore',fee:'Rs 4,500',rating:4.9,initials:'SM'},
  {id:'d2',name:'Dr. Hamza Qureshi',specialty:'Dermatology',city:'Lahore',fee:'Rs 3,200',rating:4.8,initials:'HQ'},
  {id:'d3',name:'Dr. Ayesha Rahman',specialty:'Pediatrics',city:'Karachi',fee:'Rs 3,800',rating:4.9,initials:'AR'},
  {id:'d4',name:'Dr. Bilal Ahmed',specialty:'Orthopedics',city:'Islamabad',fee:'Rs 5,000',rating:4.7,initials:'BA'}
]

const patients=[
  {name:'Amina Khan',id:'PT-1042',age:32,last:'Oct 13',status:'Active'},
  {name:'Hassan Ali',id:'PT-1031',age:51,last:'Oct 14',status:'Active'},
  {name:'Mariam Noor',id:'PT-0998',age:27,last:'Oct 12',status:'Review'},
  {name:'Usman Tariq',id:'PT-0974',age:44,last:'Oct 09',status:'Active'}
]

const cls=(...x)=>x.filter(Boolean).join(' ')
const Btn=({children,variant='primary',className='',...props})=><button className={cls('btn','btn-'+variant,className)} {...props}>{children}</button>
const Status=({children,tone=''})=><span className={cls('badge',tone)}>{children}</span>

function Modal({open,title,subtitle,onClose,children,footer}){
  if(!open)return null
  return <div className="demoModalBackdrop" onMouseDown={onClose}>
    <div className="demoModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="demoModalHead"><div><small>Synthetic interactive demo</small><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div><button className="iconBtn" aria-label="Close dialog" onClick={onClose}><X/></button></div>
      <div className="demoModalBody">{children}</div>
      {footer&&<div className="demoModalFooter">{footer}</div>}
    </div>
  </div>
}

function Notice({text}){return text?<div className="notice demoSuccess"><CheckCircle2 size={18}/><p>{text}</p></div>:null}
function Header({title,subtitle,action}){return <div className="contentHeader"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>}
function Field({label,children}){return <label className="demoField"><span>{label}</span>{children}</label>}
function Metric({label,value,meta}){return <div className="metricCard"><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>}

export function EnhancedPatientWorkspace({title,subtitle,type}){
  const[notice,setNotice]=useState('')
  const[modal,setModal]=useState(null)
  const[active,setActive]=useState(0)
  const[draft,setDraft]=useState('')
  const[messages,setMessages]=useState(['Thank you. I will bring the previous ECG report.'])
  const[records,setRecords]=useState([
    {date:'Sep 18',title:'Dermatology consultation',doctor:'Dr. Hamza Qureshi',type:'Visit note'},
    {date:'Aug 26',title:'Cardiology follow-up',doctor:'Dr. Sarah Malik',type:'Clinical note'},
    {date:'Jul 09',title:'Annual wellness summary',doctor:'Dr. Ayesha Rahman',type:'Summary'}
  ])
  const[notifications,setNotifications]=useState([
    {id:1,title:'Appointment confirmed',text:'Dr. Sarah Malik · Oct 15 at 5:30 PM',read:false},
    {id:2,title:'Lab result reviewed',text:'Lipid panel reviewed by your clinician',read:false},
    {id:3,title:'Prescription reminder',text:'Atorvastatin refill due in 5 days',read:true}
  ])
  const[prefs,setPrefs]=useState({email:true,sms:true,reminders:true,accessibility:false})
  const[insurance,setInsurance]=useState({provider:'Jubilee Health',member:'JH-884210',plan:'Gold Plus'})
  const[profile,setProfile]=useState({name:'Amina Khan',phone:'+92 300 1234567',city:'Lahore',emergency:'Hassan Khan · +92 301 4455667'})
  const send=()=>{if(!draft.trim())return;setMessages(v=>[...v,draft.trim()]);setDraft('');setNotice('Demo message added to the conversation.')}
  const open=(kind,data)=>setModal({kind,data})

  if(type==='doctor')return <><Header title={title} subtitle={subtitle}/><div className="enhancedGrid">{doctors.map(d=><article className="panel careCard" key={d.id}><div className="avatarText">{d.initials}</div><div><Status tone="confirmed"><BadgeCheck size={13}/>Established care</Status><h3>{d.name}</h3><p>{d.specialty} · {d.city}</p><div className="careMeta"><span><Star size={14}/>{d.rating}</span><span>{d.fee}</span></div></div><div className="dualActions"><Btn variant="secondary" onClick={()=>open('doctor',d)}>View profile</Btn><Btn onClick={()=>{setNotice('Booking flow ready for '+d.name+'.');open('book',d)}}>Book again</Btn></div></article>)}</div><Notice text={notice}/><Modal open={modal?.kind==='doctor'} title={modal?.data?.name} subtitle={modal?.data?.specialty} onClose={()=>setModal(null)} footer={<Btn onClick={()=>open('book',modal.data)}>Book appointment</Btn>}><div className="detailGrid"><Metric label="Rating" value={modal?.data?.rating} meta="Verified patient reviews"/><Metric label="Consultation fee" value={modal?.data?.fee} meta="In-person or video"/></div><p>Experienced clinician with verified credentials, follow-up availability and secure messaging support.</p></Modal><Modal open={modal?.kind==='book'} title="Book follow-up" subtitle={modal?.data?.name} onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Demo follow-up request created.');setModal(null)}}>Confirm demo request</Btn>}><Field label="Consultation type"><select defaultValue="Video"><option>Video</option><option>In-person</option></select></Field><Field label="Preferred time"><select defaultValue="Tomorrow · 5:30 PM"><option>Tomorrow · 5:30 PM</option><option>Friday · 11:00 AM</option></select></Field></Modal></>

  if(type==='messages')return <><Header title={title} subtitle={subtitle}/><div className="messageShell"><div className="conversationList">{doctors.map((d,i)=><button key={d.id} className={i===active?'active':''} onClick={()=>setActive(i)}><span className="avatarText">{d.initials}</span><div><strong>{d.name}</strong><small>{i===0?'Your results look stable.':'Follow-up conversation'}</small></div>{i===0&&<span>2</span>}</button>)}</div><div className="chatPanel"><div className="chatHead"><span className="avatarText">{doctors[active].initials}</span><div><strong>{doctors[active].name}</strong><small>Secure care conversation</small></div></div><div className="chatBody"><div className="bubble theirs">Your latest update is noted. Continue the current care plan until review.</div>{messages.map((m,i)=><div className="bubble mine" key={i}>{m}<small>Demo message · not sent</small></div>)}</div><div className="chatInput"><input aria-label="Demo message" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a secure message…"/><button aria-label="Send demo message" onClick={send}><ArrowRight/></button></div></div></div><Notice text={notice}/></>

  if(type==='records')return <><Header title={title} subtitle={subtitle} action={<Btn variant="secondary" onClick={()=>{setRecords(v=>[{date:'Today',title:'Uploaded ECG report',doctor:'Patient upload',type:'Document'},...v]);setNotice('Synthetic medical document added.')}}><Upload size={16}/>Upload document</Btn>}/><div className="recordList">{records.map((r,i)=><article key={i}><div><span>{r.date}</span><h3>{r.title}</h3><p>{r.doctor} · {r.type}</p></div><Btn variant="ghost" onClick={()=>open('record',r)}>Open record</Btn></article>)}</div><Notice text={notice}/><Modal open={modal?.kind==='record'} title={modal?.data?.title} subtitle={modal?.data?.doctor} onClose={()=>setModal(null)} footer={<Btn variant="secondary" onClick={()=>setNotice('Demo record downloaded.') }><Download size={15}/>Download PDF</Btn>}><div className="clinicalNote"><h4>Clinical summary</h4><p>Symptoms reviewed, medications reconciled and follow-up guidance recorded. This content is synthetic portfolio data.</p><h4>Plan</h4><p>Continue current treatment and follow up as scheduled.</p></div></Modal></>

  if(type==='prescriptions'){const meds=[['Atorvastatin 20mg','Once daily','Dr. Sarah Malik','2 refills'],['Amlodipine 5mg','Once daily','Dr. Sarah Malik','1 refill'],['Vitamin D3','Weekly','Dr. Ayesha Rahman','Active']];return <><Header title={title} subtitle={subtitle}/><div className="enhancedGrid">{meds.map((m,i)=><article className="panel" key={m[0]}><div className="featureIcon"><Pill/></div><Status tone="confirmed">Active</Status><h3>{m[0]}</h3><p>{m[1]}</p><small>{m[2]} · {m[3]}</small><Btn variant="secondary" onClick={()=>open('rx',m)}>View details</Btn></article>)}</div><Modal open={modal?.kind==='rx'} title={modal?.data?.[0]} subtitle={modal?.data?.[2]} onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Refill request added to demo queue.');setModal(null)}}>Request refill</Btn>}><div className="detailGrid"><Metric label="Directions" value={modal?.data?.[1]} meta="Follow clinician instructions"/><Metric label="Refills" value={modal?.data?.[3]} meta="Current prescription"/></div><p>Medication details, safety notes and pharmacy instructions are shown here in the full patient workflow.</p></Modal><Notice text={notice}/></>}

  if(type==='labs'){const labs=[['Lipid panel','Reviewed','LDL 102 mg/dL','Oct 12'],['HbA1c','Normal','5.4%','Oct 08'],['CBC','Reviewed','Within reference range','Sep 29']];return <><Header title={title} subtitle={subtitle}/><div className="recordList">{labs.map(l=><article key={l[0]}><div><Status tone="confirmed">{l[1]}</Status><h3>{l[0]}</h3><p>{l[2]} · {l[3]}</p></div><Btn variant="ghost" onClick={()=>open('lab',l)}>View result</Btn></article>)}</div><Modal open={modal?.kind==='lab'} title={modal?.data?.[0]} subtitle={'Resulted '+modal?.data?.[3]} onClose={()=>setModal(null)} footer={<Btn variant="secondary" onClick={()=>setNotice('Lab PDF prepared in demo mode.')}><Download size={15}/>Download report</Btn>}><div className="labResultHero"><TestTube2/><strong>{modal?.data?.[2]}</strong><Status tone="confirmed">{modal?.data?.[1]}</Status></div><p>Your clinician has reviewed this result. Reference values and result history would appear in this panel.</p></Modal><Notice text={notice}/></>}

  if(type==='billing'){const invoices=[['INV-1048','Cardiology consultation','Rs 4,500','Paid'],['INV-1013','Dermatology consultation','Rs 3,200','Paid'],['INV-0994','Lab services','Rs 2,100','Insurance pending']];return <><Header title={title} subtitle={subtitle}/><div className="metricsGrid"><Metric label="Paid this year" value="Rs 18,400" meta="5 settled invoices"/><Metric label="Insurance pending" value="Rs 2,100" meta="1 claim in review"/></div><div className="clinicalTable"><div className="tableRow tableHead"><span>Invoice</span><span>Service</span><span>Amount</span><span>Status</span><span>Action</span></div>{invoices.map(x=><div className="tableRow" key={x[0]}><span><strong>{x[0]}</strong></span><span>{x[1]}</span><span>{x[2]}</span><span><Status tone={x[3]==='Paid'?'confirmed':'pending'}>{x[3]}</Status></span><span><button onClick={()=>open('invoice',x)}>View</button></span></div>)}</div><Modal open={modal?.kind==='invoice'} title={modal?.data?.[0]} subtitle={modal?.data?.[1]} onClose={()=>setModal(null)} footer={<Btn variant="secondary" onClick={()=>setNotice('Receipt downloaded in demo mode.')}><Download size={15}/>Receipt</Btn>}><div className="detailGrid"><Metric label="Amount" value={modal?.data?.[2]} meta="Synthetic invoice"/><Metric label="Status" value={modal?.data?.[3]} meta="No real payment processed"/></div></Modal><Notice text={notice}/></>}

  if(type==='insurance')return <><Header title={title} subtitle={subtitle} action={<Btn onClick={()=>open('insurance',insurance)}>Update insurance</Btn>}/><div className="panel insuranceCard"><ShieldCheck size={28}/><Status tone="confirmed">Coverage active</Status><h3>{insurance.provider}</h3><p>{insurance.plan}</p><div className="detailGrid"><div><small>Member ID</small><strong>{insurance.member}</strong></div><div><small>Verification</small><strong>Verified for demo</strong></div></div></div><Modal open={modal?.kind==='insurance'} title="Update insurance" subtitle="Edit synthetic coverage details" onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setInsurance({...insurance,plan:'Platinum Care'});setNotice('Insurance details updated in demo mode.');setModal(null)}}>Save insurance</Btn>}><Field label="Provider"><input defaultValue={insurance.provider}/></Field><Field label="Member ID"><input defaultValue={insurance.member}/></Field><Field label="Plan"><select defaultValue={insurance.plan}><option>Gold Plus</option><option>Platinum Care</option></select></Field></Modal><Notice text={notice}/></>

  if(type==='notifications')return <><Header title={title} subtitle={subtitle} action={<Btn variant="secondary" onClick={()=>{setNotifications(v=>v.map(n=>({...n,read:true})));setNotice('All demo notifications marked as read.')}}>Mark all read</Btn>}/><div className="notificationList">{notifications.map(n=><button key={n.id} className={cls('notificationCard',!n.read&&'unread')} onClick={()=>setNotifications(v=>v.map(x=>x.id===n.id?{...x,read:true}:x))}><Bell/><div><strong>{n.title}</strong><p>{n.text}</p></div>{!n.read&&<span/>}</button>)}</div><Notice text={notice}/></>

  if(type==='profile')return <><Header title={title} subtitle={subtitle}/><div className="settingsPanel"><div className="profileHero"><span className="avatarText large">AK</span><div><h3>{profile.name}</h3><p>Patient ID PT-1042 · Lahore</p></div></div><div className="formGrid"><Field label="Full name"><input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></Field><Field label="Phone"><input value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></Field><Field label="City"><input value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></Field><Field label="Emergency contact"><input value={profile.emergency} onChange={e=>setProfile({...profile,emergency:e.target.value})}/></Field></div><Btn onClick={()=>setNotice('Profile changes saved in demo mode.')}>Save changes</Btn></div><Notice text={notice}/></>

  if(type==='settings')return <><Header title={title} subtitle={subtitle}/><div className="settingsPanel">{[['email','Email notifications','Appointment and care updates'],['sms','SMS reminders','Time-sensitive appointment reminders'],['reminders','Medication reminders','Scheduled medication nudges'],['accessibility','Large text preference','Use larger interface text']].map(([key,label,sub])=><div className="settingRow" key={key}><div><strong>{label}</strong><small>{sub}</small></div><button className={cls('demoSwitch',prefs[key]&&'on')} onClick={()=>setPrefs({...prefs,[key]:!prefs[key]})}><i/></button></div>)}<Btn onClick={()=>setNotice('Patient preferences saved.')}>Save preferences</Btn></div><Notice text={notice}/></>

  if(type==='security')return <><Header title={title} subtitle={subtitle}/><div className="enhancedGrid"><section className="panel"><LockKeyhole/><h3>Password</h3><p>Last changed 43 days ago.</p><Btn variant="secondary" onClick={()=>open('password')}>Change password</Btn></section><section className="panel"><ShieldCheck/><h3>Active sessions</h3><p>Chrome · Lahore · Current session</p><Btn variant="secondary" onClick={()=>{setNotice('Other demo sessions signed out.')}}>Sign out other sessions</Btn></section></div><Modal open={modal?.kind==='password'} title="Change password" subtitle="Security demo" onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Password changed in demo mode.');setModal(null)}}>Update password</Btn>}><Field label="Current password"><input type="password" defaultValue="password"/></Field><Field label="New password"><input type="password" defaultValue="new-password"/></Field></Modal><Notice text={notice}/></>

  return <Header title={title} subtitle={subtitle}/>
}

export function EnhancedDoctorWorkspace({title,subtitle,type}){
  const[notice,setNotice]=useState('')
  const[modal,setModal]=useState(null)
  const[requests,setRequests]=useState([
    {name:'Nadia Aslam',reason:'Chest discomfort',when:'Tomorrow · 9:00 AM',status:'pending'},
    {name:'Usman Tariq',reason:'Blood pressure review',when:'Mon · 2:30 PM',status:'pending'},
    {name:'Zoya Hassan',reason:'Second opinion',when:'Tue · 11:30 AM',status:'pending'}
  ])
  const[days,setDays]=useState({Mon:true,Tue:true,Wed:true,Thu:true,Fri:true,Sat:false})
  const[notes,setNotes]=useState('Patient reports improved exercise tolerance. No new chest pain. Continue current medication plan.')
  const[rx,setRx]=useState([{drug:'Atorvastatin',dose:'20 mg',frequency:'Once daily'}])
  const[profile,setProfile]=useState({fee:'4500',bio:'Consultant cardiologist focused on preventive and interventional care.',mode:'In-person + Video'})
  const rows=[['Amina Khan','Cardiology follow-up','Oct 15 · 5:30 PM','Confirmed'],['Hassan Ali','Hypertension assessment','Today · 4:15 PM','Checked in'],['Mariam Noor','Lab result review','Today · 7:00 PM','Video']]

  if(type==='schedule')return <><Header title={title} subtitle={subtitle}/><div className="clinicalTable"><div className="tableRow tableHead"><span>Patient</span><span>Reason</span><span>Schedule</span><span>Status</span><span>Action</span></div>{rows.map(r=><div className="tableRow" key={r[0]}><span><strong>{r[0]}</strong><small>PT-{r[0].length*317}</small></span><span>{r[1]}</span><span>{r[2]}</span><span><Status tone="confirmed">{r[3]}</Status></span><span><button onClick={()=>setModal({kind:'appt',data:r})}>Open</button></span></div>)}</div><Modal open={modal?.kind==='appt'} title={modal?.data?.[0]} subtitle={modal?.data?.[1]} onClose={()=>setModal(null)} footer={<><Btn variant="secondary" onClick={()=>setNotice('Patient marked ready for consultation.')}>Check in</Btn><Btn onClick={()=>{setNotice('Consultation workspace opened in demo mode.');setModal(null)}}>Start consultation</Btn></>}><div className="detailGrid"><Metric label="Time" value={modal?.data?.[2]} meta="Local clinic time"/><Metric label="Status" value={modal?.data?.[3]} meta="Synthetic appointment"/></div></Modal><Notice text={notice}/></>

  if(type==='requests')return <><Header title={title} subtitle={subtitle}/><div className="requestGrid">{requests.map(r=><article key={r.name}><span className="avatarText">{r.name.split(' ').map(n=>n[0]).join('')}</span><h3>{r.name}</h3><p>{r.reason}</p><small>{r.when}</small>{r.status==='pending'?<div className="dualActions"><Btn variant="secondary" onClick={()=>{setRequests(v=>v.map(x=>x.name===r.name?{...x,status:'declined'}:x));setNotice(r.name+' declined.')}}>Decline</Btn><Btn onClick={()=>{setRequests(v=>v.map(x=>x.name===r.name?{...x,status:'accepted'}:x));setNotice(r.name+' accepted.')}}>Accept</Btn></div>:<Status tone={r.status==='accepted'?'confirmed':'cancelled'}>{r.status}</Status>}</article>)}</div><Notice text={notice}/></>

  if(type==='patients')return <><Header title={title} subtitle={subtitle} action={<div className="searchBox"><Search/><input placeholder="Search patients"/></div>}/><div className="enhancedGrid">{patients.map(p=><article className="panel patientCard" key={p.id}><div className="avatarText">{p.name.split(' ').map(n=>n[0]).join('')}</div><h3>{p.name}</h3><p>{p.id} · Age {p.age}</p><small>Last activity {p.last}</small><div className="dualActions"><Btn variant="secondary" onClick={()=>setModal({kind:'patient',data:p})}>View chart</Btn><Btn onClick={()=>{setNotice('Secure message draft opened for '+p.name);setModal({kind:'message',data:p})}}>Message</Btn></div></article>)}</div><Modal open={modal?.kind==='patient'} title={modal?.data?.name} subtitle={modal?.data?.id} onClose={()=>setModal(null)}><div className="detailGrid"><Metric label="Age" value={modal?.data?.age} meta="Synthetic profile"/><Metric label="Last activity" value={modal?.data?.last} meta="Clinical activity"/></div><h4>Recent care</h4><p>Cardiology follow-up · BP review · medication reconciliation.</p></Modal><Modal open={modal?.kind==='message'} title={'Message '+(modal?.data?.name||'patient')} onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Demo message added to secure thread.');setModal(null)}}>Send message</Btn>}><Field label="Message"><textarea defaultValue="Hello, I reviewed your latest update. Please continue your current plan."/></Field></Modal><Notice text={notice}/></>

  if(type==='availability')return <><Header title={title} subtitle={subtitle} action={<Btn onClick={()=>setNotice('Availability saved for the demo schedule.')}>Save schedule</Btn>}/><div className="availabilityGrid">{Object.entries(days).map(([d,on])=><article className={cls('panel',!on&&'mutedPanel')} key={d}><div className="settingRow"><div><strong>{d}</strong><small>{on?'09:00 AM – 05:30 PM':'Unavailable'}</small></div><button className={cls('demoSwitch',on&&'on')} onClick={()=>setDays({...days,[d]:!on})}><i/></button></div>{on&&<><Field label="Start"><input type="time" defaultValue="09:00"/></Field><Field label="End"><input type="time" defaultValue="17:30"/></Field><Btn variant="secondary" onClick={()=>setNotice(d+' break added from 1:00–1:30 PM.')}>+ Break</Btn></>}</article>)}</div><Notice text={notice}/></>

  if(type==='notes')return <><Header title={title} subtitle={subtitle}/><div className="twoPane"><div className="panel"><h3>Current consultation</h3><p>Amina Khan · Cardiology follow-up</p><div className="vitalsGrid"><Metric label="BP" value="124/78" meta="mmHg"/><Metric label="Pulse" value="72" meta="bpm"/></div></div><div className="panel"><Field label="Clinical note"><textarea value={notes} onChange={e=>setNotes(e.target.value)}/></Field><div className="dualActions"><Btn variant="secondary" onClick={()=>setNotice('Draft note saved.')}>Save draft</Btn><Btn onClick={()=>setModal({kind:'signnote'})}>Sign note</Btn></div></div></div><Modal open={modal?.kind==='signnote'} title="Sign consultation note" subtitle="This locks the synthetic note" onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Clinical note signed in demo mode.');setModal(null)}}>Confirm signature</Btn>}><p>Signing records the clinician, timestamp and audit event in a real clinical workflow.</p></Modal><Notice text={notice}/></>

  if(type==='rx')return <><Header title={title} subtitle={subtitle} action={<Btn onClick={()=>setRx([...rx,{drug:'Aspirin',dose:'81 mg',frequency:'Once daily'}])}><Plus size={15}/>Add medication</Btn>}/><div className="panel"><div className="clinicalTable"><div className="tableRow tableHead"><span>Medication</span><span>Dose</span><span>Frequency</span><span>Action</span></div>{rx.map((r,i)=><div className="tableRow" key={i}><span><strong>{r.drug}</strong></span><span>{r.dose}</span><span>{r.frequency}</span><span><button onClick={()=>setRx(rx.filter((_,n)=>n!==i))}>Remove</button></span></div>)}</div><Btn onClick={()=>setModal({kind:'signrx'})}>Review & sign prescription</Btn></div><Modal open={modal?.kind==='signrx'} title="Prescription review" subtitle={rx.length+' medication(s)'} onClose={()=>setModal(null)} footer={<Btn onClick={()=>{setNotice('Prescription signed in demo mode.');setModal(null)}}>Sign prescription</Btn>}>{rx.map(r=><div className="reviewLine" key={r.drug}><strong>{r.drug}</strong><span>{r.dose} · {r.frequency}</span></div>)}</Modal><Notice text={notice}/></>

  if(type==='records')return <><Header title={title} subtitle={subtitle}/><div className="recordList">{[['Oct 14','Consultation note','Amina Khan'],['Oct 12','Lab review','Mariam Noor'],['Oct 09','Medication plan','Hassan Ali']].map(r=><article key={r[0]+r[2]}><div><span>{r[0]}</span><h3>{r[1]}</h3><p>{r[2]}</p></div><Btn variant="ghost" onClick={()=>setModal({kind:'record',data:r})}>Open record</Btn></article>)}</div><Modal open={modal?.kind==='record'} title={modal?.data?.[1]} subtitle={modal?.data?.[2]} onClose={()=>setModal(null)}><p>Clinical record content, linked appointment, author and audit history appear here.</p></Modal></>

  if(type==='messages')return <EnhancedPatientWorkspace title={title} subtitle={subtitle} type="messages"/>

  if(type==='earnings')return <><Header title={title} subtitle={subtitle}/><div className="metricsGrid"><Metric label="This month" value="Rs 186,500" meta="+12% from September"/><Metric label="Settled" value="Rs 142,000" meta="31 consultations"/><Metric label="Pending" value="Rs 44,500" meta="9 consultations"/></div><div className="panel"><h3>Weekly revenue</h3><div className="demoBars">{[62,78,54,92,84,69,96].map((v,i)=><i key={i} style={{height:v+'%'}}><span>{['M','T','W','T','F','S','S'][i]}</span></i>)}</div><Btn variant="secondary" onClick={()=>setNotice('Earnings CSV exported in demo mode.')}><Download size={15}/>Export earnings</Btn></div><Notice text={notice}/></>

  if(type==='doctorprofile')return <><Header title={title} subtitle={subtitle}/><div className="twoPane"><div className="panel profilePreview"><span className="avatarText large">SM</span><BadgeCheck/><h3>Dr. Sarah Malik</h3><p>Consultant Cardiologist · Lahore</p><Status tone="confirmed">Verified clinician</Status></div><div className="panel"><Field label="Consultation fee (PKR)"><input value={profile.fee} onChange={e=>setProfile({...profile,fee:e.target.value})}/></Field><Field label="Consultation modes"><input value={profile.mode} onChange={e=>setProfile({...profile,mode:e.target.value})}/></Field><Field label="Professional bio"><textarea value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})}/></Field><Btn onClick={()=>setNotice('Public doctor profile updated in demo mode.')}>Save changes</Btn></div></div><Notice text={notice}/></>

  if(type==='doctorsettings')return <><Header title={title} subtitle={subtitle}/><div className="settingsPanel">{[['New appointment alerts','Receive notifications for requests'],['Daily schedule digest','Morning clinical summary'],['Secure message alerts','Notify for new patient messages'],['Auto-lock clinical workspace','Lock after inactivity']].map((x,i)=><div className="settingRow" key={x[0]}><div><strong>{x[0]}</strong><small>{x[1]}</small></div><button className={cls('demoSwitch',i<3&&'on')} onClick={e=>e.currentTarget.classList.toggle('on')}><i/></button></div>)}<Btn onClick={()=>setNotice('Doctor workspace preferences saved.')}>Save settings</Btn></div><Notice text={notice}/></>

  return <Header title={title} subtitle={subtitle}/>
}

const adminFixtures={
 doctors:[
  ['Dr. Sarah Malik','Cardiology','Lahore','Verified'],['Dr. Hamza Qureshi','Dermatology','Lahore','Verified'],['Dr. Hira Sheikh','Neurology','Karachi','Review'],['Dr. Bilal Ahmed','Orthopedics','Islamabad','Verified']
 ],
 patients:[
  ['Amina Khan','PT-1042','Lahore','Active'],['Hassan Ali','PT-1031','Lahore','Active'],['Mariam Noor','PT-0998','Karachi','Review'],['Usman Tariq','PT-0974','Islamabad','Active']
 ],
 appointments:[
  ['APT-8821','Amina Khan · Dr. Sarah Malik','Oct 15 · 5:30 PM','Confirmed'],['APT-8814','Hassan Ali · Dr. Sarah Malik','Oct 14 · 4:15 PM','Checked in'],['APT-8799','Mariam Noor · Dr. Hamza Qureshi','Oct 14 · 7:00 PM','Video']
 ],
 specialties:[
  ['Cardiology','42 doctors','1,284 appointments','Active'],['Dermatology','31 doctors','918 appointments','Active'],['Pediatrics','28 doctors','807 appointments','Active'],['Neurology','19 doctors','521 appointments','Active']
 ],
 reviews:[
  ['REV-104','Amina Khan → Dr. Sarah Malik','5 stars','Published'],['REV-102','Mariam Noor → Dr. Hamza Qureshi','2 stars','Reported'],['REV-099','Hassan Ali → Dr. Sarah Malik','4 stars','Published']
 ],
 payments:[
  ['INV-1048','Amina Khan','Rs 4,500','Paid'],['INV-1041','Hassan Ali','Rs 4,500','Paid'],['INV-1034','Mariam Noor','Rs 3,200','Refund review']
 ],
 support:[
  ['SUP-482','Amina Khan','Appointment reschedule','Open'],['SUP-479','Dr. Hira Sheikh','Verification document','In progress'],['SUP-471','Hassan Ali','Invoice clarification','Resolved']
 ],
 users:[
  ['USR-1042','Amina Khan','Patient','Active'],['USR-1017','Dr. Sarah Malik','Doctor','Active'],['USR-1008','Dr. Hira Sheikh','Doctor','Review'],['USR-0992','Support Admin','Admin','Active']
 ],
 audit:[
  ['14:12:06','admin@medora.demo','Verified doctor','Dr. Sarah Malik'],['13:58:44','system','Flagged review','REV-102'],['13:31:20','support@medora.demo','Resolved ticket','SUP-471'],['12:49:03','admin@medora.demo','Updated specialty','Cardiology']
 ]
}

export function EnhancedAdminWorkspace({title,subtitle,type}){
  const[rows,setRows]=useState(adminFixtures[type]||[])
  const[query,setQuery]=useState('')
  const[notice,setNotice]=useState('')
  const[modal,setModal]=useState(null)
  const filtered=useMemo(()=>rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())),[rows,query])

  if(type==='analytics')return <><Header title={title} subtitle={subtitle}/><div className="metricsGrid"><Metric label="Active patients" value="12,842" meta="+6.4% this month"/><Metric label="Verified doctors" value="684" meta="23 awaiting review"/><Metric label="Appointments" value="5,931" meta="Last 30 days"/><Metric label="Completion rate" value="92.6%" meta="+1.8%"/></div><div className="twoPane"><div className="panel"><h3>Appointment volume</h3><div className="demoBars">{[45,62,58,76,81,69,94,88,97,90,100,96].map((v,i)=><i key={i} style={{height:v+'%'}}><span>{i+1}</span></i>)}</div></div><div className="panel"><h3>Care mix</h3>{[['Cardiology',34],['Dermatology',24],['Pediatrics',19],['Other',23]].map(x=><div className="progressRow" key={x[0]}><div><span>{x[0]}</span><b>{x[1]}%</b></div><i><span style={{width:x[1]+'%'}}/></i></div>)}</div></div></>

  const labels={
    doctors:['Doctor','Specialty','Location','Verification'],
    patients:['Patient','Patient ID','Location','Status'],
    appointments:['Appointment','Participants','Schedule','Status'],
    specialties:['Specialty','Clinicians','Activity','Status'],
    reviews:['Review','Relationship','Rating','Status'],
    payments:['Invoice','Patient','Amount','Status'],
    support:['Ticket','Requester','Subject','Status'],
    users:['User ID','Account','Role','Status'],
    audit:['Time','Actor','Action','Target']
  }[type]||['Item','Type','Context','Status']

  const add=()=>{
    const templates={
      doctors:['Dr. Demo Clinician','General Medicine','Lahore','Review'],
      patients:['Demo Patient','PT-NEW','Lahore','Active'],
      appointments:['APT-NEW','Demo Patient · Dr. Demo','Tomorrow · 10:00 AM','Pending'],
      specialties:['Demo Specialty','0 doctors','0 appointments','Active'],
      reviews:['REV-NEW','Demo Patient → Dr. Demo','5 stars','Review'],
      payments:['INV-NEW','Demo Patient','Rs 3,500','Pending'],
      support:['SUP-NEW','Demo User','New support request','Open'],
      users:['USR-NEW','Demo User','Patient','Active'],
      audit:['Now','admin@medora.demo','Demo action','Synthetic target']
    }
    const item=templates[type];if(item){setRows(v=>[item,...v]);setNotice('Synthetic '+title.toLowerCase()+' item added.')}
  }
  const toggle=(row)=>{
    if(type==='audit'){setModal({kind:'detail',data:row});return}
    const next=row[3]==='Active'?'Suspended':row[3]==='Verified'?'Review':row[3]==='Paid'?'Refund review':row[3]==='Published'?'Hidden':row[3]==='Resolved'?'Open':'Active'
    setRows(v=>v.map(r=>r===row?[...r.slice(0,3),next]:r));setNotice('Demo status changed to '+next+'.')
  }
  const exportCsv=()=>{setNotice(title+' CSV export prepared in demo mode.')}

  return <><Header title={title} subtitle={subtitle} action={type!=='audit'?<Btn onClick={add}><Plus size={15}/>Add new</Btn>:null}/><div className="tablePanel"><div className="adminToolbar"><div className="searchBox"><Search/><input aria-label={'Search '+title} value={query} onChange={e=>setQuery(e.target.value)} placeholder={'Search '+title.toLowerCase()}/></div><Btn variant="secondary" onClick={exportCsv}><Download size={15}/>Export</Btn></div><div className="responsiveTable"><div className="tableRow tableHead">{labels.map(x=><span key={x}>{x}</span>)}<span>Action</span></div>{filtered.map((r,i)=><div className="tableRow" key={i}>{r.map((x,j)=><span key={j}>{j===0?<strong>{x}</strong>:j===3?<Status tone={String(x).toLowerCase().includes('active')||String(x).toLowerCase().includes('verified')||String(x).toLowerCase().includes('paid')||String(x).toLowerCase().includes('published')||String(x).toLowerCase().includes('resolved')?'confirmed':'pending'}>{x}</Status>:x}</span>)}<span><button onClick={()=>setModal({kind:'manage',data:r,index:i})}>{type==='audit'?'Inspect':'Manage'}</button></span></div>)}</div></div><Notice text={notice}/>
  <Modal open={modal?.kind==='manage'} title={(modal?.data?.[0]||title)+' details'} subtitle={title+' management'} onClose={()=>setModal(null)} footer={<>{type!=='audit'&&<Btn variant="secondary" onClick={()=>{toggle(modal.data);setModal(null)}}>Change status</Btn>}<Btn onClick={()=>{setNotice('Demo '+title.toLowerCase()+' review completed.');setModal(null)}}>{type==='audit'?'Close inspection':'Save review'}</Btn></>}><div className="detailGrid">{labels.map((label,i)=><div key={label}><small>{label}</small><strong>{modal?.data?.[i]}</strong></div>)}</div>{type==='doctors'&&<p>Credential documents, license verification and profile completeness would be reviewed here.</p>}{type==='appointments'&&<p>Admin can review schedule ownership, consultation mode, status history and support flags.</p>}{type==='support'&&<Field label="Internal note"><textarea defaultValue="Reviewed synthetic support request."/></Field>}{type==='reviews'&&<Field label="Moderation note"><textarea defaultValue="Review checked against content guidelines."/></Field>}</Modal></>
}
