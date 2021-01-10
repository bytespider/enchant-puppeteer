import { EnchantedHTTPRequest, enchantHTTPRequest } from './enchantHTTPRequest'
import { enchantNetworkManager } from './enchantNetworkManager'

export const interceptedHTTPRequests: {
  [interceptionId: string]: EnchantedHTTPRequest
} = {}

export const enchantPuppeteer = (modulePath = 'puppeteer') => {
  console.log(`Enchanting ${modulePath}`)
  enchantHTTPRequest(modulePath)
  enchantNetworkManager(modulePath)
}
