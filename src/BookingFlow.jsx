import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useCare } from './CareContext'
import { bookAppointment, careDate, careDateLabel, careTime, listSlots } from './careApi'

const money = v => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(v)

export default function BookingFlow() {
  const { doctors, catalogLoading, catalogError, session, profile, authLoading, authError } = useCare()
  const requestedDoctor = new URLSearchParams(useLocation().search).get('doctor')
  const [doctorId, setDoctorId] = useState(requestedDoctor || '')
  const doctor = doctors.find(d => d.id === doctorId) || doctors[0]
  const [step, setStep] = useState(1), [mode, setMode] = useState('In-person')
  const [date, setDate] = useState(careDate(new Date(Date.now() + 86400000)))
  const [slots, setSlots] = useState([]), [slot, setSlot] = useState('')
  const [reason, setReason] = useState(''), [note, setNote] = useState('')
  const [slotLoading, setSlotLoading] = useState(false), [slotsError, setSlotsError] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [booking, setBooking] = useState(null)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (doctor && !doctor.mode.includes(mode)) setMode(doctor.mode[0])
  }, [doctor, mode])
  useEffect(() => {
    let active = true
    setSlot(''); setSlots([]); setSlotsError('')
    if (!doctor || !doctor.mode.includes(mode)) return
    setSlotLoading(true)
    listSlots(doctor.id, date, mode).then(rows => { if (active) setSlots(rows) })
      .catch(e => { if (active) setSlotsError(e.message) })
      .finally(() => { if (active) setSlotLoading(false) })
    return () => { active = false }
  }, [doctor, date, mode, refresh])
  const confirm = async () => {
    if (busy) return
    setError(''); setBusy(true)
    try {
      const id = await bookAppointment({ doctorId: doctor.id, startsAt: slot, mode, reason, note })
      if (!id) throw new Error('The server did not confirm an appointment. Please check your appointments before retrying.')
      setBooking({ id, startsAt: slot })
    } catch (e) {
      setError(e.message || 'Booking failed. Please try again.')
      if (/slot|availability|unavailable/i.test(e.message)) { setStep(3); setRefresh(v => v + 1) }
    } finally { setBusy(false) }
  }
  if (authLoading) return <div className="notice">Loading your booking options…</div>
  if (!session) return <div className="bookingPane"><h2>Sign in to book an appointment</h2><p>Choose a verified doctor and save your appointment securely.</p><Link className="btn btn-primary" to="/login">Sign in</Link></div>
  if (catalogLoading) return <div className="notice">Loading verified doctors…</div>
  if (authError || catalogError) return <div role="alert" className="notice">{authError || catalogError}</div>
  if (!profile || profile.role !== 'patient' || profile.status !== 'active') return <div role="alert" className="notice">An active patient account is required to book.</div>
  if (!doctor) return <div className="bookingPane"><h2>No verified doctors available yet</h2><p>A clinician must be verified and publish availability before you can book.</p></div>
  if (booking) return <div className="successPanel"><span><CheckCircle2/></span><h2>Appointment confirmed.</h2><p>Your visit with {doctor.name} is booked for {careDateLabel(booking.startsAt)} at {careTime(booking.startsAt)} (Pakistan time).</p><div className="confirmationCode" data-testid="appointment-id">{booking.id}</div><Link className="btn btn-primary" to="/patient/appointments">View appointments</Link></div>
  const canContinue = step === 1 ? !!doctor : step === 2 ? reason.trim().length >= 3 && reason.trim().length <= 1000 : !!slot && !slotLoading
  return <div className="bookingLayout"><section><div className="bookingSteps">{['Doctor','Visit','Time','Review'].map((label, i) => <div className={i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''} key={label}><span>{i + 1}</span><small>{label}</small></div>)}</div>
    {error && <div className="notice" role="alert">{error}</div>}
    {step === 1 && <div className="bookingPane"><span className="eyebrow">Step 1 of 4</span><h2>Choose your doctor</h2><div className="selectDoctorList">{doctors.map(d => <button type="button" className={doctor.id === d.id ? 'selected' : ''} onClick={() => setDoctorId(d.id)} key={d.id}>{d.image && <img src={d.image} alt=""/>}<div><strong>{d.name}</strong><small>{d.specialty}</small></div><span>{money(d.fee)}</span></button>)}</div></div>}
    {step === 2 && <div className="bookingPane"><span className="eyebrow">Step 2 of 4</span><h2>How would you like to meet?</h2><div className="modeCards">{doctor.mode.map(m => <button type="button" className={mode === m ? 'selected' : ''} onClick={() => setMode(m)} key={m}><strong>{m}</strong><small>{m === 'In-person' ? doctor.clinic : 'Video consultation'}</small></button>)}</div><label>Reason for visit<textarea rows="4" maxLength={1000} value={reason} onChange={e => setReason(e.target.value)}/></label><label>Additional note (optional)<textarea rows="2" maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></label></div>}
    {step === 3 && <div className="bookingPane"><span className="eyebrow">Step 3 of 4</span><h2>Select a time</h2><label>Appointment date<input type="date" min={careDate()} max={careDate(new Date(Date.now() + 180 * 86400000))} value={date} onChange={e => setDate(e.target.value)}/></label><p>All times are shown in Pakistan time (Asia/Karachi).</p>{slotsError ? <div role="alert" className="notice">{slotsError}<button onClick={() => setRefresh(v => v + 1)}>Retry</button></div> : slotLoading ? <p>Checking live availability…</p> : slots.length ? <div className="slotGrid">{slots.map(s => <button type="button" className={slot === s.starts_at ? 'selected' : ''} key={s.starts_at} onClick={() => setSlot(s.starts_at)}>{careTime(s.starts_at)}</button>)}</div> : <p>No available slots. Choose another date or consultation type.</p>}</div>}
    {step === 4 && <div className="bookingPane"><span className="eyebrow">Step 4 of 4</span><h2>Review appointment</h2><div className="reviewBooking">{doctor.image && <img src={doctor.image} alt=""/>}<div><strong>{doctor.name}</strong><span>{doctor.specialty}</span></div></div><div className="reviewRows"><div><span>Date & time</span><strong>{careDateLabel(slot)} · {careTime(slot)}</strong></div><div><span>Consultation</span><strong>{mode}</strong></div><div><span>Reason</span><strong>{reason}</strong></div><div><span>Consultation fee</span><strong>{money(doctor.fee)}</strong></div></div><div className="notice"><ShieldCheck/><p>The server confirms availability and the current fee before saving your appointment.</p></div></div>}
    <div className="bookingNav"><button className="btn btn-ghost" disabled={step === 1 || busy} onClick={() => setStep(s => s - 1)}>Back</button><button className="btn btn-primary" disabled={!canContinue || busy} onClick={() => step === 4 ? confirm() : setStep(s => s + 1)}>{busy ? 'Confirming…' : step === 4 ? 'Confirm appointment' : 'Continue'}</button></div>
  </section><aside className="bookingAside">{doctor.image && <img src={doctor.image} alt=""/>}<h3>{doctor.name}</h3><p>{doctor.specialty}</p><hr/><strong>{doctor.clinic}</strong><p>{doctor.location}</p><small>Consultation fee</small><h3>{money(doctor.fee)}</h3></aside></div>
}
