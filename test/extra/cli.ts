import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { enchantPuppeteer } from '../../dist'

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
puppeteer.use(StealthPlugin())

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

// That's it, the rest is puppeteer usage as normal 😊
puppeteer.launch({ headless: true }).then(async (browser) => {
  enchantPuppeteer()

  const page = await browser.newPage()

  /**
   * Here is a test to prove cooperative request interceptions work.
   *
   * The ad blocker plugin blocks Amazon Associates URLs (z-na.associates-amazon).
   * However, we will respond with our own JavaScript.
   * The abort() from the ad blocker will win.
   */

  page.on('request', (req) => {
    req.onInterceptAborted(() => console.log('request was aborted', req.url()))
    req.onInterceptContinued(() =>
      console.log('request was continued', req.url())
    )
    req.onInterceptResponded(() =>
      console.log('request was responded', req.url())
    )
  })

  page.on('request', (req) => {
    console.log('Magic: this intercept does run!', req.url())
    const parts = new URL(req.url())
    if (parts.host.indexOf('associates-amazon') === -1) return
    console.log(
      'Here we will continue with our own javascript, but the ad blocker will still win',
      req.url()
    )
    req.respond({
      body: `console.log('hello world)`,
    })
  })

  await page.setViewport({ width: 800, height: 600 })

  console.log(`Testing adblocker plugin..`)
  await page.goto('https://www.vanityfair.com')
  await page.waitFor(1000)
  await page.screenshot({ path: 'adblocker.png', fullPage: true })

  console.log(`Testing the stealth plugin..`)
  await page.goto('https://bot.sannysoft.com')
  await page.waitFor(5000)
  await page.screenshot({ path: 'stealth.png', fullPage: true })

  console.log(`All done, check the screenshots. ✨`)
  await browser.close()
})
