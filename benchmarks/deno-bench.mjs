#!/usr/bin/env -S deno run --allow-read
// Deno-compatible version of organized benchmarks

// Runtime compatibility
const isNode = typeof process !== 'undefined'
const isDeno = typeof Deno !== 'undefined'

// Import compatibility
let performance, MessageChannel

if (isDeno) {
  performance = globalThis.performance
  MessageChannel = globalThis.MessageChannel
} else {
  const perfHooks = await import('node:perf_hooks')
  const workerThreads = await import('node:worker_threads')
  performance = perfHooks.performance
  MessageChannel = workerThreads.MessageChannel
}

// Import packages
const core = await import('../packages/core/dist/core.esm.js')
const shared = await import('../packages/shared/dist/shared.esm.js')

// Benchmark runner
class BenchmarkRunner {
  constructor() {
    this.results = []
  }

  async run(name, fn, options = {}) {
    const { iterations = 10_000, warmup = 100 } = options
    
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
      iterations,
      totalTime,
      ops,
      avg,
      p50,
      p95,
      p99
    }
    
    this.results.push(result)
    this.printResult(result)
    
    return result
  }
  
  printResult(result) {
    console.log(`\n${result.name}:`)
    console.log(`  Iterations: ${result.iterations.toLocaleString()}`)
    console.log(`  Ops/sec: ${result.ops.toFixed(0).padStart(10)}`)
    console.log(`  Average: ${(result.avg * 1000).toFixed(1).padStart(10)}μs`)
    console.log(`  P50:     ${(result.p50 * 1000).toFixed(1).padStart(10)}μs`)
    console.log(`  P95:     ${(result.p95 * 1000).toFixed(1).padStart(10)}μs`)
    console.log(`  P99:     ${(result.p99 * 1000).toFixed(1).padStart(10)}μs`)
  }
  
  printSection(title) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(title)
    console.log('='.repeat(60))
  }
  
  printSubSection(title) {
    console.log(`\n### ${title}`)
  }
}

// Selected benchmarks for comparison
async function main() {
  const runner = new BenchmarkRunner()
  const runtime = isDeno ? `Deno ${Deno.version.deno}` : `Node.js ${process.version}`
  
  console.log('Cross-Runtime Benchmark Comparison')
  console.log(`Runtime: ${runtime}`)
  console.log(`Date: ${new Date().toISOString()}`)
  if (isDeno) {
    console.log(`Platform: ${Deno.build.os} ${Deno.build.arch}`)
  } else {
    console.log(`Platform: ${process.platform} ${process.arch}`)
  }
  
  runner.printSection('PERFORMANCE COMPARISON')
  
  // 1. Type Guards
  runner.printSubSection('Type Guards')
  
  await runner.run('isString check', () => {
    shared.isString('test')
    shared.isString(123)
  })
  
  await runner.run('Type guards batch', () => {
    shared.isString('test')
    shared.isNumber(123)
    shared.isArray([1, 2, 3])
    shared.isObject({ a: 1 })
    shared.isDate(new Date())
  })
  
  // 2. isClonable
  runner.printSubSection('isClonable Cache')
  
  const simpleObj = { a: 1, b: 'test' }
  const complexObj = {
    data: Array(50).fill(0).map((_, i) => ({ id: i }))
  }
  
  await runner.run('isClonable simple', () => {
    shared.isClonable(simpleObj)
  })
  
  await runner.run('isClonable complex', () => {
    shared.isClonable(complexObj)
  })
  
  // 3. WeakBiMap
  runner.printSubSection('WeakBiMap')
  
  const biMap = new shared.WeakBiMap()
  const objects = Array(100).fill(0).map((_, i) => ({ id: i }))
  objects.forEach((obj, i) => biMap.set(obj, `value-${i}`))
  
  await runner.run('WeakBiMap get', () => {
    const obj = objects[Math.floor(Math.random() * 100)]
    biMap.get(obj)
  })
  
  // 4. MessageChannel
  runner.printSubSection('MessageChannel')
  
  await runner.run('MessageChannel create', () => {
    const { port1, port2 } = new MessageChannel()
    port1.close()
    port2.close()
  })
  
  await runner.run('MessageChannel roundtrip', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.once('message', () => {
        port2.postMessage('pong')
      })
      
      port1.once('message', () => {
        port1.close()
        port2.close()
        resolve()
      })
      
      port1.postMessage('ping')
    })
  }, { iterations: 1000 })
  
  // 5. RPC
  runner.printSubSection('RPC Performance')
  
  const api = {
    add: (a, b) => a + b,
    nested: { method: (x) => x * 2 }
  }
  
  const { port1, port2 } = new MessageChannel()
  core.provide(api, port1)
  const remote = core.consume(port2)
  
  await new Promise(resolve => setTimeout(resolve, 10))
  
  await runner.run('RPC call', async () => {
    await remote.add(5, 3)
  }, { iterations: 1000 })
  
  await runner.run('RPC nested', async () => {
    await remote.nested.method(10)
  }, { iterations: 1000 })
  
  port1.close()
  port2.close()
  
  console.log('\n' + '='.repeat(60))
  console.log('BENCHMARK COMPLETE')
  console.log('='.repeat(60))
}

main().catch(console.error)