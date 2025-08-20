import path from 'node:path'
import { discoverPackages } from './discover-packages.js'

/**
 * Creates workspace aliases for package resolution
 * @param {string} orgName - Organization name for scoped packages
 * @returns {Record<string, string>} Alias mapping
 */
export function createWorkspaceAliases(orgName = 'remobj') {
  const packages = discoverPackages()
  const aliases = {}
  
  packages.forEach(pkg => {
    const aliasKey = `@${orgName}/${pkg}`
    aliases[aliasKey] = path.resolve(`packages/${pkg}/src/index.ts`)
  })
  
  return aliases
}