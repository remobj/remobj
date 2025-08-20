#!/usr/bin/env node
import { WeakBiMap } from '../packages/shared/dist/shared.esm.js'
import { performance } from 'node:perf_hooks'

class WeakBiMapBenchmark {
  async run(name, fn, options = { iterations: 10_000, warmup: 100 }) {
    console.log(`\n${name}:`)
    
    // Warmup
    for (let i = 0; i < options.warmup; i++) {
      await fn()
    }
    
    // Measure
    const times = []
    const start = performance.now()
    
    for (let i = 0; i < options.iterations; i++) {
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
    
    console.log(`  Iterations: ${options.iterations}`)
    console.log(`  Ops/sec: ${ops.toFixed(0)}`)
    console.log(`  Avg: ${(avg * 1000).toFixed(1)}ns`)
    console.log(`  P50: ${(p50 * 1000).toFixed(1)}ns`)
    console.log(`  P95: ${(p95 * 1000).toFixed(1)}ns`)
    console.log(`  P99: ${(p99 * 1000).toFixed(1)}ns`)
  }
}

async function main() {
  const bench = new WeakBiMapBenchmark()
  
  console.log('=== WeakBiMap Performance Benchmarks ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Node: ${process.version}`)
  
  // Test objects
  const objects = Array(1000).fill(0).map((_, i) => ({ id: i, data: `Object ${i}` }))
  const primitives = Array(1000).fill(0).map((_, i) => `string-${i}`)
  
  // Test 1: WeakBiMap vs Map vs WeakMap
  console.log('\n## 1. Basic Operations Comparison')
  
  // WeakBiMap set/get
  const weakBiMap = new WeakBiMap()
  await bench.run('WeakBiMap - set (object key)', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    weakBiMap.set(obj, `value-${obj.id}`)
  })
  
  await bench.run('WeakBiMap - get (object key)', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    weakBiMap.get(obj)
  })
  
  await bench.run('WeakBiMap - set (primitive key)', () => {
    const key = primitives[Math.floor(Math.random() * 1000)]
    weakBiMap.set(key, { value: key })
  })
  
  await bench.run('WeakBiMap - get (primitive key)', () => {
    const key = primitives[Math.floor(Math.random() * 1000)]
    weakBiMap.get(key)
  })
  
  // Regular Map comparison
  const regularMap = new Map()
  await bench.run('Map - set', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    regularMap.set(obj, `value-${obj.id}`)
  })
  
  await bench.run('Map - get', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    regularMap.get(obj)
  })
  
  // WeakMap comparison
  const weakMap = new WeakMap()
  await bench.run('WeakMap - set', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    weakMap.set(obj, `value-${obj.id}`)
  })
  
  await bench.run('WeakMap - get', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    weakMap.get(obj)
  })
  
  // Test 2: Bidirectional lookup
  console.log('\n## 2. Bidirectional Features')
  
  // Populate WeakBiMap with bidirectional data
  const biMap = new WeakBiMap()
  objects.forEach((obj, i) => {
    biMap.set(obj, objects[(i + 1) % 1000])
  })
  
  await bench.run('WeakBiMap - bidirectional lookup', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    const value = biMap.get(obj)
    if (value) {biMap.get(value)} // Reverse lookup
  })
  
  // Test 3: Cleanup operations
  console.log('\n## 3. Cleanup Performance')
  
  const cleanupMap = new WeakBiMap()
  objects.forEach(obj => cleanupMap.set(obj, { data: Math.random() }))
  
  await bench.run('WeakBiMap - has check', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    cleanupMap.has(obj)
  })
  
  await bench.run('WeakBiMap - delete', () => {
    const obj = objects[Math.floor(Math.random() * 1000)]
    cleanupMap.delete(obj)
    cleanupMap.set(obj, { data: Math.random() }) // Re-add for next iteration
  })
  
  // Test 4: Iteration performance
  console.log('\n## 4. Iteration Performance')
  
  const iterMap = new WeakBiMap()
  primitives.slice(0, 100).forEach((key, i) => {
    iterMap.set(key, objects[i])
  })
  
  await bench.run('WeakBiMap - forEach (100 items)', () => {
    let count = 0
    iterMap.forEach(() => count++)
  }, { iterations: 1000 })
  
  await bench.run('WeakBiMap - entries iteration', () => {
    let count = 0
    for (const [k, v] of iterMap) {
      count++
    }
  }, { iterations: 1000 })
  
  // Test 5: Memory pressure simulation
  console.log('\n## 5. Under Memory Pressure')
  
  await bench.run('WeakBiMap - mixed operations', () => {
    const map = new WeakBiMap()
    // Simulate typical usage pattern
    for (let i = 0; i < 10; i++) {
      const key = Math.random() > 0.5 ? objects[i] : `key-${i}`
      map.set(key, { value: i })
    }
    for (let i = 0; i < 5; i++) {
      const key = Math.random() > 0.5 ? objects[i] : `key-${i}`
      map.get(key)
    }
    map.size // Triggers cleanup
  }, { iterations: 1000 })
  
  console.log('\n=== Benchmark Complete ===')
  console.log('\nKey findings:')
  console.log('- Compare WeakBiMap overhead vs Map/WeakMap')
  console.log('- Check if cleanup operations cause performance spikes')
  console.log('- Evaluate bidirectional lookup cost')
}

main().catch(console.error)