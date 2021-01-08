import puppeteer from 'puppeteer'
import { enchantPuppeteer } from '../dist'
;(async () => {
  enchantPuppeteer()
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://cnn.com')
  await page.screenshot({ path: 'example.png' })

  await browser.close()
})()
