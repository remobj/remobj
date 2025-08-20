import { parseArgs } from 'node:util'
import { rolldown } from 'rolldown'
import { createRequire } from 'node:module'
import { discoverPackages, fuzzyMatch } from './discover-packages.js'
import { createWorkspaceAliases } from './workspace-aliases.js'
import { BUILD_FORMATS, createOutputConfig, getDefineFlags, resolveExternals } from './build-formats.js'
import { buildDts } from './build-dts.js'
import { analyzeBundles } from './bundle-analyzer.js'

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
  const formats = values.formats ? values.formats.split(',') : (buildOptions.formats || defaultFormats)
  
  const configs = []
  
  // JavaScript builds
  formats.forEach(format => {
    const outputConfig = createOutputConfig(packageName, format, buildOptions)
    const defineFlags = getDefineFlags(format, pkg.version, isDev)
    
    configs.push({
      input: `packages/${packageName}/src/index.ts`,
      external: resolveExternals(format, pkg, buildOptions),
      output: {
        dir: `packages/${packageName}/dist`,
        format: outputConfig.format,
        name: outputConfig.name,
        entryFileNames: outputConfig.file,
        globals: outputConfig.globals,
        minify: true//format != 'esm-bundler'
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
      define: defineFlags
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
  
  // Build all packages in parallel (JS only)
  const buildPromises = packagesToBuild.map(async (packageName) => {
    const configs = await createConfigsForPackage(packageName, isDev)
    
    // Build all formats in parallel for this package
    const formatBuilds = configs.map(async (config) => {
      try {
        const bundle = await rolldown(config)
        await bundle.write(config.output)
        const outputFile = config.output.file || `${config.output.dir}/${config.output.entryFileNames || packageName + '.' + config.output.format}`
        console.log(`✅ Built ${packageName}:${config.output.format} → ${outputFile}`)
        return outputFile
      } catch (error) {
        console.error(`❌ Failed to build ${packageName}:${config.output.format}:`, error.message)
        throw error
      }
    })
    
    return Promise.all(formatBuilds)
  })
  
  const jsResults = await Promise.all(buildPromises)
  
  // Build DTS files sequentially to avoid race conditions
  const dtsResults = []
  for (const packageName of packagesToBuild) {
    const pkg = require(`../packages/${packageName}/package.json`)
    const defaultFormats = ['esm-production', 'esm-bundler', 'umd']
    const formats = values.formats ? values.formats.split(',') : (pkg.buildOptions?.formats || defaultFormats)
    
    if (formats.some(f => f.startsWith('esm'))) {
      try {
        await buildDts(packageName)
        dtsResults.push(`packages/${packageName}/dist/${packageName}.d.ts`)
      } catch (error) {
        console.warn(`⚠️  Skipping DTS build for ${packageName} due to error`)
        console.warn(`   Error: ${error.message}`)
        console.warn(`   JavaScript builds completed successfully.`)
        dtsResults.push(undefined)
      }
    }
  }
  
  const results = [...jsResults.flat(), ...dtsResults.filter(Boolean)]
  const allOutputs = results.flat()
  const totalBuilds = allOutputs.length
  
  console.log(`🎉 Successfully built ${totalBuilds} outputs`)
  
  // Analyze bundle sizes for JavaScript files only (exclude .d.ts files)
  const jsOutputs = allOutputs.filter(file => file && typeof file === 'string' && file.endsWith('.js'))
  if (jsOutputs.length > 0) {
    analyzeBundles(jsOutputs)
  }
  
  return allOutputs
}


async function main() {
  try {
    const isDev = values.dev || false
    const results = await buildAllPackages(positionals, isDev)
    
    if (values.watch) {
      console.log('👀 Watching for changes...')
      // Note: Watch mode would require additional implementation
      // For now, just build once
    }
    
    // Force exit after successful build
    process.exit(0)
    
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

main()