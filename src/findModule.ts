import { resolve } from 'path'
import { EnchantOptions } from '.'

export const findModule = (options: EnchantOptions, moduleName: string) => {
  const { modulePath, logger } = options
  const { info, error } = logger
  const paths = ['lib/cjs/puppeteer/common', 'lib'] // 5.x, 4.x, 3.x
  for (let i = 0; i < paths.length; i++) {
    const path = resolve(modulePath, paths[i], moduleName)
    try {
      const module = require(path)
      info(`Enchanting ${path}`)
      return module
    } catch (e) {
      error(e)
    }
  }

  const msg = `Could not enchant any version of ${moduleName} on ${modulePath}. Only Puppeteer 3.x or above is supported, or your module path is wrong.`
  error(msg)
  throw new Error(msg)
}
