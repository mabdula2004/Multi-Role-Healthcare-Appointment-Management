import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { doctors } from '../src/data.js'

// Read-only fixtures make presentation QA reproducible; live RPC QA is separate.
test.beforeEach(async ({page}) => {
  await page.route('**/rest/v1/rpc/list_verified_doctors', route => route.fulfill({json:doctors}))
})

const noOverflow = async page => {
  const dims = await page.evaluate(() => ({s:document.documentElement.scrollWidth,c:document.documentElement.clientWidth}))
  expect(dims.s).toBeLessThanOrEqual(dims.c + 1)
}

test('public discovery is responsive and navigable', async ({page}, testInfo) => {
  fs.mkdirSync('artifacts',{recursive:true})
  await page.goto('/')
  await expect(page.getByRole('heading',{name:/Healthcare that feels human/i})).toBeVisible()
  await noOverflow(page)
  await page.screenshot({path:`artifacts/${testInfo.project.name}-home.png`,fullPage:true})
  const menu = page.getByRole('button',{name:'Toggle menu'})
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('link',{name:'Find doctors'}).first().click()
  await expect(page.getByRole('heading',{name:/Find care that fits your life/i})).toBeVisible()
  await noOverflow(page)
})

test('doctor search and profile flow works', async ({page}) => {
  await page.goto('/doctors')
  await page.getByLabel('Search doctors directory').fill('Sarah')
  await expect(page.getByRole('heading',{name:'Dr. Sarah Malik',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'View profile'}).first().click()
  await expect(page.getByRole('heading',{name:'Dr. Sarah Malik',exact:true})).toBeVisible()
  await noOverflow(page)
})

test('booking cannot fake a confirmation without a patient session', async ({page}) => {
  await page.goto('/patient/book?doctor=d1')
  await expect(page.getByRole('heading',{name:'Sign in to book an appointment'})).toBeVisible()
  await expect(page.getByRole('button',{name:/Confirm appointment/})).toHaveCount(0)
})



test('synthetic patient preview completes and persists a browser-only booking', async ({page}) => {
  await page.goto('/login')
  await page.getByRole('button',{name:'Open patient demo'}).click()
  await expect(page.getByText(/Synthetic demo data/i)).toBeVisible()
  await page.goto('/patient/book')

  await expect(page.getByText(/Preview booking/i)).toBeVisible()
  await page.getByRole('button',{name:/Dr\. Sarah Malik/i}).click()
  await page.getByRole('button',{name:'Continue'}).click()
  await page.getByLabel('Reason for visit').fill('Routine cardiology follow-up')
  await page.getByRole('button',{name:'Continue'}).click()
  await page.locator('.slotGrid button').first().click()
  await page.getByRole('button',{name:'Continue'}).click()
  await page.getByRole('button',{name:'Confirm appointment'}).click()

  await expect(page.getByRole('heading',{name:'Demo appointment confirmed.'})).toBeVisible()
  const id=await page.getByTestId('appointment-id').textContent()
  expect(id).toMatch(/^DEMO-/)
  await page.getByRole('link',{name:'View appointments'}).click()
  await expect(page.getByText(id)).toBeVisible()
  await page.reload()
  await expect(page.getByText(id)).toBeVisible()
  await noOverflow(page)
})

test('doctor directory advanced filters are interactive', async ({page}) => {
  await page.goto('/doctors')
  await page.getByLabel('Search doctors directory').fill('Sarah')
  await page.getByLabel('Gender filter').selectOption('Female')
  await page.getByLabel('Consultation mode').selectOption('Video')
  await expect(page.getByRole('heading',{name:'Dr. Sarah Malik',exact:true})).toBeVisible()
  await page.getByRole('checkbox',{name:'4.8+ rating'}).check()
  await expect(page.getByRole('heading',{name:'Dr. Sarah Malik',exact:true})).toBeVisible()
  await noOverflow(page)
})



test('doctor synthetic preview can process appointment requests', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('medoraRole','doctor'))
  await page.goto('/doctor/requests')
  await page.getByRole('button',{name:'Accept'}).first().click()
  await expect(page.getByText(/request accepted in demo mode/i)).toBeVisible()
  await expect(page.getByText('accepted',{exact:true}).first()).toBeVisible()
  await noOverflow(page)
})

test('admin synthetic preview supports add search and status management', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('medoraRole','admin'))
  await page.goto('/admin/users')
  await page.getByRole('button',{name:'Add new'}).click()
  await expect(page.getByText(/Synthetic item added/i)).toBeVisible()
  await page.getByLabel('Search User status').fill('Demo User')
  await expect(page.getByText(/Demo User/i).first()).toBeVisible()
  await page.getByRole('button',{name:'Manage'}).first().click()
  await expect(page.getByText(/Demo status updated/i)).toBeVisible()
  await noOverflow(page)
})

test('patient doctor and admin dashboards render without overflow', async ({page}) => {
  for (const route of ['/patient','/doctor','/admin']) {
    await page.goto(route)
    await expect(page.locator('.portalHeader')).toBeVisible()
    await noOverflow(page)
  }
})

test('showcase walkthrough', async ({page}, testInfo) => {
  test.skip(testInfo.project.name!=='desktop-chromium','single showcase')
  test.setTimeout(70000)
  await page.goto('/'); await page.waitForTimeout(3000)
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight*.28,behavior:'smooth'})); await page.waitForTimeout(3000)
  await page.goto('/doctors'); await page.waitForTimeout(3000)
  await page.getByLabel('Specialty filter').selectOption('Cardiology'); await page.waitForTimeout(2500)
  await page.getByRole('link',{name:'View profile'}).first().click(); await page.waitForTimeout(3000)
  await page.getByRole('button',{name:'Book appointment'}).click(); await page.waitForTimeout(6500)
  await page.goto('/patient'); await page.waitForTimeout(3000)
  await page.goto('/doctor'); await page.waitForTimeout(3000)
  await page.goto('/admin'); await page.waitForTimeout(3000)
  await page.goto('/admin/analytics'); await page.waitForTimeout(3000)
  await page.goto('/'); await page.waitForTimeout(3000)
})
