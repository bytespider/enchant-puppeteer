import puppeteer from 'puppeteer'
import { enchantPuppeteer } from '../../dist'

puppeteer.launch().then(async (browser) => {
  enchantPuppeteer(`${__dirname}/node_modules/puppeteer`)
  enchantPuppeteer(`${__dirname}/node_modules/puppeteer`)

  const page = await browser.newPage()
  page.setRequestInterception(true)

  page.on('request', (req) => {
    const parts = new URL(req.url())
    if (parts.pathname.endsWith('.gif')) req.abort()
    req.onInterceptFinalized(() =>
      console.log('got a finalized intercept!', req.url())
    )
    req.onInterceptAborted(() => console.log('request was aborted', req.url()))
    req.onInterceptContinued(() =>
      console.log('request was continued', req.url())
    )
  })

  await page.goto('https://www.vanityfair.com')
  await page.screenshot({ path: 'stock.png', fullPage: true })
  await page.goto('https://www.cnn.com')

  console.log(`All done, check the screenshots. ✨`)
  await browser.close()
})
