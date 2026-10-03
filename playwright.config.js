import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL:'http://127.0.0.1:4173', trace:'retain-on-failure', video:'retain-on-failure' },
  webServer: { command:'npm run preview -- --port 4173', port:4173, reuseExistingServer:true, timeout:120000 },
  projects: [
    { name:'desktop-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:1440,height:1000}, video:'on' } },
    { name:'tablet-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:820,height:1180} } },
    { name:'mobile-chromium', use:{ ...devices['Desktop Chrome'], viewport:{width:390,height:844} } }
  ]
})
