import { rolldown } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import { createWorkspaceAliases } from './workspace-aliases.js'

/**
 * Creates a TypeScript declarations build configuration
 * @param {string} packageName - Name of the package
 * @returns {object} Rolldown configuration for dts
 */
export function createDtsConfig(packageName) {
  return {
    input: `packages/${packageName}/src/index.ts`,
    external: (id) => {
      // Don't externalize workspace packages - they should be bundled
      if (id.startsWith('@remobj/')) {
        return false
      }
      // Externalize other non-relative imports
      return !id.startsWith('.') && !id.startsWith('/')
    },
    output: {
      dir: `packages/${packageName}/dist`,
      format: 'es',
      entryFileNames: `${packageName}.d.ts`,
      chunkFileNames: `${packageName}-[name].d.ts`,
      preserveModules: false
    },
    resolve: {
      alias: createWorkspaceAliases()
    },
    plugins: [
      dts({
        respectExternal: false, // Bundle workspace dependencies
        compilerOptions: {
          isolatedDeclarations: false,
          skipLibCheck: true,
          noEmitOnError: false,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          moduleResolution: 'bundler'
        }
      })
    ],
    onLog(level, log, handler) {
      // Suppress certain warnings from dts plugin
      if (log.code === 'EMPTY_BUNDLE') return
      if (log.code === 'CIRCULAR_DEPENDENCY') return
      if (log.code === 'UNRESOLVED_IMPORT') {
        console.warn(`⚠️  DTS: Unresolved import in ${packageName}: ${log.message}`)
        return
      }
      handler(level, log)
    }
  }
}


/**
 * Builds TypeScript declarations for a single package with timeout
 * @param {string} packageName - Name of the package
 * @returns {Promise<void>}
 */
export async function buildDts(packageName) {
  console.log(`🔄 Building DTS for ${packageName}...`)
  
  // Special handling for core package - use pre-generated DTS
  if (packageName === 'core') {
    const fs = await import('fs')
    const coreDtsPath = `packages/${packageName}/dist/${packageName}.d.ts`
    
    if (fs.existsSync(coreDtsPath)) {
      console.log(`✅ Using pre-generated DTS for ${packageName} → ${coreDtsPath}`)
      return
    } else {
      throw new Error(`Pre-generated DTS file not found: ${coreDtsPath}`)
    }
  }
  
  const config = createDtsConfig(packageName)
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`DTS_TIMEOUT`))
    }, 10000) // 10 second timeout
  })
  
  try {
    // Race between build and timeout
    const bundle = await Promise.race([
      rolldown(config),
      timeoutPromise
    ])
    
    if (!bundle || typeof bundle.write !== 'function') {
      throw new Error('Build timed out or failed')
    }
    
    await Promise.race([
      bundle.write(config.output),
      timeoutPromise
    ])
    
    await bundle.close()
    
    console.log(`✅ Built ${packageName} declarations → packages/${packageName}/dist/${packageName}.d.ts`)
    
    } catch (error) {
    if (error.message === 'DTS_TIMEOUT') {
      console.warn(`⏰ DTS build timed out for ${packageName}`)
      throw new Error(`DTS build failed: ${error.message}`)
    } else {
      console.error(`❌ Failed to build ${packageName} declarations:`, error.message)
      throw error
    }
  }
}