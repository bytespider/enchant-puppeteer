import { EnchantedHTTPRequest, enchantHTTPRequest } from './enchantHTTPRequest'
import { enchantNetworkManager } from './enchantNetworkManager'
import { enchantPage } from './enchantPage'
import { createLogger, Logger, LogOptions } from './log'

export const interceptedHTTPRequests: {
  [interceptionId: string]: EnchantedHTTPRequest
} = {}

export type EnchantOptions = {
  modulePath: string
  logger: Logger
}

export type EnchantInitOptions = {
  modulePath: string
  logLevel: LogOptions['level']
}

export const enchantPuppeteer = (options?: Partial<EnchantInitOptions>) => {
  const _options: EnchantOptions = {
    modulePath: 'node_modules/puppeteer',
    logger: createLogger({ level: options?.logLevel || 'error' }),
    ...options,
  }
  const { modulePath, logger } = _options
  const { error, info } = logger
  info(`Enchanting ${modulePath}`)
  enchantPage(_options)
  enchantHTTPRequest(_options)
  enchantNetworkManager(_options)
}
