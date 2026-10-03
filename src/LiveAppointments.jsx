import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCare } from './CareContext'
import { cancelAppointment, careDateLabel, careTime, listAppointments } from './careApi'

export default function LiveAppointments() {
  const { session, profile, authLoading, doctors } = useCare()
  const [items, setItems] = useState([]), [error, setError] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    if (!session || profile?.role !== 'patient') { setLoading(false); return }
    setLoading(true)
    listAppointments().then(rows => { if (active) setItems(rows) })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session?.user.id, profile?.role, refresh])
  const cancel = async id => {
    setBusy(id); setError('')
    try { await cancelAppointment(id); setRefresh(v => v + 1) }
    catch (e) { setError(e.message) } finally { setBusy('') }
  }
  if (authLoading) return <p>Loading your account…</p>
  if (!session) return <Link className="btn btn-primary" to="/login">Sign in to view appointments</Link>
  if (profile?.role !== 'patient' || profile.status !== 'active') return <p role="alert">An active patient account is required.</p>
  return <><div className="contentHeader"><div><h2>Your appointments</h2><p>Appointments saved to your account.</p></div><Link className="btn btn-primary" to="/patient/book">Book appointment</Link></div>{error && <p className="notice" role="alert">{error}</p>}{loading ? <p>Loading appointments…</p> : !items.length ? <p>No appointments yet.</p> : <div className="tablePanel"><div className="responsiveTable"><div className="tableRow tableHead"><span>Appointment</span><span>Date</span><span>Type</span><span>Status</span><span/></div>{items.map(a => <div className="tableRow" key={a.id}><span><strong>{doctors.find(d => d.id === a.doctor_id)?.name || a.clinic_name || 'Clinician'}</strong><small>{a.id}</small></span><span><strong>{careDateLabel(a.starts_at)}</strong><small>{careTime(a.starts_at)} · Pakistan time</small></span><span>{a.consultation_mode}</span><span><span className={`badge ${a.status}`}>{a.status}</span></span><span>{['requested','confirmed'].includes(a.status) && new Date(a.starts_at) > new Date() && <button disabled={!!busy} onClick={() => cancel(a.id)}>{busy === a.id ? 'Cancelling…' : 'Cancel'}</button>}</span></div>)}</div></div>}</>
}
