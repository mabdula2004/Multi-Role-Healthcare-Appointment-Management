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
