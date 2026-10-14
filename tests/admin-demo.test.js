import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ADMIN_DEMO_KEY,addAdminRecord,adminCsv,createAdminDemo,readAdminDemo,updateAdminRecord} from '../src/adminDemoData.js'

test('clinician review and account access remain separate and audit both changes',()=>{
  const before=createAdminDemo()
  const reviewed=updateAdminRecord(before,'doctors','USR-1008',{verification:'Verified'})
  assert.equal(before.users.find(u=>u.id==='USR-1008').verification,'Pending')
  assert.equal(reviewed.users.find(u=>u.id==='USR-1008').status,'Pending')
  assert.equal(reviewed.users.find(u=>u.id==='USR-1008').verification,'Verified')
  const activated=updateAdminRecord(reviewed,'users','USR-1008',{status:'Active'})
  assert.equal(activated.users.find(u=>u.id==='USR-1008').verification,'Verified')
  assert.equal(activated.users.find(u=>u.id==='USR-1008').status,'Active')
  assert.equal(activated.audit.length,before.audit.length+2)
})

test('patient account changes are available to user management after storage round trip',()=>{
  const state=updateAdminRecord(createAdminDemo(),'patients','USR-1042',{status:'Suspended'})
  const store={getItem:key=>key===ADMIN_DEMO_KEY?JSON.stringify(state):null}
  assert.equal(readAdminDemo(store).users.find(u=>u.id==='USR-1042').status,'Suspended')
  assert.equal(readAdminDemo(store).appointments[0].patient,'Amina Khan')
})

test('sections reject incompatible statuses and audit cannot be edited',()=>{
  const state=createAdminDemo()
  assert.throws(()=>updateAdminRecord(state,'appointments','APT-1048',{status:'Active'}),/Invalid status/)
  assert.throws(()=>updateAdminRecord(state,'payments','INV-1048',{status:'Verified'}),/Invalid status/)
  assert.throws(()=>updateAdminRecord(state,'audit','AUD-SEED',{status:'Hidden'}),/Unsupported/)
  assert.throws(()=>updateAdminRecord(state,'users','missing',{status:'Active'}),/Unsupported/)
})

test('new clinicians use unique identities and appear in shared account data',()=>{
  const before=createAdminDemo()
  const after=addAdminRecord(before,'doctors',{name:'Dr. Demo One',email:'one@example.test',role:'Doctor',status:'Pending',verification:'Pending',specialty:'Cardiology',city:'Lahore'})
  assert.equal(after.users.length,before.users.length+1)
  assert.equal(after.users[0].role,'Doctor')
  assert.equal(after.audit[0].target,'Dr. Demo One')
  assert.throws(()=>addAdminRecord(after,'doctors',{name:'Duplicate',email:'ONE@example.test'}),/already/)
  assert.throws(()=>addAdminRecord(after,'specialties',{name:' cardiology '}),/already/)
})

test('bad browser storage recovers and exports escape CSV formulas and multiline text',()=>{
  assert.equal(readAdminDemo({getItem:()=>'{bad'}).version,1)
  assert.equal(readAdminDemo({getItem:()=>{throw new Error('blocked')}}).users.length,9)
  const csv=adminCsv(['Name','Note'],[['=SUM(A1:A2)','quoted "text"\nsecond line']])
  assert.ok(csv.includes('"\'=SUM(A1:A2)"'))
  assert.ok(csv.includes('"quoted ""text""\nsecond line"'))
})
