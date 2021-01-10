import { NetworkManager } from 'puppeteer/lib/cjs/puppeteer/common/NetworkManager'
import { findModule } from './findModule'
import { interceptedHTTPRequests } from './index'

export const enchantNetworkManager = (modulePath: string) => {
  const NetworkManagerModule = findModule(modulePath, 'NetworkManager')

  const klass = NetworkManagerModule.NetworkManager as typeof NetworkManager & {
    isEnchanted?: boolean
  }

  if (klass.isEnchanted) return
  const oldOnRequest = klass.prototype._onRequest
  klass.prototype._onRequest = function (event, interceptionId): void {
    oldOnRequest.bind(this)(event, interceptionId)
    if (interceptionId && this._userRequestInterceptionEnabled) {
      interceptedHTTPRequests[interceptionId].finalizeInterception()
    }
  }
  klass.isEnchanted = true
}
