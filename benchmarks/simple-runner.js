#!/usr/bin/env node
import { performance } from 'node:perf_hooks'

// Simple benchmark runner that works with CommonJS and ES modules
class SimpleBenchmark {
  async run(name, fn, options = { iterations: 100_000, warmup: 100 }) {
    // Warmup
    for (let i = 0; i < options.warmup; i++) {
      await fn()
    }
    
    // Measure
    const times = []
    for (let i = 0; i < options.iterations; i++) {
      const start = performance.now()
      await fn()
      const end = performance.now()
      times.push(end - start)
    }
    
    // Calculate stats
    times.sort((a, b) => a - b)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const p95 = times[Math.floor(times.length * 0.95)]
    const ops = 1000 / avg
    
    console.log(`${name}:`)
    console.log(`  ${ops.toFixed(0)} ops/sec`)
    console.log(`  ${avg.toFixed(3)}ms avg`)
    console.log(`  ${p95.toFixed(3)}ms p95`)
    console.log()
  }
}

// Import built modules
async function runBenchmarks() {
  const bench = new SimpleBenchmark()
  
  // Dynamic imports of built modules
  const core = await import('../packages/core/dist/core.esm.js')
  const shared = await import('../packages/shared/dist/shared.esm.js')
  
  console.log('=== Type Guards Benchmarks ===')
  
  const testObj = { a: 1, b: 'test', c: true }
  const complexObj = { 
    data: Array(100).fill(0).map((_, i) => ({ id: i, value: `item-${i}` })) 
  }
  
  await bench.run('isClonable - simple object', () => {
    shared.isClonable(testObj)
  })
  
  await bench.run('isClonable - complex object', () => {
    shared.isClonable(complexObj)
  })
  
  await bench.run('isObject checks', () => {
    shared.isObject(testObj)
    shared.isObject('string')
    shared.isObject(123)
    shared.isObject()
  })
  
  console.log('=== RPC Benchmarks ===')
  
  // Create a simple MessageChannel mock
  const createMockChannel = () => {
    const listeners1 = []
    const listeners2 = []
    
    return {
      port1: {
        postMessage: (data) => {
          listeners2.forEach(fn => fn({ data }))
        },
        addEventListener: (event, fn) => {
          if (event === 'message') {listeners1.push(fn)}
        },
        removeEventListener: (event, fn) => {
          if (event === 'message') {
            const idx = listeners1.indexOf(fn)
            if (idx !== -1) {listeners1.splice(idx, 1)}
          }
        }
      },
      port2: {
        postMessage: (data) => {
          listeners1.forEach(fn => fn({ data }))
        },
        addEventListener: (event, fn) => {
          if (event === 'message') {listeners2.push(fn)}
        },
        removeEventListener: (event, fn) => {
          if (event === 'message') {
            const idx = listeners2.indexOf(fn)
            if (idx !== -1) {listeners2.splice(idx, 1)}
          }
        }
      }
    }
  }
  
  const api = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b
  }
  
  await bench.run('RPC setup (provide + consume)', () => {
    const { port1, port2 } = createMockChannel()
    core.provide(api, port1)
    const remote = core.consume(port2)
  }, { iterations: 100_000 })
  
  // Setup once for call benchmarks
  const { port1, port2 } = createMockChannel()
  core.provide(api, port1)
  const remote = core.consume(port2)
  
  await bench.run('RPC call - simple', async () => {
    await remote.add(1, 2)
  }, { iterations: 100_000 })
}

runBenchmarks().catch(console.error)