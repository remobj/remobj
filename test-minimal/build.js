import { rolldown } from 'rolldown'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

async function build() {
  console.log('Building minimal test bundle...\n')
  
  // Check if packages are built
  const corePath = resolve(__dirname, '../packages/core/dist/core.esm.js')
  const coreExists = existsSync(corePath)
  
  if (!coreExists) {
    console.warn('⚠️  @remobj/core not built yet, bundling with external import')
    console.warn('   Run "npm run build" in the root first for accurate size!')
  }
  
  const build = await rolldown({
    input: './src/simple.js',
    external: coreExists ? [] : ['@remobj/core'],
    plugins: coreExists ? [{
      name: 'resolve-remobj',
      resolveId(source) {
        if (source === '@remobj/core') {
          return corePath
        }
        return null
      }
    }] : [],
    treeshake: {
      preset: 'recommended',
      moduleSideEffects: false
    },
    resolve: {
      extensions: ['.js', '.ts', '.json']
    }
  })

  // Generate the bundle
  const result = await build.generate({
    format: 'es',
    exports: 'auto',
    compact: true,
    minify: true
  })

  // Write the output
  const output = result.output[0]
  await build.write({
    dir: './dist',
    format: 'es',
    exports: 'auto',
    compact: true,
    minify: true,
    entryFileNames: 'bundle.js'
  })

  // Analyze the bundle size
  const code = output.code
  const originalSize = Buffer.byteLength(code, 'utf8')
  const gzipSize = gzipSync(code).length
  const brotliSize = brotliCompressSync(code, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY
    }
  }).length

  console.log('📦 Bundle Size Analysis')
  console.log('=' .repeat(50))
  console.log(`Original:  ${formatBytes(originalSize)}`)
  console.log(`Gzip:      ${formatBytes(gzipSize)} (${((1 - gzipSize/originalSize) * 100).toFixed(1)}% reduction)`)
  console.log(`Brotli:    ${formatBytes(brotliSize)} (${((1 - brotliSize/originalSize) * 100).toFixed(1)}% reduction)`)
  console.log('=' .repeat(50))
  
  // Show what's included
  console.log('\n📋 Bundle contains:')
  console.log('- provide() function')
  console.log('- consume() function')
  console.log('- Minimal RPC implementation')
  console.log('- MessageChannel support')
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    sizes: {
      original: originalSize,
      gzip: gzipSize,
      brotli: brotliSize
    },
    compression: {
      gzip: `${((1 - gzipSize/originalSize) * 100).toFixed(1)}%`,
      brotli: `${((1 - brotliSize/originalSize) * 100).toFixed(1)}%`
    }
  }
  
  await writeFileSync('./dist/size-report.json', JSON.stringify(report, undefined, 2))
  console.log('\n✅ Build complete! Run `npm test` to execute the bundle.')
}

function formatBytes(bytes) {
  if (bytes < 1024) {return `${bytes} B`}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`}
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Fix the import
import { writeFileSync } from 'node:fs'

build().catch(console.error)