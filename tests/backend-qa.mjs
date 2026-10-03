import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

// Disposable QA accounts are supplied on stdin, never committed or logged.
if (process.stdin.isTTY) process.stdin.setRawMode(true)
process.stdout.write('Ready for disposable QA fixture JSON (input hidden).\n')
const config = await new Promise(resolve => {
  let input = ''
  process.stdin.on('data', chunk => {
    input += chunk.toString()
    if (input.includes('\n')) { process.stdin.pause(); resolve(JSON.parse(input.trim())) }
  })
})
const url = 'https://rjiejqtrffdutrmcvaxg.supabase.co'
const key = 'sb_publishable_Iu485kMufL7ABdbWWQ_d0g_hFMY61vb'
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const anon = client(), a = client(), b = client(), doctor = client(), outsider = client()
const checks = [], sessions = []
const ok = (name, fn) => (async () => { await fn(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) })()
const login = async (c, name) => {
  const { data, error } = await c.auth.signInWithPassword({ email: `medora-qa-${config.tag}-${name}@example.invalid`, password: config.password })
  assert.equal(error, null, error?.message); sessions.push(c); return data
}
const success = async request => { const { data, error } = await request; assert.equal(error, null, error?.message); return data }
const rejected = async (request, match) => { const { error } = await request; assert.ok(error, 'Expected rejection'); if (match) assert.match(error.message, match) }
const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10)
const args = (time = '09:00', extra = {}) => ({ p_doctor_id: config.ids.doctor, p_starts_at: `${date}T${time}:00+05:00`, p_consultation_mode: 'In-person', p_reason: 'Synthetic QA consultation', ...extra })
let booking
try {
  await ok('Auth password login and metadata cannot elevate patient role', async () => {
    await Promise.all([login(a,'patient-a'),login(b,'patient-b'),login(doctor,'doctor'),login(outsider,'outsider-doctor')])
    assert.equal((await success(a.from('profiles').select('role').eq('id',config.ids['patient-a']).single())).role,'patient')
  })
  await ok('Public specialties and approved doctor directory load', async () => {
    assert.equal((await success(anon.from('specialties').select('*'))).length,8)
    const rows = await success(anon.rpc('list_verified_doctors')); assert.ok(rows.some(x => x.id === config.ids.doctor))
    assert.ok(rows.every(x => !('phone' in x) && !('date_of_birth' in x)))
  })
  await ok('Anonymous users cannot read private tables or execute booking', async () => {
    for (const table of ['profiles','appointments','medical_records','prescriptions','lab_results','conversations','messages','insurance_profiles','invoices','notifications','support_requests','audit_events']) {
      const {data,error} = await anon.from(table).select('*'); assert.ok(error || data.length === 0, table + ' leaked data')
    }
    await rejected(anon.rpc('book_appointment',args()),/permission denied/i)
  })
  await ok('Profile role/status escalation and identity changes are blocked', async () => {
    await rejected(a.from('profiles').update({role:'admin'}).eq('id',config.ids['patient-a']))
    await rejected(a.from('profiles').update({status:'suspended'}).eq('id',config.ids['patient-a']))
    await success(a.from('profiles').update({full_name:'QA Patient A'}).eq('id',config.ids['patient-a']))
    const rows=await success(a.from('profiles').select('id')); assert.deepEqual(rows.map(x=>x.id),[config.ids['patient-a']])
    await rejected(doctor.from('doctor_profiles').update({verification_status:'verified'}).eq('user_id',config.ids.doctor))
  })
  await ok('Booking rejects doctor role, past dates, null date, empty reason, unsupported mode and invalid availability', async () => {
    await rejected(doctor.rpc('book_appointment',args()),/patient role/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_starts_at:'2020-01-01T00:00:00Z'})),/future/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_starts_at:null})),/future/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_reason:' '})),/reason/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_consultation_mode:'Telephone'})),/mode/i)
    await rejected(a.rpc('book_appointment',args('08:00')),/availability/i)
    await rejected(a.rpc('book_appointment',args('09:05')),/availability/i)
    await rejected(a.rpc('book_appointment',args('17:45')),/availability/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_doctor_id:'00000000-0000-0000-0000-000000000000'})),/unavailable/i)
    await rejected(a.rpc('book_appointment',args('09:00',{p_patient_note:'x'.repeat(2001)})),/too long/i)
  })
  await ok('Available slots return actual Karachi-time schedule without private data', async () => {
    const rows=await success(anon.rpc('get_available_slots',{p_doctor_id:config.ids.doctor,p_date:date,p_consultation_mode:'In-person'}))
    assert.equal(rows.length,18); assert.ok(rows.every(x=>Object.keys(x).sort().join(',')==='ends_at,starts_at'))
  })
  await ok('Authenticated RPC persists appointment, database fee, duration and notification', async () => {
    booking=await success(a.rpc('book_appointment',args()))
    assert.match(booking,/^[0-9a-f-]{36}$/)
    const row=await success(a.from('appointments').select('*').eq('id',booking).single())
    assert.equal(row.patient_id,config.ids['patient-a']); assert.equal(row.fee_amount,4500); assert.equal(row.status,'confirmed')
    assert.equal(new Date(row.ends_at)-new Date(row.starts_at),1800000)
    assert.ok((await success(a.from('notifications').select('*'))).length > 0)
  })
  await ok('Other patient and unrelated doctor cannot read another appointment', async () => {
    for (const c of [b,outsider]) assert.equal((await success(c.from('appointments').select('*').eq('id',booking))).length,0)
    assert.equal((await success(doctor.from('appointments').select('*').eq('id',booking))).length,1)
  })
  await ok('Sensitive patient records remain isolated from other patients and unrelated clinicians', async () => {
    for (const table of ['medical_records','prescriptions','lab_results','conversations','messages','insurance_profiles','invoices','notifications','support_requests']) {
      assert.ok((await success(a.from(table).select('*'))).length > 0, table + ' fixture missing')
      assert.equal((await success(b.from(table).select('*'))).length,0,table)
      assert.equal((await success(outsider.from(table).select('*'))).length,0,table)
    }
    assert.equal((await success(a.from('audit_events').select('*'))).length,0)
  })
  await ok('Duplicate booking, fee tampering and direct appointment writes are blocked', async () => {
    await rejected(b.rpc('book_appointment',args()),/no longer available/i)
    await rejected(a.from('appointments').insert({patient_id:config.ids['patient-a'],doctor_id:config.ids.doctor,starts_at:args('11:00').p_starts_at,ends_at:`${date}T11:30:00+05:00`,consultation_mode:'In-person',reason:'Synthetic test',fee_amount:0}))
    await rejected(a.from('appointments').update({fee_amount:0,patient_id:config.ids['patient-b']}).eq('id',booking))
    await rejected(a.rpc('book_appointment',{...args('11:00'),p_fee_amount:0}))
  })
  await ok('Simultaneous clients can reserve a slot only once', async () => {
    const responses=await Promise.all([a.rpc('book_appointment',args('10:00')),b.rpc('book_appointment',args('10:00'))])
    assert.equal(responses.filter(x=>!x.error).length,1); assert.equal(responses.filter(x=>x.error).length,1)
    assert.match(responses.find(x=>x.error).error.message,/no longer available/i)
  })
  await ok('Occupied slots are removed from public availability', async () => {
    const rows=await success(anon.rpc('get_available_slots',{p_doctor_id:config.ids.doctor,p_date:date,p_consultation_mode:'In-person'}))
    assert.equal(rows.length,16)
  })
  await ok('Cancellation rejects another patient and releases the owner slot', async () => {
    await rejected(b.rpc('cancel_appointment',{p_appointment_id:booking}),/cannot be cancelled/i)
    assert.equal(await success(a.rpc('cancel_appointment',{p_appointment_id:booking})),booking)
    const row=await success(a.from('appointments').select('status').eq('id',booking).single()); assert.equal(row.status,'cancelled')
    await rejected(a.rpc('cancel_appointment',{p_appointment_id:booking}),/cannot be cancelled/i)
    const rows=await success(anon.rpc('get_available_slots',{p_doctor_id:config.ids.doctor,p_date:date,p_consultation_mode:'In-person'})); assert.equal(rows.length,17)
  })
  await ok('Unrelated clinicians cannot create records or conversations; forged reviews are rejected', async () => {
    await rejected(outsider.from('medical_records').insert({patient_id:config.ids['patient-a'],doctor_id:config.ids['outsider-doctor'],record_type:'other',title:'Forged synthetic record'}))
    await rejected(outsider.from('conversations').insert({patient_id:config.ids['patient-a'],doctor_id:config.ids['outsider-doctor']}))
    await rejected(a.from('reviews').insert({patient_id:config.ids['patient-a'],doctor_id:config.ids.doctor,appointment_id:booking,rating:5}))
  })
  const report={project:'Healthcare Appointment System',project_ref:'rjiejqtrffdutrmcvaxg',run_at:new Date().toISOString(),checks}
  fs.mkdirSync('qa',{recursive:true}); fs.writeFileSync('qa/backend-report.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({passed:checks.length,failed:0}))
} catch (error) {
  fs.mkdirSync('qa',{recursive:true}); fs.writeFileSync('qa/backend-report.json',JSON.stringify({run_at:new Date().toISOString(),checks,error:error.message},null,2)+'\n')
  console.error(error.message); process.exitCode=1
} finally {
  await Promise.all(sessions.map(c=>c.auth.signOut({scope:'local'})))
}
