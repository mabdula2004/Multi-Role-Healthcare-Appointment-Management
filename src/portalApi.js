import { supabase } from './supabase'

const result = async request => {
  const { data, error } = await request
  if (error) throw error
  return data
}

export const currentSession = async () => (await supabase.auth.getSession()).data.session

export const getPatientDashboard = () => result(supabase.rpc('patient_dashboard'))
export const getDoctorDashboard = () => result(supabase.rpc('doctor_dashboard'))
export const getAdminDashboard = () => result(supabase.rpc('admin_dashboard'))

export const listPatientRecords = () => result(supabase.from('medical_records').select('*').order('occurred_at', { ascending: false }))
export const listPatientPrescriptions = () => result(supabase.from('prescriptions').select('*').order('prescribed_at', { ascending: false }))
export const listPatientLabs = () => result(supabase.from('lab_results').select('*').order('resulted_at', { ascending: false }))
export const listPatientInvoices = () => result(supabase.from('invoices').select('*').order('created_at', { ascending: false }))
export const listPatientInsurance = () => result(supabase.from('insurance_profiles').select('*').order('created_at', { ascending: false }))
export const listNotifications = () => result(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100))
export const markNotificationRead = id => result(supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).select().single())

export const saveProfile = (id, payload) => result(supabase.from('profiles').update(payload).eq('id', id).select().single())
export async function getPreferences(userId) {
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data) return data
  return result(supabase.from('user_preferences').insert({ user_id: userId }).select().single())
}
export const savePreferences = (userId, payload) => result(
  supabase.from('user_preferences').upsert({ user_id: userId, ...payload }, { onConflict: 'user_id' }).select().single()
)

const cleanName = name => String(name || 'document').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-90)
export async function uploadMedicalDocument(patientId, file) {
  const path = `${patientId}/${crypto.randomUUID()}-${cleanName(file.name)}`
  const { error } = await supabase.storage.from('medical-documents').upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return path
}
export async function createPatientDocument({ patientId, title, summary, file }) {
  const path = await uploadMedicalDocument(patientId, file)
  try {
    return await result(supabase.from('medical_records').insert({
      patient_id: patientId,
      doctor_id: null,
      appointment_id: null,
      record_type: 'document',
      title: title.trim(),
      summary: summary?.trim() || null,
      document_url: path,
      status: 'signed',
      occurred_at: new Date().toISOString()
    }).select().single())
  } catch (error) {
    await supabase.storage.from('medical-documents').remove([path])
    throw error
  }
}
export async function signedDocumentUrl(path) {
  if (!path) return ''
  const { data, error } = await supabase.storage.from('medical-documents').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}
export async function deletePatientDocument(record) {
  await result(supabase.from('medical_records').delete().eq('id', record.id))
  if (record.document_url) await supabase.storage.from('medical-documents').remove([record.document_url])
}

export const upsertInsurance = payload => result(
  payload.id
    ? supabase.from('insurance_profiles').update(payload).eq('id', payload.id).select().single()
    : supabase.from('insurance_profiles').insert(payload).select().single()
)
export const deleteInsurance = id => result(supabase.from('insurance_profiles').delete().eq('id', id))

export const listConversations = () => result(supabase.from('conversations').select('*').order('created_at', { ascending: false }))
export const listMessages = conversationId => result(supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at'))
export const sendMessage = (conversationId, senderId, body) => result(supabase.from('messages').insert({
  conversation_id: conversationId, sender_id: senderId, body: body.trim()
}).select().single())
export const markConversationRead = async (conversationId, userId) => {
  const { error } = await supabase.from('messages').update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).neq('sender_id', userId).is('read_at', null)
  if (error) throw error
}
export const startConversation = appointmentId => result(supabase.rpc('start_conversation', { p_appointment_id: appointmentId }))

export async function listMyDoctors(catalog) {
  const rows = await result(supabase.from('appointments').select('doctor_id').order('starts_at', { ascending: false }))
  const ids = [...new Set(rows.map(x => x.doctor_id))]
  return catalog.filter(d => ids.includes(d.id))
}

export const listDoctorAppointments = () => result(supabase.from('appointments').select('*').order('starts_at', { ascending: true }))
export const doctorUpdateAppointment = (id, status, note = null) => result(supabase.rpc('doctor_update_appointment', {
  p_appointment_id: id, p_status: status, p_doctor_note: note
}))
export async function listDoctorPatients() {
  const appointments = await result(supabase.from('appointments').select('patient_id,starts_at,status,reason').order('starts_at', { ascending: false }))
  const ids = [...new Set(appointments.map(x => x.patient_id))]
  if (!ids.length) return []
  const profiles = await result(supabase.from('profiles').select('id,full_name,phone,date_of_birth,gender,city,avatar_url,status').in('id', ids))
  return profiles.map(p => ({ ...p, lastAppointment: appointments.find(a => a.patient_id === p.id) }))
}
export const listAvailability = userId => result(supabase.from('doctor_availability').select('*').eq('doctor_id', userId).order('day_of_week').order('start_time'))
export const saveAvailability = payload => result(
  payload.id
    ? supabase.from('doctor_availability').update(payload).eq('id', payload.id).select().single()
    : supabase.from('doctor_availability').insert(payload).select().single()
)
export const deleteAvailability = id => result(supabase.from('doctor_availability').delete().eq('id', id))

export const listDoctorRecords = () => result(supabase.from('medical_records').select('*').order('occurred_at', { ascending: false }))
export const saveDoctorRecord = payload => result(
  payload.id
    ? supabase.from('medical_records').update(payload).eq('id', payload.id).select().single()
    : supabase.from('medical_records').insert(payload).select().single()
)
export const deleteDoctorRecord = id => result(supabase.from('medical_records').delete().eq('id', id))

export const listDoctorPrescriptions = () => result(supabase.from('prescriptions').select('*').order('prescribed_at', { ascending: false }))
export const saveDoctorPrescription = payload => result(
  payload.id
    ? supabase.from('prescriptions').update(payload).eq('id', payload.id).select().single()
    : supabase.from('prescriptions').insert(payload).select().single()
)
export const deleteDoctorPrescription = id => result(supabase.from('prescriptions').delete().eq('id', id))

export const listDoctorLabs = () => result(supabase.from('lab_results').select('*').order('resulted_at', { ascending: false }))
export const saveDoctorLab = payload => result(
  payload.id
    ? supabase.from('lab_results').update(payload).eq('id', payload.id).select().single()
    : supabase.from('lab_results').insert(payload).select().single()
)
export const deleteDoctorLab = id => result(supabase.from('lab_results').delete().eq('id', id))

export const getDoctorProfile = userId => result(supabase.from('doctor_profiles').select('*').eq('user_id', userId).single())
export const saveDoctorProfile = (userId, payload) => result(supabase.from('doctor_profiles').update(payload).eq('user_id', userId).select().single())
export const listSpecialties = () => result(supabase.from('specialties').select('*').order('name'))
export const listDoctorSpecialties = userId => result(supabase.from('doctor_specialties').select('doctor_id,specialty_id,is_primary,specialties(id,name,slug)').eq('doctor_id', userId))
export async function replaceDoctorSpecialties(userId, specialtyIds) {
  const { error: deleteError } = await supabase.from('doctor_specialties').delete().eq('doctor_id', userId)
  if (deleteError) throw deleteError
  if (!specialtyIds.length) return []
  return result(supabase.from('doctor_specialties').insert(
    specialtyIds.map((id, i) => ({ doctor_id: userId, specialty_id: id, is_primary: i === 0 }))
  ).select())
}
export const listDoctorInvoices = () => result(supabase.from('invoices').select('*').order('created_at', { ascending: false }))

export const adminListUsers = () => result(supabase.rpc('admin_list_users'))
export const adminUpdateUser = (id, role, status) => result(supabase.rpc('admin_update_user', {
  p_user_id: id, p_role: role, p_status: status
}))
export const adminReviewDoctor = (id, status) => result(supabase.rpc('admin_review_doctor', {
  p_doctor_id: id, p_status: status
}))
export const adminListAppointments = () => result(supabase.from('appointments').select('*').order('starts_at', { ascending: false }))
export const adminUpdateAppointment = (id, status) => result(supabase.rpc('admin_update_appointment', {
  p_appointment_id: id, p_status: status
}))
export const adminListSpecialties = () => result(supabase.from('specialties').select('*').order('name'))
export const adminUpsertSpecialty = payload => result(supabase.rpc('admin_upsert_specialty', {
  p_id: payload.id || null,
  p_slug: payload.slug,
  p_name: payload.name,
  p_description: payload.description || '',
  p_icon: payload.icon || null,
  p_active: payload.active !== false
}))
export const adminListReviews = () => result(supabase.from('reviews').select('*').order('created_at', { ascending: false }))
export const adminModerateReview = (id, status) => result(supabase.rpc('admin_moderate_review', { p_review_id: id, p_status: status }))
export const adminListInvoices = () => result(supabase.from('invoices').select('*').order('created_at', { ascending: false }))
export const adminUpdateInvoice = (id, status) => result(supabase.rpc('admin_update_invoice', { p_invoice_id: id, p_status: status }))
export const adminListSupport = () => result(supabase.from('support_requests').select('*').order('created_at', { ascending: false }))
export const adminUpdateSupport = (id, status, note = null) => result(supabase.rpc('admin_update_support', {
  p_request_id: id, p_status: status, p_resolution_note: note
}))
export const adminListAudit = () => result(supabase.from('audit_events').select('*').order('created_at', { ascending: false }).limit(200))

export async function inviteClinician({ email, fullName, role }) {
  const { data, error } = await supabase.functions.invoke('invite-clinician', {
    body: { email, full_name: fullName, role, redirect_to: window.location.origin + '/login' }
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const createSupportRequest = (userId, subject, body, priority = 'normal') => result(
  supabase.from('support_requests').insert({ user_id: userId || null, subject: subject.trim(), body: body.trim(), priority }).select().single()
)

export const changePassword = async password => {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data
}
export const signOutOtherSessions = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) throw error
}
