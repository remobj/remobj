// Need internal imports for these functions
import { createArgumentWrappingEndpoint } from '../../packages/core/dist/core.esm.js'
import { createMultiplexedEndpoint } from '../../packages/core/dist/core.esm.js'
import { MessageChannel } from 'worker_threads'

export const name = 'Serialization Benchmarks'

// Test data
const primitiveArgs = [1, 'test', true, null, undefined]
const objectArgs = [
  { id: 1, name: 'test' },
  { data: [1, 2, 3] },
  { nested: { deep: { value: 42 } } }
]
const mixedArgs = [
  42,
  'string',
  { complex: true },
  [1, 2, 3],
  new Date(),
  null
]

function createWrappedEndpoint() {
  const { port1 } = new MessageChannel()
  const mux = createMultiplexedEndpoint(port1)
  return createArgumentWrappingEndpoint(mux)
}

// Benchmark: Primitive arguments wrapping
export function wrapPrimitives() {
  const endpoint = createWrappedEndpoint()
  
  endpoint.postMessage({
    requestID: 'test',
    operationType: 'call',
    propertyPath: 'test',
    args: primitiveArgs,
    consumerID: 'test',
    realmId: 'test'
  })
}

// Benchmark: Object arguments wrapping
export function wrapObjects() {
  const endpoint = createWrappedEndpoint()
  
  endpoint.postMessage({
    requestID: 'test',
    operationType: 'call',
    propertyPath: 'test',
    args: objectArgs,
    consumerID: 'test',
    realmId: 'test'
  })
}

// Benchmark: Mixed arguments wrapping
export function wrapMixed() {
  const endpoint = createWrappedEndpoint()
  
  endpoint.postMessage({
    requestID: 'test',
    operationType: 'call',
    propertyPath: 'test',
    args: mixedArgs,
    consumerID: 'test',
    realmId: 'test'
  })
}

// Benchmark: Large array wrapping
export function wrapLargeArray() {
  const endpoint = createWrappedEndpoint()
  const largeArray = Array(1000).fill(0).map((_, i) => i)
  
  endpoint.postMessage({
    requestID: 'test',
    operationType: 'call',
    propertyPath: 'test',
    args: [largeArray],
    consumerID: 'test',
    realmId: 'test'
  })
}

// Benchmark: Date plugin serialization
export function wrapDates() {
  const endpoint = createWrappedEndpoint()
  const dates = Array(10).fill(0).map(() => new Date())
  
  endpoint.postMessage({
    requestID: 'test',
    operationType: 'call',
    propertyPath: 'test',
    args: dates,
    consumerID: 'test',
    realmId: 'test'
  })
}