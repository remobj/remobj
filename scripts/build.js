import { parseArgs } from 'node:util'
import { rolldown } from 'rolldown'
import { createRequire } from 'node:module'
import { discoverPackages, fuzzyMatch } from './discover-packages.js'
import { createWorkspaceAliases } from './workspace-aliases.js'
import { BUILD_FORMATS, createOutputConfig, getDefineFlags, resolveExternals } from './build-formats.js'
import { analyzeBundles } from './bundle-analyzer.js'
import { dts } from 'rolldown-plugin-dts'

const require = createRequire(import.meta.url)

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dev: { type: 'boolean', short: 'd' },
    watch: { type: 'boolean', short: 'w' },
    formats: { type: 'string', short: 'f' },
  }
})

/**
 * Creates Rolldown configurations for a package
 * @param {string} packageName - Name of the package directory
 * @param {boolean} isDev - Whether this is a development build
 * @returns {Promise<object[]>} Array of Rolldown configurations
 */
async function createConfigsForPackage(packageName, isDev = false) {
  const pkg = require(`../packages/${packageName}/package.json`)
  const buildOptions = pkg.buildOptions || {}
  
  // Default to all three formats if not specified
  const defaultFormats = ['esm-production', 'esm-bundler', 'umd'] 
  const formats =  values.formats ? values.formats.split(',') : (buildOptions.formats || defaultFormats)

  // Add dts only once if there's at least one format
  const uniqueFormats = [...new Set(formats)]
  // if (uniqueFormats.length > 0 && !uniqueFormats.includes('dts')) {
    uniqueFormats.push('dts')
  // }
  
  const configs = []
  
  // JavaScript builds
  uniqueFormats.forEach(format => {
    const outputConfig = createOutputConfig(packageName, format, buildOptions)
    const defineFlags = getDefineFlags(format, pkg.version, isDev)
    
    configs.push({
      input: `packages/${packageName}/src/index.ts`,
      external: resolveExternals(format, pkg, buildOptions),
      output: {
        dir: `packages/${packageName}/dist`,
        format: outputConfig.format,
        name: outputConfig.name,
        entryFileNames: format !== 'dts' ? outputConfig.file : undefined,
        globals: outputConfig.globals,
        minify: format != 'dts',
        sourcemap: format !== 'dts' ? true : false
      },
      treeshake: {
        preset: 'recommended',
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
        moduleSideEffects: false
      },
      resolve: {
        alias: createWorkspaceAliases()
      },
      experimental: {
        enableComposingJsPlugins: true
      },
      define: defineFlags,
      plugins: format === 'dts' ? [
        dts({
          emitDtsOnly: true,
          oxc: true /*{
            stripInternal: true
          }*/
        })
      ] : []
    })
  })
  
  return configs
}

/**
 * Builds all specified packages
 * @param {string[]} targets - Package names to build
 * @param {boolean} isDev - Whether this is a development build
 * @returns {Promise<string[]>} Array of built output files
 */
async function buildAllPackages(targets = [], isDev = false) {
  const packagesToBuild = targets.length > 0 
    ? fuzzyMatch(targets, true)
    : discoverPackages()
  
  console.log(`Building ${packagesToBuild.length} packages${isDev ? ' (development)' : ''}...`)
  
  // Track time from first rolldown start
  const rolldownStartTime = performance.now()
  
  // Build all packages in parallel
  const buildPromises = packagesToBuild.map(async (packageName) => {
    const configs = await createConfigsForPackage(packageName, isDev)
    
    // Build all formats in parallel for this package
    const formatBuilds = configs.map(async (config) => {
      try {
        const bundle = await rolldown(config)
        await bundle.write(config.output)
        
        // Check if this is a d.ts build
        const isDts = !config.output.entryFileNames
        
        // For d.ts files, rename from index.d.ts to packagename.d.ts
        let outputFile = config.output.file || `${config.output.dir}/${config.output.entryFileNames || packageName + '.' + config.output.format}`
        if (isDts) {
          const fs = await import('fs')
          const oldPath = `packages/${packageName}/dist/index.d.ts`
          const newPath = `packages/${packageName}/dist/${packageName}.d.ts`
          
          try {
            await fs.promises.rename(oldPath, newPath)
            outputFile = newPath
          } catch (e) {
            // File might already have correct name
            outputFile = newPath
          }
        }
        
        const formatType = isDts ? 'dts' : config.output.format
        console.log(`✅ Built ${packageName}:${formatType} → ${outputFile}`)
        return outputFile
      } catch (error) {
        console.error(`❌ Failed to build ${packageName}:${config.output.format}:`, error.message)
        throw error
      }
    })
    
    return Promise.all(formatBuilds)
  })
  
  const results = await Promise.all(buildPromises)
  const allResults = results.flat()
  
  const rolldownEndTime = performance.now()
  const rolldownTime = rolldownEndTime - rolldownStartTime
  
  const totalBuilds = allResults.length
  
  console.log(`🎉 Successfully built ${totalBuilds} outputs`)
  console.log(`⚡ Rolldown time: ${rolldownTime.toFixed(2)}ms`)
  
  // Analyze bundle sizes for all files (including .d.ts)
  if (allResults.length > 0) {
    analyzeBundles(allResults)
  }
  
  return allResults
}


async function main() {
  const startTime = performance.now()
  
  try {
    const isDev = values.dev || false
    const results = await buildAllPackages(positionals, isDev)
    
    if (values.watch) {
      console.log('👀 Watching for changes...')
      // Note: Watch mode would require additional implementation
      // For now, just build once
    }
    
    const totalTime = performance.now() - startTime
    console.log(`\n⏱️  Total time: ${totalTime.toFixed(2)}ms`)
    
    // Force exit after successful build
    process.exit(0)
    
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

main()