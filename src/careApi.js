import { supabase } from './supabase'

export const CARE_TIME_ZONE = 'Asia/Karachi'
export const careDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: CARE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date)
export const careTime = value => new Intl.DateTimeFormat('en-PK', {
  timeZone: CARE_TIME_ZONE, hour: 'numeric', minute: '2-digit'
}).format(new Date(value))
export const careDateLabel = value => new Intl.DateTimeFormat('en-PK', {
  timeZone: CARE_TIME_ZONE, year: 'numeric', month: 'short', day: 'numeric'
}).format(new Date(value))

async function result(request) {
  const { data, error } = await request
  if (error) throw error
  return data
}
export const listDoctors = async () => (await result(supabase.rpc('list_verified_doctors'))).map(d => ({
  ...d, rating: Number(d.rating), next: 'Choose a date to see availability'
}))
export const getProfile = id => result(supabase.from('profiles').select('id,role,status,full_name').eq('id', id).single())
export const listSlots = (doctorId, date, mode) => result(supabase.rpc('get_available_slots', {
  p_doctor_id: doctorId, p_date: date, p_consultation_mode: mode
}))
export async function bookAppointment({ doctorId, startsAt, mode, reason, note }) {
  // IDs, fee, status and duration are decided by the authenticated database RPC.
  return result(supabase.rpc('book_appointment', {
    p_doctor_id: doctorId, p_starts_at: startsAt, p_consultation_mode: mode,
    p_reason: reason.trim(), p_patient_note: note?.trim() || null
  }))
}
export const listAppointments = () => result(supabase.from('appointments').select('*').order('starts_at', { ascending: false }))
export const cancelAppointment = id => result(supabase.rpc('cancel_appointment', { p_appointment_id: id }))

export const rescheduleAppointment = (id, startsAt, mode) => result(supabase.rpc('reschedule_appointment', {
  p_appointment_id: id, p_starts_at: startsAt, p_consultation_mode: mode
}))
export const submitReview = (appointmentId, rating, body = null) => result(supabase.rpc('submit_review', {
  p_appointment_id: appointmentId, p_rating: Number(rating), p_body: body?.trim() || null
}))
