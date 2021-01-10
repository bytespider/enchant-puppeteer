import { resolve } from 'path'
import { NetworkManager } from 'puppeteer/lib/cjs/puppeteer/common/NetworkManager'
import { interceptedHTTPRequests } from './index'

export const enchantNetworkManager = (modulePath: string) => {
  const NetworkManagerModule = (() => {
    // 5.x
    try {
      return (() => {
        const path = resolve(
          modulePath,
          'lib/cjs/puppeteer/common/NetworkManager'
        )
        const module = require(path)
        console.log(`Enchanting NetworkManager ${path}`)
        return module
      })()
    } catch {}

    // 4.x, 3.x
    try {
      return (() => {
        const path = resolve(modulePath, 'lib/NetworkManager')
        const module = require(path)
        console.log(`Enchanting NetworkManager ${path}`)
        return module
      })()
    } catch {}
  })()
  const klass = NetworkManagerModule.NetworkManager as typeof NetworkManager
  const oldOnRequest = klass.prototype._onRequest
  klass.prototype._onRequest = function (event, interceptionId): void {
    oldOnRequest.bind(this)(event, interceptionId)
    if (interceptionId && this._userRequestInterceptionEnabled) {
      interceptedHTTPRequests[interceptionId].finalizeInterception()
    }
  }
}
