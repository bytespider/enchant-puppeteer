import { HTTPRequest } from 'puppeteer/lib/cjs/puppeteer/common/HTTPRequest'
import { NetworkManager } from 'puppeteer/lib/cjs/puppeteer/common/NetworkManager'
import { EnchantedHTTPRequest, enchantHTTPRequest } from './enchantHTTPRequest'
import { enchantNetworkManager } from './enchantNetworkManager'

export const interceptedHTTPRequests: {
  [interceptionId: string]: EnchantedHTTPRequest
} = {}

export const enchantPuppeteer = () => {
  enchantHTTPRequest(HTTPRequest)
  enchantNetworkManager(NetworkManager)
}
