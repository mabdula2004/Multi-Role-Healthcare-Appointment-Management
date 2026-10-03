import fs from 'node:fs'
import { test, expect } from '@playwright/test'

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
  if(testInfo.project.name==='mobile-chromium') {
    await page.getByRole('button',{name:'Toggle menu'}).click()
  }
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

test('patient booking completes all four steps', async ({page}) => {
  await page.goto('/patient/book?doctor=d1')
  await expect(page.getByRole('heading',{name:'Choose your doctor'})).toBeVisible()
  await page.getByRole('button',{name:/Continue/}).click()
  await expect(page.getByRole('heading',{name:/How would you like to meet/})).toBeVisible()
  await page.getByRole('button',{name:/Continue/}).click()
  await expect(page.getByRole('heading',{name:'Select a time'})).toBeVisible()
  await page.getByRole('button',{name:/Continue/}).click()
  await expect(page.getByRole('heading',{name:'Review appointment'})).toBeVisible()
  await page.getByRole('button',{name:/Confirm appointment/}).click()
  await expect(page.getByRole('heading',{name:'Appointment confirmed.'})).toBeVisible()
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
  await page.getByRole('button',{name:'Book appointment'}).click(); await page.waitForTimeout(2500)
  await page.getByRole('button',{name:/Continue/}).click(); await page.waitForTimeout(1800)
  await page.getByRole('button',{name:/Continue/}).click(); await page.waitForTimeout(1800)
  await page.getByRole('button',{name:'7:00 PM'}).click(); await page.getByRole('button',{name:/Continue/}).click(); await page.waitForTimeout(2200)
  await page.goto('/patient'); await page.waitForTimeout(3000)
  await page.goto('/doctor'); await page.waitForTimeout(3000)
  await page.goto('/admin'); await page.waitForTimeout(3000)
  await page.goto('/admin/analytics'); await page.waitForTimeout(3000)
  await page.goto('/'); await page.waitForTimeout(3000)
})
