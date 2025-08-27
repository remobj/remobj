#!/usr/bin/env node

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const packagesDir = join(__dirname, '..', 'packages')

/**
 * Updates package.json to include source map references
 */
async function updatePackageExports(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  
  // Skip if no exports field
  if (!packageJson.exports) {
    return false
  }
  
  let modified = false
  
  // Update main export
  if (packageJson.exports['.']) {
    const mainExport = packageJson.exports['.']
    
    // Add source map references for each condition
    if (mainExport.import && !mainExport.import.endsWith('.d.ts')) {
      // ESM import - typically .esm.js
      if (typeof mainExport.import === 'string') {
        // Convert to object format to add source map
        const importPath = mainExport.import
        packageJson.exports['.'] = {
          ...mainExport,
          import: {
            default: importPath,
            source: importPath.replace('.js', '.js.map')
          }
        }
        modified = true
      }
    }
    
    if (mainExport.require && !mainExport.require.endsWith('.d.ts')) {
      // CommonJS/UMD require - typically .umd.js
      if (typeof mainExport.require === 'string') {
        const requirePath = mainExport.require
        packageJson.exports['.'] = {
          ...mainExport,
          require: {
            default: requirePath,
            source: requirePath.replace('.js', '.js.map')
          }
        }
        modified = true
      }
    }
    
    if (mainExport.browser && !mainExport.browser.endsWith('.d.ts')) {
      // Browser field - typically .umd.js
      if (typeof mainExport.browser === 'string') {
        const browserPath = mainExport.browser
        packageJson.exports['.'] = {
          ...mainExport,
          browser: {
            default: browserPath,
            source: browserPath.replace('.js', '.js.map')
          }
        }
        modified = true
      }
    }
    
    if (mainExport.bundler && !mainExport.bundler.endsWith('.d.ts')) {
      // Bundler field - typically .bundler.js
      if (typeof mainExport.bundler === 'string') {
        const bundlerPath = mainExport.bundler
        packageJson.exports['.'] = {
          ...mainExport,
          bundler: {
            default: bundlerPath,
            source: bundlerPath.replace('.js', '.js.map')
          }
        }
        modified = true
      }
    }
  }
  
  // Simplify the structure if possible
  if (packageJson.exports['.']) {
    const exp = packageJson.exports['.']
    
    // Keep simple string format where source maps aren't needed
    if (exp.import?.default && Object.keys(exp.import).length === 1) {
      packageJson.exports['.'].import = exp.import.default
      modified = true
    }
    if (exp.require?.default && Object.keys(exp.require).length === 1) {
      packageJson.exports['.'].require = exp.require.default
      modified = true
    }
    if (exp.browser?.default && Object.keys(exp.browser).length === 1) {
      packageJson.exports['.'].browser = exp.browser.default
      modified = true
    }
    if (exp.bundler?.default && Object.keys(exp.bundler).length === 1) {
      packageJson.exports['.'].bundler = exp.bundler.default
      modified = true
    }
  }
  
  // Actually, let's use a simpler approach - just add files to the files field
  if (!packageJson.files) {
    packageJson.files = []
  }
  
  if (!packageJson.files.includes('dist/*.map')) {
    packageJson.files.push('dist/*.map')
    modified = true
  }
  
  if (modified) {
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
    console.log(`✅ Updated ${packageJson.name}`)
    return true
  }
  
  return false
}

/**
 * Main function
 */
async function main() {
  const packages = await readdir(packagesDir, { withFileTypes: true })
  let updatedCount = 0
  
  for (const pkg of packages) {
    if (pkg.isDirectory()) {
      const packagePath = join(packagesDir, pkg.name)
      const updated = await updatePackageExports(packagePath)
      if (updated) updatedCount++
    }
  }
  
  console.log(`\n📦 Updated ${updatedCount} packages with source map support`)
}

main().catch(console.error)