import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Discovers all buildable packages in the monorepo
 * @returns {string[]} Array of package directory names
 */
export function discoverPackages() {
  return fs
    .readdirSync('packages')
    .filter(dir => {
      if (!fs.statSync(`packages/${dir}`).isDirectory()) {return false}
      if (!fs.existsSync(`packages/${dir}/package.json`)) {return false}
      
      const pkg = require(`../packages/${dir}/package.json`)
      // Include packages that have buildOptions or are not private
      return !pkg.private || pkg.buildOptions
    })
}

/**
 * Fuzzy-matches package names for easier CLI usage
 * @param {string[]} partialTargets - Partial package names to match
 * @param {boolean} includeAll - Whether to include all matches or just first
 * @returns {string[]} Matched package names
 */
export function fuzzyMatch(partialTargets, includeAll = false) {
  const packages = discoverPackages()
  const matched = []
  
  partialTargets.forEach(partial => {
    for (const pkg of packages) {
      if (pkg.includes(partial)) {
        matched.push(pkg)
        if (!includeAll) {break}
      }
    }
  })
  
  return matched.length > 0 ? matched : packages
}