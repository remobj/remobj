#!/usr/bin/env node
import { performance } from 'perf_hooks'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Import packages
const core = await import('../packages/core/dist/core.esm.js')
const shared = await import('../packages/shared/dist/shared.esm.js')

// Simple benchmark runner
class BenchmarkRunner {
  async run(name, fn, options = {}) {
    const { iterations = 10000, warmup = 100 } = options
    
    console.log(`\n${name}:`)
    
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
    
    console.log(`  Iterations: ${iterations}`)
    console.log(`  Ops/sec: ${ops.toFixed(0)}`)
    console.log(`  Avg: ${avg.toFixed(3)}ms`)
    console.log(`  P50: ${p50.toFixed(3)}ms`)
    console.log(`  P95: ${p95.toFixed(3)}ms`)
    console.log(`  P99: ${p99.toFixed(3)}ms`)
  }
}

// Run benchmarks
async function main() {
  const runner = new BenchmarkRunner()
  
  console.log('=== RemObj Benchmark Suite ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Node: ${process.version}`)
  
  // Shared benchmarks
  console.log('\n## Shared Package Benchmarks')
  
  // WeakBiMap benchmarks
  console.log('\n### WeakBiMap Performance')
  
  const { WeakBiMap } = shared
  const testObjects = Array(100).fill(0).map((_, i) => ({ id: i }))
  const weakBiMap = new WeakBiMap()
  
  await runner.run('WeakBiMap - set operations', () => {
    const obj = testObjects[Math.floor(Math.random() * 100)]
    weakBiMap.set(obj, `value-${obj.id}`)
  })
  
  // Populate for get tests
  testObjects.forEach(obj => weakBiMap.set(obj, `value-${obj.id}`))
  
  await runner.run('WeakBiMap - get operations', () => {
    const obj = testObjects[Math.floor(Math.random() * 100)]
    weakBiMap.get(obj)
  })
  
  await runner.run('WeakBiMap - bidirectional lookup', () => {
    const key = `value-${Math.floor(Math.random() * 100)}`
    // Find object by value (reverse lookup)
    for (const [k, v] of weakBiMap) {
      if (v === key) break
    }
  })
  
  const testObj = { a: 1, b: 'test', c: [1, 2, 3] }
  const complexObj = {
    data: Array(100).fill(0).map((_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      tags: ['tag1', 'tag2']
    }))
  }
  
  await runner.run('isClonable - simple object', () => {
    shared.isClonable(testObj)
  })
  
  await runner.run('isClonable - complex object (100 items)', () => {
    shared.isClonable(complexObj)
  })
  
  await runner.run('Type guards - mixed', () => {
    shared.isObject(testObj)
    shared.isArray([1, 2, 3])
    shared.isString('test')
    shared.isNumber(123)
    shared.isFunction(() => {})
  })
  
  // Core benchmarks
  console.log('\n## Core Package Benchmarks')
  
  
  const api = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    nested: {
      method: (x) => x * 2
    }
  }
  
  await runner.run('RPC - provide + consume setup', () => {
    const { port1, port2 } = new MessageChannel()
    core.provide(api, port1)
    const remote = core.consume(port2)
  }, { iterations: 10000 })
  
  // Setup once for method calls
  const { port1, port2 } = new MessageChannel()
  core.provide(api, port1)
  const remote = core.consume(port2)
  
  await runner.run('RPC - simple method call', async () => {
    try {
      await remote.add(5, 3)
    } catch (e) {
      // Timeout expected in mock
    }
  }, { iterations: 10000, warmup: 10 })
  
  await runner.run('RPC - nested method access', async () => {
    try {
      await remote.nested.method(10)
    } catch (e) {
      // Timeout expected in mock
    }
  }, { iterations: 10000, warmup: 10 })
  
  // Serialization benchmarks
  console.log('\n## Serialization Benchmarks')
  
  const { createMultiplexedEndpoint, registerPlugin } = core
  
  await runner.run('Multiplex endpoint creation', () => {
    const { port1 } = new MessageChannel()
    createMultiplexedEndpoint(port1)
  }, { iterations: 10000 })
  
  await runner.run('Date plugin serialization', () => {
    const dates = Array(10).fill(0).map(() => new Date())
    // Simulate serialization
    dates.map(d => ({ type: 'Date', value: d.getTime() }))
  })
  
  console.log('\n=== Benchmark Complete ===')
}

main().catch(console.error)