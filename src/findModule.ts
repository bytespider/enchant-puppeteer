import { resolve } from 'path'

export const findModule = (rootPath: string, moduleName: string) => {
  const paths = ['lib/cjs/puppeteer/common', 'lib'] // 5.x, 4.x, 3.x
  for (let i = 0; i < paths.length; i++) {
    const path = resolve(rootPath, paths[i], moduleName)
    try {
      const module = require(path)
      console.log(`Enchanting ${path}`)
      return module
    } catch {}
  }

  throw new Error(
    `Could not enchant any version of ${moduleName} on ${rootPath}. Only Puppeteer 3.x or above is supported, or your module path is wrong.`
  )
}
