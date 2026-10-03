import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL:'http://127.0.0.1:4173', trace:'retain-on-failure', video:process.env.QA_BROWSER_EXECUTABLE?'off':'retain-on-failure',
    launchOptions: process.env.QA_BROWSER_EXECUTABLE ? { executablePath:process.env.QA_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'] } : undefined },
  webServer: { command:'npm run preview -- --host 127.0.0.1 --port 4173', port:4173, reuseExistingServer:true, timeout:120000 },
  projects: [
    { name:'desktop-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:1440,height:1000}, video:process.env.QA_BROWSER_EXECUTABLE?'off':'on' } },
    { name:'tablet-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:820,height:1180} } },
    { name:'mobile-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:390,height:844} } }
  ]
})
