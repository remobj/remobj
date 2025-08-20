import { rimraf } from 'rimraf'
import { discoverPackages } from './discover-packages.js'

async function clean() {
  const packages = discoverPackages()
  
  console.log('🧹 Cleaning dist directories...')
  
  const cleanPromises = packages.map(async (packageName) => {
    const distPath = `packages/${packageName}/dist`
    try {
      await rimraf(distPath)
      console.log(`✅ Cleaned ${distPath}`)
    } catch (error) {
      console.error(`❌ Failed to clean ${distPath}:`, error.message)
    }
  })
  
  await Promise.all(cleanPromises)
  console.log('🎉 All dist directories cleaned!')
}

clean().catch(console.error)