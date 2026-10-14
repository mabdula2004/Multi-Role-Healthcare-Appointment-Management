import {test,expect} from '@playwright/test'
import {doctors} from '../src/data.js'

test.beforeEach(async({page})=>{
  await page.route('**/rest/v1/rpc/list_verified_doctors',route=>route.fulfill({json:doctors}))
})

const navigate=async(page,label)=>{
  const menu=page.getByRole('button',{name:'Open navigation'})
  if(await menu.isVisible())await menu.click()
  await page.locator('.sidebar nav').getByRole('link',{name:label,exact:true}).click()
}
const noOverflow=async page=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true)

test('all eleven admin links switch content in the same browser session',async({page},testInfo)=>{
  await page.goto('/admin')
  const checks=[
    ['Overview','overview','Doctor verification queue'],['Doctors','doctors','Dr. Hira Sheikh'],
    ['Patients','patients','USR-1042 · Age 32'],['Appointments','appointments','APT-1048'],
    ['Specialties','specialties','General Medicine'],['Reviews','reviews','Clear explanations and a thoughtful follow-up plan.'],
    ['Payments','payments','INV-1048'],['Analytics','analytics','Appointment status distribution'],
    ['Support','support','Appointment reschedule'],['User status','users','amina@example.test'],
    ['Audit activity','audit','Reviewed clinician credentials']
  ]
  for(const[label,type,content]of checks){
    await navigate(page,label)
    const section=page.getByTestId('admin-section-'+type)
    await expect(section).toBeVisible()
    await expect(section.getByText(content,{exact:true}).first()).toBeVisible()
    await expect(page.locator('.sidebar nav a.active')).toHaveCount(1)
    await noOverflow(page)
    await page.screenshot({path:testInfo.outputPath('admin-'+type+'.png'),fullPage:true,animations:'disabled'})
  }
  await navigate(page,'Patients')
  await expect(page.getByTestId('admin-section-patients')).not.toContainText('Dr. Sarah Malik')
})

test('search filter and editor do not carry into another admin route',async({page})=>{
  await page.goto('/admin/doctors')
  await page.getByLabel('Search Doctors').fill('no-such-clinician')
  await expect(page.getByText('No matching doctors',{exact:true})).toBeVisible()
  await navigate(page,'Patients')
  await expect(page.getByLabel('Search Patients')).toHaveValue('')
  await page.getByRole('button',{name:'View patient'}).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await navigate(page,'Appointments')
  await expect(page.getByLabel('Filter Appointments by status')).toHaveValue('All')
  await expect(page.locator('.adminDataTable tbody tr')).toHaveCount(6)
})

test('clinician verification updates overview and creates a read-only audit record',async({page})=>{
  await page.goto('/admin/doctors')
  await page.getByLabel('Search Doctors').fill('Hira')
  const card=page.locator('.adminCardGrid article').first()
  await card.getByRole('button',{name:'Review credentials'}).click()
  await page.getByRole('dialog').getByLabel('Verification status').selectOption('Verified')
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  await expect(card.getByText('Pending',{exact:true})).toBeVisible()
  await card.getByRole('button',{name:'Review credentials'}).click()
  await page.getByRole('dialog').getByLabel('Verification status').selectOption('Verified')
  await page.getByRole('dialog').getByRole('button',{name:'Save changes'}).click()
  await expect(card.getByText('Verified',{exact:true})).toBeVisible()
  await navigate(page,'Overview')
  await expect(page.locator('.verificationList')).not.toContainText('Dr. Hira Sheikh')
  await navigate(page,'Audit activity')
  await expect(page.getByText('Updated doctors',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Inspect'}).first().click()
  await expect(page.getByRole('dialog')).toContainText('Pending → Verified')
  await expect(page.getByRole('dialog').getByRole('button',{name:'Save changes'})).toHaveCount(0)
  await page.getByRole('button',{name:'Close inspection'}).click()
  await noOverflow(page)
})

test('new clinician validates fields and persists across doctors and users',async({page})=>{
  await page.goto('/admin/doctors')
  await page.getByRole('button',{name:'Add clinician'}).click()
  const dialog=page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill('Dr. Demo Sana')
  await dialog.getByLabel('Email',{exact:true}).fill('sana@example.test')
  await dialog.getByLabel('City',{exact:true}).fill('Lahore')
  await dialog.getByRole('button',{name:'Create record'}).click()
  await expect(page.getByRole('heading',{name:'Dr. Demo Sana',exact:true})).toBeVisible()
  await navigate(page,'User status')
  await page.getByLabel('Search User status').fill('sana@example.test')
  await expect(page.locator('.adminDataTable tbody tr')).toHaveCount(1)
  await expect(page.locator('.adminDataTable tbody')).toContainText('Dr. Demo Sana')
  await page.reload()
  await page.getByLabel('Search User status').fill('sana@example.test')
  await expect(page.locator('.adminDataTable tbody')).toContainText('Dr. Demo Sana')
})

test('appointment payment moderation and support use valid independent statuses',async({page})=>{
  for(const[route,id,status]of [['appointments','APT-1048','Cancelled'],['payments','INV-1048','Refunded']]){
    await page.goto('/admin/'+route)
    const row=page.locator('.adminDataTable tbody tr').filter({hasText:id}).first()
    await row.getByRole('button').click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('Status',{exact:true}).selectOption(status)
    await dialog.getByRole('button',{name:'Save changes'}).click()
    await expect(row.getByText(status,{exact:true})).toBeVisible()
    await noOverflow(page)
  }
  await navigate(page,'Reviews')
  await page.getByRole('button',{name:'Moderate review'}).first().click()
  await page.getByRole('dialog').getByLabel('Status',{exact:true}).selectOption('Hidden')
  await page.getByRole('dialog').getByLabel('Moderation note').fill('Reviewed demo feedback')
  await page.getByRole('dialog').getByRole('button',{name:'Save changes'}).click()
  await expect(page.locator('.adminReviewList article').first()).toContainText('Hidden')
  await navigate(page,'Support')
  await page.getByRole('button',{name:'Open ticket'}).first().click()
  await page.getByRole('dialog').getByLabel('Status',{exact:true}).selectOption('Resolved')
  await page.getByRole('dialog').getByLabel('Support note').fill('Reschedule explained')
  await page.getByRole('dialog').getByRole('button',{name:'Save changes'}).click()
  await expect(page.locator('.adminSupportList article').first()).toContainText('Reschedule explained')
  await navigate(page,'Analytics')
  await expect(page.locator('meter[aria-label="Cancelled appointments"]')).toHaveAttribute('value','2')
})

test('CSV exports contain only the visible section and filtered records',async({page})=>{
  await page.goto('/admin/payments')
  await page.getByLabel('Search Payments').fill('INV-1048')
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export CSV'}).click()
  const download=await downloadPromise
  expect(download.suggestedFilename()).toBe('medora-payments-demo.csv')
  const stream=await download.createReadStream()
  const chunks=[];for await(const c of stream)chunks.push(c)
  const csv=Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('INV-1048')
  expect(csv).not.toContain('INV-1041')
  expect(csv).not.toContain('Specialty')
})
