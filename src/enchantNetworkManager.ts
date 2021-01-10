import { NetworkManager } from 'puppeteer/lib/cjs/puppeteer/common/NetworkManager'
import { findModule } from './findModule'
import { EnchantOptions, interceptedHTTPRequests } from './index'

export const enchantNetworkManager = (options: EnchantOptions) => {
  const { logger } = options
  const { debug, info } = logger
  const NetworkManagerModule = findModule(options, 'NetworkManager')

  const klass = NetworkManagerModule.NetworkManager as typeof NetworkManager & {
    isEnchanted?: boolean
  }

  if (klass.isEnchanted) {
    debug(`NetworkManager is already enchanted.`)
    return
  }
  info('Enchanting NetworkManager')
  const oldOnRequest = klass.prototype._onRequest
  klass.prototype._onRequest = function (event, interceptionId): void {
    oldOnRequest.bind(this)(event, interceptionId)
    if (interceptionId && this._userRequestInterceptionEnabled) {
      interceptedHTTPRequests[interceptionId].finalizeInterception()
    }
  }
  klass.isEnchanted = true
}
