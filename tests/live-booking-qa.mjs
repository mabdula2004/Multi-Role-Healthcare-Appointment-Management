import fs from 'node:fs'
import assert from 'node:assert/strict'
import { chromium, expect as baseExpect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
const expect = baseExpect.configure({ timeout: 45000 })
if (process.stdin.isTTY) process.stdin.setRawMode(true)
console.log('Ready for disposable frontend QA fixture JSON (input hidden).')
const config = await new Promise(resolve => {
  let input = ''
  process.stdin.on('data', chunk => { input += chunk; if (input.includes('\n')) { process.stdin.pause(); resolve(JSON.parse(input.trim())) } })
})
const { createServer } = await import('vite')
const server = process.env.QA_BASE_URL ? null : await createServer({ server: { host: '127.0.0.1', port: 4175 } })
if (server) await server.listen()
const browser = await chromium.launch({
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined,
  executablePath: process.env.QA_BROWSER_EXECUTABLE || undefined,
  args: process.env.QA_BROWSER_EXECUTABLE ? ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'] : [], headless: true
})
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:4175'
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true })
const page = await context.newPage(), errors = [], checks = []
page.on('pageerror', error => errors.push(error.message))
page.on('requestfailed', request => {
  if (request.url().includes('supabase.co')) console.log('API transport failure: '+new URL(request.url()).pathname+' '+request.failure()?.errorText)
})
const pass = name => { checks.push({ name, status: 'passed' }); console.log('PASS '+name) }
let appointmentId
try {
  await page.goto(baseURL + '/patient/book', {waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Sign in to book an appointment'})).toBeVisible()
  pass('Unauthenticated frontend cannot confirm a booking')
  await page.goto(baseURL+'/login',{waitUntil:'domcontentloaded'})
  await page.getByLabel('Email address').fill(`medora-qa-${config.tag}-patient-a@example.invalid`)
  await page.getByLabel('Password',{exact:true}).fill(config.password)
  await page.getByRole('button',{name:'Sign in securely'}).click()
  await expect(page).toHaveURL(/\/patient$/, {timeout:45000})
  await page.goto(baseURL+'/patient/book?doctor='+config.ids.doctor,{waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Choose your doctor'})).toBeVisible({timeout:45000})
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled()
  await page.getByLabel('Reason for visit').fill('Synthetic frontend QA consultation')
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  const date = new Date(Date.now()+5*86400000).toISOString().slice(0,10)
  await page.getByLabel('Appointment date').fill(date)
  await expect(page.getByRole('button',{name:/9:00\s*[ap]m/i})).toBeVisible({timeout:45000})
  await page.getByRole('button',{name:/9:00\s*[ap]m/i}).click()
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Review appointment'})).toBeVisible()
  const rpc = page.waitForResponse(r=>r.url().includes('/rpc/book_appointment') && r.request().method()==='POST')
  await page.getByRole('button',{name:'Confirm appointment',exact:true}).click()
  const response = await rpc
  assert.equal(response.status(),200)
  const payload=response.request().postDataJSON()
  assert.equal(payload.p_doctor_id,config.ids.doctor)
  assert.ok(!('fee_amount' in payload)); assert.ok(!('patient_id' in payload))
  await expect(page.getByRole('heading',{name:'Appointment confirmed.'})).toBeVisible({timeout:45000})
  appointmentId=await page.getByTestId('appointment-id').textContent()
  assert.match(appointmentId,/^[a-f0-9-]{36}$/)
  pass('Four-step browser flow confirms through real book_appointment RPC')
  await page.getByRole('link',{name:'View appointments',exact:true}).click()
  await expect(page.getByText(appointmentId,{exact:true})).toBeVisible({timeout:45000})
  await page.reload({waitUntil:'domcontentloaded'})
  await expect(page.getByText(appointmentId,{exact:true})).toBeVisible({timeout:45000})
  pass('Booked appointment persists after full page reload')
  for (const width of [820,390]) {
    await page.setViewportSize({width,height:1000})
    const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}))
    assert.ok(size.scroll<=size.client+1,`Overflow at ${width}: ${JSON.stringify(size)}`)
  }
  pass('Live appointment list fits tablet and mobile layouts')
  await page.setViewportSize({width:1440,height:1000})
  const row=page.locator('.tableRow').filter({has:page.getByText(appointmentId,{exact:true})})
  await row.getByRole('button',{name:'Cancel',exact:true}).click()
  await expect(row.getByText('cancelled',{exact:true})).toBeVisible({timeout:45000})
  pass('Browser cancellation persists through cancel_appointment RPC')
  await page.goto(baseURL+'/patient/book?doctor='+config.ids.doctor,{waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Choose your doctor'})).toBeVisible({timeout:45000})
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  await page.getByLabel('Reason for visit').fill('Synthetic competing slot test')
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  await page.getByLabel('Appointment date').fill(date)
  await page.getByRole('button',{name:/10:00\s*[ap]m/i}).click()
  await page.getByRole('button',{name:'Continue',exact:true}).click()
  const other=createClient('https://rjiejqtrffdutrmcvaxg.supabase.co','sb_publishable_Iu485kMufL7ABdbWWQ_d0g_hFMY61vb',{auth:{persistSession:false,autoRefreshToken:false}})
  try {
    let {error}=await other.auth.signInWithPassword({email:`medora-qa-${config.tag}-patient-b@example.invalid`,password:config.password});assert.equal(error,null,error?.message)
    ;({error}=await other.rpc('book_appointment',{p_doctor_id:config.ids.doctor,p_starts_at:`${date}T10:00:00+05:00`,p_consultation_mode:'In-person',p_reason:'Synthetic concurrent frontend fixture'}));assert.equal(error,null,error?.message)
    await page.getByRole('button',{name:'Confirm appointment',exact:true}).click()
    await expect(page.getByRole('alert')).toContainText('no longer available',{timeout:45000})
    await expect(page.getByRole('heading',{name:'Select a time'})).toBeVisible()
    await expect(page.getByRole('button',{name:/10:00\s*[ap]m/i})).toHaveCount(0,{timeout:45000})
    assert.equal(await page.getByRole('heading',{name:'Appointment confirmed.'}).count(),0)
    pass('Slot conflict returns to availability without a false confirmation')
  } finally { await other.auth.signOut({scope:'global'}) }
  assert.deepEqual(errors,[])
  pass('No browser runtime errors during real authenticated booking')
  fs.mkdirSync('qa',{recursive:true})
  await page.screenshot({path:'qa/live-booking-state.png',fullPage:true})
  fs.writeFileSync('qa/frontend-report.json',JSON.stringify({run_at:new Date().toISOString(),checks,errors},null,2)+'\n')
  console.log(JSON.stringify({passed:checks.length,failed:0}))
} catch (error) {
  console.error('Visible notices: '+await page.locator('.notice').allTextContents())
  fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/frontend-report.json',JSON.stringify({checks,errors,failure:error.message},null,2)+'\n')
  console.error(error.message);process.exitCode=1
} finally { await context.close(); await browser.close(); await server?.close() }
