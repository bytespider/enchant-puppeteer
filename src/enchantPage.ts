import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page'
import { EnchantedHTTPRequest } from './enchantHTTPRequest'
import { findModule } from './findModule'
import { EnchantOptions } from './index'

export const enchantPage = (options: EnchantOptions) => {
  const { logger } = options
  const { debug, info } = logger
  const PageModule = findModule(options, 'Page')

  const klass = PageModule.Page as typeof Page & {
    isEnchanted?: boolean
  }

  if (klass.isEnchanted) {
    debug(`Page is already enchanted.`)
    return
  }
  info('Enchanting Page')
  const oldOn = klass.prototype.on
  klass.prototype.on = function (event, handler) {
    debug(`Got a Page event ${event.toString()}`)
    if (event !== 'request') return oldOn.bind(this)(event, handler)
    oldOn.bind(this)(event, (req: EnchantedHTTPRequest) => {
      debug(`Deferring automatically ${event.toString()}, ${req.url()}`)

      req.defer(() =>
        Promise.resolve(handler(req)).then(() => {
          debug(`Handler resolved ${req.url()}`)
        })
      )
    })
    return this
  }
  klass.isEnchanted = true
}
