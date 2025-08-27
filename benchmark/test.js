import { MessageChannel } from 'node:worker_threads'
import * as core from '@remobj/core'
import * as shared from '@remobj/shared'
import { WeakBiMap } from '@remobj/weakbimap'

// Test data setup
const testData = {
  strings: ['test', 'hello', 'world', 'benchmark', 'performance'],
  numbers: [1, 42, 3.14, -17, 1000000],
  objects: [
    { id: 1, name: 'Test' },
    { nested: { deep: { value: 42 } } },
    { array: [1, 2, 3, 4, 5] }
  ],
  arrays: [
    [1, 2, 3, 4, 5],
    Array(100).fill(0).map((_, i) => i),
    Array(1000).fill(0).map((_, i) => ({ id: i }))
  ]
}

// RPC API for testing
const rpcAPI = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
  concat: (a, b) => a + b,
  math: {
    power: (base, exp) => Math.pow(base, exp),
    sqrt: (n) => Math.sqrt(n),
    abs: (n) => Math.abs(n)
  },
  array: {
    sum: (arr) => arr.reduce((a, b) => a + b, 0),
    double: (arr) => arr.map(x => x * 2),
    filter: (arr, min) => arr.filter(x => x > min)
  },
  object: {
    get: (id) => ({ id, name: `Item ${id}`, timestamp: Date.now() }),
    transform: (obj) => ({ ...obj, modified: true }),
    extract: (obj, key) => obj[key]
  }
}

// ============================================================
// SHARED PACKAGE BENCHMARKS
// ============================================================

export function typeGuard_isString() {
  return shared.isString(testData.strings[0])
}

export function typeGuard_isObject() {
  return shared.isObject(testData.objects[0])
}

export function typeGuard_isArray() {
  return shared.isArray(testData.arrays[0])
}

export function typeGuard_isNumber() {
  return shared.isNumber(testData.numbers[0])
}

export function typeGuard_mixed() {
  return (
    shared.isString(testData.strings[0]) &&
    shared.isNumber(testData.numbers[0]) &&
    shared.isObject(testData.objects[0]) &&
    shared.isArray(testData.arrays[0])
  )
}

export function isClonable_simple() {
  return shared.isClonable({ a: 1, b: 2, c: 3 })
}

export function isClonable_nested() {
  return shared.isClonable(testData.objects[1])
}

export function isClonable_array() {
  return shared.isClonable(testData.arrays[0])
}

export function string_camelize() {
  return shared.camelize('hello-world-test')
}

export function string_hyphenate() {
  return shared.hyphenate('helloWorldTest')
}

export function string_capitalize() {
  return shared.capitalize('hello')
}

// ============================================================
// WEAKBIMAP BENCHMARKS
// ============================================================

const biMap = new WeakBiMap()
const biMapObjects = Array(100).fill(0).map((_, i) => ({ id: i }))
const biMapStrings = Array(100).fill(0).map((_, i) => `string-${i}`)

// Pre-populate for get/has benchmarks
biMapObjects.forEach((obj, i) => biMap.set(obj, biMapStrings[i]))

export function weakBiMap_set() {
  const idx = Math.floor(Math.random() * 100)
  biMap.set(biMapObjects[idx], biMapStrings[idx])
}

export function weakBiMap_getByObject() {
  const idx = Math.floor(Math.random() * 100)
  return biMap.get(biMapObjects[idx])
}

export function weakBiMap_getByString() {
  const idx = Math.floor(Math.random() * 100)
  return biMap.get(biMapStrings[idx])
}

export function weakBiMap_has() {
  const idx = Math.floor(Math.random() * 100)
  return biMap.has(biMapObjects[idx])
}

export function weakBiMap_delete() {
  const idx = Math.floor(Math.random() * 100)
  return biMap.delete(biMapObjects[idx])
}

// ============================================================
// RPC BENCHMARKS
// ============================================================

// Setup RPC channel once
let rpcRemote = null
let rpcPort1 = null
let rpcPort2 = null

export async function setupRPC() {
  const channel = new MessageChannel()
  rpcPort1 = channel.port1
  rpcPort2 = channel.port2
  
  core.provide(rpcAPI, rpcPort1)
  rpcRemote = core.consume(rpcPort2)
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 50))
  
  // Verify it works
  const test = await rpcRemote.add(1, 2)
  if (test !== 3) throw new Error('RPC setup failed')
  
  return true
}

export async function cleanupRPC() {
  if (rpcPort1) {
    // Unref to allow process to exit
    if (rpcPort1.unref) rpcPort1.unref()
    rpcPort1.close()
  }
  if (rpcPort2) {
    if (rpcPort2.unref) rpcPort2.unref()
    rpcPort2.close()
  }
  rpcRemote = null
  rpcPort1 = null
  rpcPort2 = null
}

export async function rpc_simpleCall() {
  return await rpcRemote.add(5, 3)
}

export async function rpc_nestedCall() {
  return await rpcRemote.math.sqrt(16)
}

export async function rpc_arraySmall() {
  return await rpcRemote.array.double([1, 2, 3, 4, 5])
}

export async function rpc_arrayLarge() {
  const arr = Array(100).fill(0).map((_, i) => i)
  return await rpcRemote.array.sum(arr)
}

export async function rpc_objectReturn() {
  return await rpcRemote.object.get(42)
}

export async function rpc_parallel() {
  return await Promise.all([
    rpcRemote.add(1, 2),
    rpcRemote.math.sqrt(9),
    rpcRemote.object.get(1)
  ])
}

// ============================================================
// CHANNEL CREATION BENCHMARKS
// ============================================================

export function channel_messageChannelCreate() {
  const { port1, port2 } = new MessageChannel()
  port1.close()
  port2.close()
}

export function channel_multiplexedCreate() {
  const { port1 } = new MessageChannel()
  const mux = core.createMultiplexedEndpoint(port1)
  port1.close()
  return mux
}

export async function channel_rpcSetupAndTeardown() {
  const { port1, port2 } = new MessageChannel()
  core.provide(rpcAPI, port1)
  const remote = core.consume(port2)
  await new Promise(resolve => setImmediate(resolve))
  port1.close()
  port2.close()
}

// ============================================================
// NATIVE BASELINE BENCHMARKS
// ============================================================

const nativeMap = new Map()
const nativeWeakMap = new WeakMap()
const testObj = { id: 1 }

export function native_mapSet() {
  nativeMap.set(testObj, 'value')
}

export function native_mapGet() {
  return nativeMap.get(testObj)
}

export function native_weakMapSet() {
  nativeWeakMap.set(testObj, 'value')
}

export function native_weakMapGet() {
  return nativeWeakMap.get(testObj)
}

export function native_objectCreate() {
  return { id: 1, name: 'test', value: 42 }
}

export function native_arrayMap() {
  return [1, 2, 3, 4, 5].map(x => x * 2)
}