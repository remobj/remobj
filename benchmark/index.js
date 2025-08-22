import { performance } from 'node:perf_hooks'
import * as tests from './test.js'

// Benchmark configuration
const config = {
  warmup: 100,      // Warmup iterations
  iterations: 1000, // Test iterations
  async_iterations: 100, // Reduced for async tests
  timeout: 5000     // Max time per benchmark in ms
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

// Format number with proper padding
function formatNumber(num, decimals = 2) {
  return num.toFixed(decimals).padStart(10)
}

// Format ops/sec with units
function formatOps(ops) {
  if (ops > 1000000) {
    return `${(ops / 1000000).toFixed(2)}M`
  } else if (ops > 1000) {
    return `${(ops / 1000).toFixed(2)}K`
  }
  return ops.toFixed(0)
}

// Run a single benchmark
async function runBenchmark(name, fn, isAsync = false) {
  const iterations = isAsync ? config.async_iterations : config.iterations
  
  try {
    // Warmup
    for (let i = 0; i < config.warmup; i++) {
      await fn()
    }
    
    // Collect samples
    const samples = []
    const startTotal = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      const end = performance.now()
      samples.push(end - start)
      
      // Check timeout
      if (performance.now() - startTotal > config.timeout) {
        console.log(`${colors.yellow}  ⚠ Timeout - completed ${i} iterations${colors.reset}`)
        break
      }
    }
    
    // Calculate statistics
    samples.sort((a, b) => a - b)
    const sum = samples.reduce((a, b) => a + b, 0)
    const avg = sum / samples.length
    const median = samples[Math.floor(samples.length / 2)]
    const p95 = samples[Math.floor(samples.length * 0.95)]
    const p99 = samples[Math.floor(samples.length * 0.99)]
    const ops = 1000 / avg
    
    // Output results
    console.log(`${colors.green}✓${colors.reset} ${name}`)
    console.log(`  ${colors.dim}Ops/sec:${colors.reset} ${formatOps(ops).padStart(8)} ops/s`)
    console.log(`  ${colors.dim}Average:${colors.reset} ${formatNumber(avg * 1000, 3)} μs`)
    console.log(`  ${colors.dim}Median: ${colors.reset} ${formatNumber(median * 1000, 3)} μs`)
    console.log(`  ${colors.dim}P95:    ${colors.reset} ${formatNumber(p95 * 1000, 3)} μs`)
    console.log(`  ${colors.dim}P99:    ${colors.reset} ${formatNumber(p99 * 1000, 3)} μs`)
    console.log()
    
    return { name, ops, avg, median, p95, p99 }
  } catch (error) {
    console.log(`${colors.yellow}✗${colors.reset} ${name}`)
    console.log(`  ${colors.dim}Error: ${error.message}${colors.reset}`)
    console.log()
    return null
  }
}

// Main benchmark runner
async function main() {
  console.log(`${colors.cyan}${colors.bright}`)
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║                 RemObj Benchmark Suite                    ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(colors.reset)
  
  console.log(`${colors.dim}Date: ${new Date().toISOString()}`)
  console.log(`Node: ${process.version}`)
  console.log(`Platform: ${process.platform} ${process.arch}${colors.reset}`)
  console.log()
  
  const results = []
  
  // ============================================================
  // SHARED PACKAGE
  // ============================================================
  console.log(`${colors.blue}${colors.bright}━━━ Shared Package ━━━${colors.reset}`)
  console.log()
  
  console.log(`${colors.cyan}Type Guards:${colors.reset}`)
  results.push(await runBenchmark('isString', tests.typeGuard_isString))
  results.push(await runBenchmark('isObject', tests.typeGuard_isObject))
  results.push(await runBenchmark('isArray', tests.typeGuard_isArray))
  results.push(await runBenchmark('isNumber', tests.typeGuard_isNumber))
  results.push(await runBenchmark('mixed checks', tests.typeGuard_mixed))
  
  console.log(`${colors.cyan}Clonable Checks:${colors.reset}`)
  results.push(await runBenchmark('simple object', tests.isClonable_simple))
  results.push(await runBenchmark('nested object', tests.isClonable_nested))
  results.push(await runBenchmark('array', tests.isClonable_array))
  
  console.log(`${colors.cyan}String Utils:${colors.reset}`)
  results.push(await runBenchmark('camelize', tests.string_camelize))
  results.push(await runBenchmark('hyphenate', tests.string_hyphenate))
  results.push(await runBenchmark('capitalize', tests.string_capitalize))
  
  // ============================================================
  // WEAKBIMAP
  // ============================================================
  console.log(`${colors.blue}${colors.bright}━━━ WeakBiMap ━━━${colors.reset}`)
  console.log()
  
  results.push(await runBenchmark('set', tests.weakBiMap_set))
  results.push(await runBenchmark('get (by object)', tests.weakBiMap_getByObject))
  results.push(await runBenchmark('get (by string)', tests.weakBiMap_getByString))
  results.push(await runBenchmark('has', tests.weakBiMap_has))
  results.push(await runBenchmark('delete', tests.weakBiMap_delete))
  
  // ============================================================
  // RPC
  // ============================================================
  console.log(`${colors.blue}${colors.bright}━━━ RPC (Remote Procedure Calls) ━━━${colors.reset}`)
  console.log()
  
  // Setup RPC
  console.log(`${colors.dim}Setting up RPC channel...${colors.reset}`)
  await tests.setupRPC()
  console.log(`${colors.green}✓ RPC channel ready${colors.reset}`)
  console.log()
  
  results.push(await runBenchmark('simple call', tests.rpc_simpleCall, true))
  results.push(await runBenchmark('nested call', tests.rpc_nestedCall, true))
  results.push(await runBenchmark('array (small)', tests.rpc_arraySmall, true))
  results.push(await runBenchmark('array (large)', tests.rpc_arrayLarge, true))
  results.push(await runBenchmark('object return', tests.rpc_objectReturn, true))
  results.push(await runBenchmark('parallel calls', tests.rpc_parallel, true))
  
  // Cleanup RPC
  await tests.cleanupRPC()
  
  // ============================================================
  // CHANNEL CREATION
  // ============================================================
  console.log(`${colors.blue}${colors.bright}━━━ Channel Creation ━━━${colors.reset}`)
  console.log()
  
  results.push(await runBenchmark('MessageChannel', tests.channel_messageChannelCreate))
  results.push(await runBenchmark('Multiplexed', tests.channel_multiplexedCreate))
  results.push(await runBenchmark('RPC setup/teardown', tests.channel_rpcSetupAndTeardown, true))
  
  // ============================================================
  // NATIVE BASELINE
  // ============================================================
  console.log(`${colors.blue}${colors.bright}━━━ Native Baseline ━━━${colors.reset}`)
  console.log()
  
  results.push(await runBenchmark('Map.set', tests.native_mapSet))
  results.push(await runBenchmark('Map.get', tests.native_mapGet))
  results.push(await runBenchmark('WeakMap.set', tests.native_weakMapSet))
  results.push(await runBenchmark('WeakMap.get', tests.native_weakMapGet))
  results.push(await runBenchmark('Object.create', tests.native_objectCreate))
  results.push(await runBenchmark('Array.map', tests.native_arrayMap))
  
  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`${colors.cyan}${colors.bright}━━━ Summary ━━━${colors.reset}`)
  console.log()
  
  // Find fastest and slowest
  const validResults = results.filter(r => r !== null)
  if (validResults.length > 0) {
    validResults.sort((a, b) => b.ops - a.ops)
    
    console.log(`${colors.green}Fastest operations:${colors.reset}`)
    validResults.slice(0, 5).forEach(r => {
      console.log(`  ${formatOps(r.ops).padStart(8)} ops/s - ${r.name}`)
    })
    
    console.log()
    console.log(`${colors.yellow}Slowest operations:${colors.reset}`)
    validResults.slice(-5).reverse().forEach(r => {
      console.log(`  ${formatOps(r.ops).padStart(8)} ops/s - ${r.name}`)
    })
  }
  
  console.log()
  console.log(`${colors.green}${colors.bright}✓ Benchmark complete${colors.reset}`)
}

// Run benchmarks
main().catch(error => {
  console.error(`${colors.yellow}Benchmark failed:${colors.reset}`, error)
  process.exit(1)
})