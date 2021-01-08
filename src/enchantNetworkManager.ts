import { NetworkManager } from 'puppeteer/lib/cjs/puppeteer/common/NetworkManager'
import { interceptedHTTPRequests } from './index'

export const enchantNetworkManager = (klass: typeof NetworkManager) => {
  const oldOnRequest = klass.prototype._onRequest
  klass.prototype._onRequest = function (event, interceptionId): void {
    oldOnRequest.bind(this)(event, interceptionId)
    if (interceptionId && this._userRequestInterceptionEnabled) {
      interceptedHTTPRequests[interceptionId].finalizeInterception()
    }
  }
}
