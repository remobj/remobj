#!/usr/bin/env node
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MessageChannel } from 'node:worker_threads'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Import packages
const core = await import('../packages/core/dist/core.esm.js')
const shared = await import('../packages/shared/dist/shared.esm.js')

// Benchmark runner with better organization
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

// Benchmark suites
async function runSharedBenchmarks(runner) {
  runner.printSection('SHARED PACKAGE BENCHMARKS')
  
  // 1. Type Guards
  runner.printSubSection('Type Guards')
  
  const testValues = {
    string: 'test',
    number: 123,
    object: { a: 1, b: 2 },
    array: [1, 2, 3],
    date: new Date(),
    map: new Map(),
    null: undefined,
    undefined: undefined
  }
  
  await runner.run('isString - positive', () => {
    shared.isString(testValues.string)
  })
  
  await runner.run('isString - negative', () => {
    shared.isString(testValues.number)
  })
  
  await runner.run('isObject - mixed types', () => {
    shared.isObject(testValues.object)
    shared.isObject(testValues.array)
    shared.isObject(testValues.null)
  })
  
  await runner.run('Type guards - batch check', () => {
    shared.isString(testValues.string)
    shared.isNumber(testValues.number)
    shared.isArray(testValues.array)
    shared.isObject(testValues.object)
    shared.isDate(testValues.date)
  })
  
  // 2. isClonable with cache
  runner.printSubSection('isClonable Performance')
  
  const simpleObj = { a: 1, b: 'test', c: true }
  const nestedObj = { 
    level1: { 
      level2: { 
        level3: { data: 'deep' } 
      } 
    } 
  }
  const complexObj = {
    users: Array(50).fill(0).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      meta: { created: Date.now() }
    }))
  }
  
  // First call - no cache
  await runner.run('isClonable - simple (cold)', () => {
    shared.isClonable({ x: Math.random() })
  }, { iterations: 1000 })
  
  // Cached calls
  await runner.run('isClonable - simple (cached)', () => {
    shared.isClonable(simpleObj)
  })
  
  await runner.run('isClonable - nested (cached)', () => {
    shared.isClonable(nestedObj)
  })
  
  await runner.run('isClonable - complex (cached)', () => {
    shared.isClonable(complexObj)
  })
  
  // 3. WeakBiMap
  runner.printSubSection('WeakBiMap Operations')
  
  const biMap = new shared.WeakBiMap()
  const objects = Array(100).fill(0).map((_, i) => ({ id: i }))
  const strings = Array(100).fill(0).map((_, i) => `string-${i}`)
  
  await runner.run('WeakBiMap - set (object → string)', () => {
    const idx = Math.floor(Math.random() * 100)
    biMap.set(objects[idx], strings[idx])
  })
  
  // Pre-populate for get tests
  objects.forEach((obj, i) => biMap.set(obj, strings[i]))
  
  await runner.run('WeakBiMap - get (by object)', () => {
    const obj = objects[Math.floor(Math.random() * 100)]
    biMap.get(obj)
  })
  
  await runner.run('WeakBiMap - get (by string)', () => {
    const str = strings[Math.floor(Math.random() * 100)]
    biMap.get(str)
  })
  
  await runner.run('WeakBiMap - has', () => {
    const obj = objects[Math.floor(Math.random() * 100)]
    biMap.has(obj)
  })
  
  await runner.run('WeakBiMap - delete + set', () => {
    const idx = Math.floor(Math.random() * 100)
    biMap.delete(objects[idx])
    biMap.set(objects[idx], strings[idx])
  })
}

async function runCoreBenchmarks(runner) {
  runner.printSection('CORE PACKAGE BENCHMARKS')
  
  // Test API
  const api = {
    // Sync methods
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    
    // Nested namespace
    math: {
      power: (base, exp) => Math.pow(base, exp),
      sqrt: (n) => Math.sqrt(n)
    },
    
    // Array processing
    processArray: (arr) => arr.map(x => x * 2),
    
    // Object return
    getUser: (id) => ({ id, name: `User ${id}`, timestamp: Date.now() })
  }
  
  // 1. Channel Setup
  runner.printSubSection('Channel Setup Overhead')
  
  await runner.run('MessageChannel creation', () => {
    const { port1, port2 } = new MessageChannel()
    port1.close()
    port2.close()
  })
  
  await runner.run('Multiplexed endpoint creation', () => {
    const { port1 } = new MessageChannel()
    const mux = core.createMultiplexedEndpoint(port1)
    port1.close()
  })
  
  await runner.run('Complete RPC setup', () => {
    const { port1, port2 } = new MessageChannel()
    core.provide(api, port1)
    const remote = core.consume(port2)
    port1.close()
    port2.close()
  }, { iterations: 1000 })
  
  // 2. RPC Calls with real channel
  runner.printSubSection('RPC Method Calls')
  
  // Setup persistent channel for call tests
  const { port1, port2 } = new MessageChannel()
  core.provide(api, port1)
  const remote = core.consume(port2)
  
  // Let the channel initialize
  await new Promise(resolve => setTimeout(resolve, 10))
  
  await runner.run('RPC - simple sync call', async () => {
    await remote.add(5, 3)
  }, { iterations: 1000, warmup: 50 })
  
  await runner.run('RPC - nested namespace call', async () => {
    await remote.math.sqrt(16)
  }, { iterations: 1000, warmup: 50 })
  
  await runner.run('RPC - array argument (10 items)', async () => {
    await remote.processArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  }, { iterations: 1000, warmup: 50 })
  
  await runner.run('RPC - object return', async () => {
    await remote.getUser(123)
  }, { iterations: 1000, warmup: 50 })
  
  // Cleanup
  port1.close()
  port2.close()
  
  // 3. Serialization
  runner.printSubSection('Serialization Performance')
  
  const dates = Array(10).fill(0).map(() => new Date())
  const objects = Array(10).fill(0).map((_, i) => ({ id: i, data: `test-${i}` }))
  
  await runner.run('Date plugin - 10 dates', () => {
    dates.map(d => ({ type: 'Date', value: d.getTime() }))
  })
  
  await runner.run('Object wrapping - 10 objects', () => {
    objects.map(obj => ({ type: 'wrapped', value: crypto.randomUUID() }))
  }, { iterations: 1000 })
}

async function runComparisonBenchmarks(runner) {
  runner.printSection('COMPARISON BENCHMARKS')
  
  // Raw MessageChannel baseline
  runner.printSubSection('Raw MessageChannel Baseline')
  
  await runner.run('Raw - simple roundtrip', async () => {
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
  
  await runner.run('Raw - data roundtrip', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.once('message', (msg) => {
        port2.postMessage({ result: msg.a + msg.b })
      })
      
      port1.once('message', (msg) => {
        port1.close()
        port2.close()
        resolve(msg.result)
      })
      
      port1.postMessage({ a: 5, b: 3 })
    })
  }, { iterations: 1000 })
  
  // Native alternatives
  runner.printSubSection('Native Alternatives')
  
  const nativeMap = new Map()
  const nativeWeakMap = new WeakMap()
  const testObj = { id: 1 }
  
  await runner.run('Map - set/get', () => {
    nativeMap.set(testObj, 'value')
    nativeMap.get(testObj)
  })
  
  await runner.run('WeakMap - set/get', () => {
    nativeWeakMap.set(testObj, 'value')
    nativeWeakMap.get(testObj)
  })
}

// Main
async function main() {
  const runner = new BenchmarkRunner()
  
  console.log('RemObj Performance Benchmark Suite')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Node: ${process.version}`)
  console.log(`Platform: ${process.platform} ${process.arch}`)
  
  await runSharedBenchmarks(runner)
  await runCoreBenchmarks(runner)
  await runComparisonBenchmarks(runner)
  
  console.log('\n' + '='.repeat(60))
  console.log('BENCHMARK COMPLETE')
  console.log('='.repeat(60))
}

main().catch(console.error)