#!/usr/bin/env node
import { MessageChannel } from 'node:worker_threads'
import { performance } from 'node:perf_hooks'

// Minimal MessageChannel benchmark without any library overhead

class BaselineBenchmark {
  async run(name, fn, options = { iterations: 1000, warmup: 100 }) {
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
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`  Ops/sec: ${ops.toFixed(0)}`)
    console.log(`  Avg: ${avg.toFixed(3)}ms`)
    console.log(`  P50: ${p50.toFixed(3)}ms`)
    console.log(`  P95: ${p95.toFixed(3)}ms`)
    console.log(`  P99: ${p99.toFixed(3)}ms`)
  }
}

async function main() {
  const bench = new BaselineBenchmark()
  
  console.log('=== MessageChannel Baseline Benchmarks ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Node: ${process.version}`)
  console.log('\nTesting raw MessageChannel performance without RemObj...')
  
  // Test 1: Minimal ping-pong
  console.log('\n## 1. Minimal Ping-Pong')
  
  await bench.run('Simple string message', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.on('message', (msg) => {
        port2.postMessage('pong')
      })
      
      port1.on('message', (msg) => {
        port1.close()
        port2.close()
        resolve()
      })
      
      port1.postMessage('ping')
    })
  }, { iterations: 1000 })
  
  // Test 2: Number calculation
  console.log('\n## 2. Simple Calculation')
  
  await bench.run('Add two numbers', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.on('message', (msg) => {
        const result = msg.a + msg.b
        port2.postMessage({ result })
      })
      
      port1.on('message', (msg) => {
        port1.close()
        port2.close()
        resolve(msg.result)
      })
      
      port1.postMessage({ a: 5, b: 3 })
    })
  }, { iterations: 1000 })
  
  // Test 3: Reused channel
  console.log('\n## 3. Reused Channel Performance')
  
  const { port1: reusedPort1, port2: reusedPort2 } = new MessageChannel()
  let requestId = 0
  const pendingRequests = new Map()
  
  // Setup persistent handler
  reusedPort2.on('message', (msg) => {
    const result = msg.a + msg.b
    reusedPort2.postMessage({ id: msg.id, result })
  })
  
  reusedPort1.on('message', (msg) => {
    const resolve = pendingRequests.get(msg.id)
    if (resolve) {
      pendingRequests.delete(msg.id)
      resolve(msg.result)
    }
  })
  
  await bench.run('Reused channel calls', async () => {
    const id = requestId++
    
    return new Promise((resolve) => {
      pendingRequests.set(id, resolve)
      reusedPort1.postMessage({ id, a: 5, b: 3 })
    })
  }, { iterations: 10_000 })
  
  // Test 4: JSON serialization overhead
  console.log('\n## 4. JSON Serialization Overhead')
  
  const complexData = {
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    items: Array(10).fill(0).map((_, i) => ({ id: i, value: `Item ${i}` })),
    metadata: { timestamp: Date.now(), version: '1.0.0' }
  }
  
  await bench.run('Complex object transfer', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.on('message', (msg) => {
        port2.postMessage(msg) // Echo back
      })
      
      port1.on('message', (msg) => {
        port1.close()
        port2.close()
        resolve()
      })
      
      port1.postMessage(complexData)
    })
  }, { iterations: 1000 })
  
  // Test 5: Minimal overhead (no data)
  console.log('\n## 5. Absolute Minimal Overhead')
  
  await bench.run('Empty message', async () => {
    const { port1, port2 } = new MessageChannel()
    
    return new Promise((resolve) => {
      port2.on('message', () => {
        port2.postMessage()
      })
      
      port1.on('message', () => {
        port1.close()
        port2.close()
        resolve()
      })
      
      port1.postMessage()
    })
  }, { iterations: 1000 })
  
  // Cleanup reused channel
  reusedPort1.close()
  reusedPort2.close()
  
  console.log('\n=== Benchmark Complete ===')
  console.log('\nCompare these results with RemObj to see the library overhead.')
}

main().catch(console.error)