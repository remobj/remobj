import { consume } from '../../packages/core/dist/core.esm.js'
import { provide } from '../../packages/core/dist/core.esm.js'
import { MessageChannel } from 'node:worker_threads'


export const name = 'RPC Consumer Benchmarks'

// Setup test objects
const simpleAPI = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b
}

const nestedAPI = {
  math: {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    advanced: {
      power: (base: number, exp: number) => Math.pow(base, exp)
    }
  },
  data: {
    process: (items: any[]) => items.map(x => x * 2)
  }
}

// Benchmark: Simple function call
export async function simpleFunctionCall() {
  const { port1, port2 } = new MessageChannel()
  
  provide(simpleAPI, port1)
  const remote = consume<typeof simpleAPI>(port2)
  
  await remote.add(1, 2)
}

// Benchmark: Nested property access
export async function nestedPropertyAccess() {
  const { port1, port2 } = new MessageChannel()
  
  provide(nestedAPI, port1)
  const remote = consume<typeof nestedAPI>(port2)
  
  await remote.math.advanced.power(2, 8)
}

// Benchmark: Array argument passing
export async function arrayArguments() {
  const { port1, port2 } = new MessageChannel()
  const testArray = Array(100).fill(1)
  
  provide(nestedAPI, port1)
  const remote = consume<typeof nestedAPI>(port2)
  
  await remote.data.process(testArray)
}

// Benchmark: Multiple concurrent calls
export async function concurrentCalls() {
  const { port1, port2 } = new MessageChannel()
  
  provide(simpleAPI, port1)
  const remote = consume<typeof simpleAPI>(port2)
  
  await Promise.all([
    remote.add(1, 2),
    remote.add(3, 4),
    remote.add(5, 6),
    remote.multiply(2, 3)
  ])
}

// Benchmark: Proxy creation overhead
export function proxyCreation() {
  const { port1, port2 } = new MessageChannel()
  
  // Just create the consumer proxy
  consume<typeof simpleAPI>(port2)
  
  port1.close()
  port2.close()
}