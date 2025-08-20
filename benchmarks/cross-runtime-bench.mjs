#!/usr/bin/env node
// Cross-runtime benchmark for Node.js and Deno

// Runtime detection
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node
const isDeno = typeof Deno !== 'undefined'

// Import compatibility layer
let performance, MessageChannel

if (isNode) {
  const perfHooks = await import('perf_hooks')
  const workerThreads = await import('worker_threads')
  performance = perfHooks.performance
  MessageChannel = workerThreads.MessageChannel
} else if (isDeno) {
  performance = globalThis.performance
  MessageChannel = globalThis.MessageChannel
}

// Import packages
const core = await import('../packages/core/dist/core.esm.js')
const shared = await import('../packages/shared/dist/shared.esm.js')

// Simple benchmark runner
class RuntimeBenchmark {
  constructor() {
    this.results = []
    this.runtime = isNode ? `Node.js ${process.version}` : isDeno ? `Deno ${Deno.version.deno}` : 'Unknown'
  }

  async run(name, fn, options = {}) {
    const { iterations = 10000, warmup = 100 } = options
    
    // Warmup
    for (let i = 0; i < warmup; i++) {
      await fn()
    }
    
    // Measure
    const times = []
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now()
      await fn()
      const iterEnd = performance.now()
      times.push(iterEnd - iterStart)
    }
    
    const totalTime = performance.now() - start
    
    // Calculate stats
    times.sort((a, b) => a - b)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p50 = times[Math.floor(times.length * 0.5)]
    const p95 = times[Math.floor(times.length * 0.95)]
    const p99 = times[Math.floor(times.length * 0.99)]
    const ops = 1000 / avg
    
    const result = {
      name,
      runtime: this.runtime,
      iterations,
      ops,
      avg: avg * 1000, // Convert to microseconds
      p50: p50 * 1000,
      p95: p95 * 1000,
      p99: p99 * 1000
    }
    
    this.results.push(result)
    return result
  }
  
  printResults() {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`BENCHMARK RESULTS - ${this.runtime}`)
    console.log('='.repeat(60))
    
    for (const result of this.results) {
      console.log(`\n${result.name}:`)
      console.log(`  Ops/sec: ${result.ops.toFixed(0).padStart(10)}`)
      console.log(`  Average: ${result.avg.toFixed(1).padStart(10)}μs`)
      console.log(`  P50:     ${result.p50.toFixed(1).padStart(10)}μs`)
      console.log(`  P95:     ${result.p95.toFixed(1).padStart(10)}μs`)
      console.log(`  P99:     ${result.p99.toFixed(1).padStart(10)}μs`)
    }
  }
  
  exportCSV() {
    console.log('\n\nCSV Export:')
    console.log('Runtime,Test,Ops/sec,Avg(μs),P50(μs),P95(μs),P99(μs)')
    
    for (const r of this.results) {
      console.log(`${this.runtime},"${r.name}",${r.ops.toFixed(0)},${r.avg.toFixed(1)},${r.p50.toFixed(1)},${r.p95.toFixed(1)},${r.p99.toFixed(1)}`)
    }
  }
}

// Main benchmark suite
async function runBenchmarks() {
  const bench = new RuntimeBenchmark()
  
  console.log(`Running benchmarks on ${bench.runtime}`)
  console.log(`Platform: ${isNode ? process.platform : isDeno ? Deno.build.os : 'unknown'}`)
  console.log(`Architecture: ${isNode ? process.arch : isDeno ? Deno.build.arch : 'unknown'}`)
  console.log(`Time: ${new Date().toISOString()}`)
  
  // 1. Type Guards
  console.log('\n[1/5] Testing Type Guards...')
  
  const testObj = { a: 1, b: 'test' }
  
  await bench.run('isString', () => {
    shared.isString('test')
    shared.isString(123)
  })
  
  await bench.run('isObject', () => {
    shared.isObject(testObj)
    shared.isObject(null)
  })
  
  await bench.run('Type guards batch', () => {
    shared.isString('test')
    shared.isNumber(123)
    shared.isArray([1, 2, 3])
    shared.isObject(testObj)
    shared.isDate(new Date())
  })
  
  // 2. isClonable
  console.log('\n[2/5] Testing isClonable...')
  
  const simpleObj = { x: 1, y: 'test' }
  const complexObj = {
    data: Array(50).fill(0).map((_, i) => ({ id: i, value: `item-${i}` }))
  }
  
  await bench.run('isClonable simple', () => {
    shared.isClonable(simpleObj)
  })
  
  await bench.run('isClonable complex', () => {
    shared.isClonable(complexObj)
  })
  
  // 3. WeakBiMap
  console.log('\n[3/5] Testing WeakBiMap...')
  
  const biMap = new shared.WeakBiMap()
  const keys = Array(100).fill(0).map((_, i) => ({ id: i }))
  const values = Array(100).fill(0).map((_, i) => `value-${i}`)
  
  // Populate
  keys.forEach((key, i) => biMap.set(key, values[i]))
  
  await bench.run('WeakBiMap get', () => {
    const key = keys[Math.floor(Math.random() * 100)]
    biMap.get(key)
  })
  
  await bench.run('WeakBiMap set', () => {
    const idx = Math.floor(Math.random() * 100)
    biMap.set(keys[idx], values[idx])
  })
  
  // 4. MessageChannel Raw
  console.log('\n[4/5] Testing MessageChannel...')
  
  await bench.run('MessageChannel create', () => {
    const { port1, port2 } = new MessageChannel()
    port1.close()
    port2.close()
  })
  
  await bench.run('MessageChannel roundtrip', async () => {
    const { port1, port2 } = new MessageChannel()
    
    const promise = new Promise((resolve) => {
      port2.once('message', (msg) => {
        port2.postMessage({ result: msg.a + msg.b })
      })
      
      port1.once('message', (msg) => {
        port1.close()
        port2.close()
        resolve(msg.result)
      })
    })
    
    port1.postMessage({ a: 5, b: 3 })
    await promise
  }, { iterations: 1000 })
  
  // 5. RPC
  console.log('\n[5/5] Testing RPC...')
  
  const api = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    nested: {
      method: (x) => x * 2
    }
  }
  
  await bench.run('RPC setup', () => {
    const { port1, port2 } = new MessageChannel()
    core.provide(api, port1)
    const remote = core.consume(port2)
    port1.close()
    port2.close()
  }, { iterations: 1000 })
  
  // Setup persistent channel
  const { port1, port2 } = new MessageChannel()
  core.provide(api, port1)
  const remote = core.consume(port2)
  
  // Let it initialize
  await new Promise(resolve => setTimeout(resolve, 10))
  
  await bench.run('RPC call', async () => {
    await remote.add(5, 3)
  }, { iterations: 1000 })
  
  await bench.run('RPC nested call', async () => {
    await remote.nested.method(10)
  }, { iterations: 1000 })
  
  // Cleanup
  port1.close()
  port2.close()
  
  // Print results
  bench.printResults()
  bench.exportCSV()
}

// Run
runBenchmarks().catch(console.error)