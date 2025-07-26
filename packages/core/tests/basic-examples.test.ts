import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { consume, provide } from '../src/index'
import { assertValidRPCResponse, assertIsFunction, assertPropertyExists, assertValidRPCCall, assertValidKeyChain } from '../src/helper'

describe('Basic Examples Tests', () => {
  let calculatorChannel: MessagePort
  
  beforeAll(() => {
    // Setup Calculator Service
    const mc = new MessageChannel()
    
    const calculator = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => {
        if (b === 0) throw new Error('Division by zero')
        return a / b
      },
      getVersion: () => '1.0.0',
      cb: (a: () => {}) => a(),
      cb2: () => (() => 42),
      cc: class {
        prop = 55
        fn() {
          return 56
        }
      }
    }
    
    provide(calculator, mc.port1)
    calculatorChannel = mc.port2
  })


  it('should provide a calculator object and use it via consume', async () => {
    const remoteCalculator: any = consume(calculatorChannel)

    // Test basic arithmetic operations
    expect(await remoteCalculator.add(5, 3)).toBe(8)
    expect(await remoteCalculator.subtract(10, 4)).toBe(6)
    expect(await remoteCalculator.multiply(6, 7)).toBe(42)
    expect(await remoteCalculator.divide(15, 3)).toBe(5)
    expect(await remoteCalculator.getVersion()).toBe('1.0.0')
    
    expect(await remoteCalculator.cb(() => 40)).toBe(40)
    const cb2 = await remoteCalculator.cb2()
    expect(await cb2()).toBe(42)

    const x = await new remoteCalculator.cc()
    expect(await x.fn()).toBe(56)
    expect(await x.prop).toBe(55)

    // Test error handling
    await expect(remoteCalculator.divide(10, 0)).rejects.toThrow('Division by zero')
  })


  it('should handle edge cases properly', async () => {
    const remoteCalculator: any = consume(calculatorChannel)
    expect(remoteCalculator[Symbol()]).toBe(undefined)
  })

  
  it('should handle edge cases properly2', async () => {
    const p = new MessageChannel()
    provide({}, p.port1)
    // Try to provide on the same port again - this should throw
    expect(() => provide({}, p.port1)).toThrow('Endpoint is already exposed: Use a different endpoint or createChannel() for multiple APIs')
  })

  it('should test helper function error cases', () => {
    // Test assertValidKeyChain - non-array
    expect(() => assertValidKeyChain('not-array')).toThrow('Invalid keyChain: must be an array')
    expect(() => assertValidKeyChain(null)).toThrow('Invalid keyChain: must be an array')
    
    // Test assertValidKeyChain - unsafe property names
    expect(() => assertValidKeyChain(['__proto__'])).toThrow('Invalid keyChain: contains unsafe property names')
    expect(() => assertValidKeyChain(['prototype'])).toThrow('Invalid keyChain: contains unsafe property names')
    expect(() => assertValidKeyChain(['constructor'])).toThrow('Invalid keyChain: contains unsafe property names')
    expect(() => assertValidKeyChain([123 as any])).toThrow('Invalid keyChain: contains unsafe property names') // non-string
    
    // Test assertValidRPCCall - not an object
    expect(() => assertValidRPCCall(null)).toThrow('Invalid RPC call: not an object')
    expect(() => assertValidRPCCall('string')).toThrow('Invalid RPC call: not an object')
    
    // Test assertValidRPCCall - missing id or type
    expect(() => assertValidRPCCall({ type: 'call' })).toThrow('Invalid RPC call: missing id or type') // missing id
    expect(() => assertValidRPCCall({ id: '123' })).toThrow('Invalid RPC call: missing id or type') // missing type
    
    // Test assertValidRPCCall - invalid args
    expect(() => assertValidRPCCall({ id: '123', type: 'call', keyChain: [], args: 'not-array' })).toThrow('Invalid RPC call: args must be an array')
    expect(() => assertValidRPCCall({ id: '123', type: 'construct', keyChain: [], args: 'not-array' })).toThrow('Invalid RPC call: args must be an array')
    
    // Test assertValidRPCResponse - not an object
    expect(() => assertValidRPCResponse(null)).toThrow('Invalid RPC response: not an object')
    expect(() => assertValidRPCResponse('string')).toThrow('Invalid RPC response: not an object')
    
    // Test assertValidRPCResponse - missing id
    expect(() => assertValidRPCResponse({ type: 'response' })).toThrow('Invalid RPC response: missing id or invalid type')
    
    // Test assertIsFunction - non-function target  
    expect(() => assertIsFunction('not a function', 'test')).toThrow("Target is not a function: 'test'")
    expect(() => assertIsFunction(42, 'number')).toThrow("Target is not a function: 'number'")
    
    // Test assertPropertyExists - non-object
    expect(() => assertPropertyExists(null, 'property')).toThrow("Cannot access property on non-object: 'property'")
    expect(() => assertPropertyExists('string', 'property')).toThrow("Cannot access property on non-object: 'property'")
    expect(() => assertPropertyExists(undefined, 'property')).toThrow("Cannot access property on non-object: 'property'")
    
    // Test assertPropertyExists - property not found
    expect(() => assertPropertyExists({}, 'nonExistentProperty')).toThrow("Property not found or not accessible: 'nonExistentProperty'")
    expect(() => assertPropertyExists({ a: 1 }, 'b')).toThrow("Property not found or not accessible: 'b'")
    const x = { a: 1 }
    Object.setPrototypeOf(x, {b:55})
    expect(() => assertPropertyExists(x, 'b')).not.toThrow()
  })

  it('should test deep prototype chain limit', () => {
    // Test assertPropertyExists - prototype chain limit (>100 levels)
    // Create a deep prototype chain
    let deepObj = {}
    let current = deepObj
    
    // Create exactly 101 levels to trigger the limit
    for (let i = 0; i < 101; i++) {
      const next = {}
      Object.setPrototypeOf(current, next)
      current = next
    }
    
    // This should throw the prototype chain limit error
    expect(() => assertPropertyExists(deepObj, 'nonExistent')).toThrow('Loop stopped too much inherits')
  })

})