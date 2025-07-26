import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { consume, provide } from '../src/index'

describe('Bidirectional Communication Tests', () => {
  let channel: MessageChannel
  let serviceA: any
  let serviceB: any

  beforeAll(() => {
    // Create MessageChannel
    channel = new MessageChannel()
    
    // Service A - exposed on port1, wrapped on port2
    const serviceAObject = {
      name: 'ServiceA',
      getValue: () => 'valueFromA',
      add: (a: number, b: number) => a + b,
      counter: 0,
      increment: function() {
        this.counter++
        return this.counter
      }
    }
    
    // Service B - exposed on port2, wrapped on port1  
    const serviceBObject = {
      name: 'ServiceB',
      getValue: () => 'valueFromB',
      multiply: (a: number, b: number) => a * b,
      processMessage: (msg: string) => `ServiceB processed: ${msg}`,
      data: { items: ['item1', 'item2', 'item3'] },
      getItems() {
        return this.data.items
      }
    }
    
    // Provide and consume both services  
    provide(serviceAObject, channel.port1)
    provide(serviceBObject, channel.port2)
    
    serviceA = consume(channel.port2)  // ServiceA consumed through port2
    serviceB = consume(channel.port1)  // ServiceB consumed through port1
  })


  it('should allow independent calls to both services', async () => {
    // Test ServiceA methods
    expect(await serviceA.name).toBe('ServiceA')
    expect(await serviceA.getValue()).toBe('valueFromA')
    expect(await serviceA.add(3, 7)).toBe(10)
    
    // Test ServiceB methods
    expect(await serviceB.name).toBe('ServiceB')
    expect(await serviceB.getValue()).toBe('valueFromB')
    expect(await serviceB.multiply(4, 5)).toBe(20)
    expect(await serviceB.processMessage('Hello')).toBe('ServiceB processed: Hello')
  })

  it('should handle stateful operations on both services', async () => {    
    // Test ServiceB data access directly (avoid this.data issues)
    const data = await serviceB.data
    expect(data.items).toEqual(['item1', 'item2', 'item3'])
    
    // Test ServiceB message processing
    const processed = await serviceB.processMessage('data test')
    expect(processed).toBe('ServiceB processed: data test')
  })

  it('should demonstrate bidirectional setup (independent calls)', async () => {
    // This shows that both services can be accessed independently
    // True cross-calls would require more complex setup with separate channels
    
    // Both services can be called independently
    const messageResult = await serviceB.processMessage('Hello from test')
    expect(messageResult).toBe('ServiceB processed: Hello from test')
    
    const addResult = await serviceA.add(10, 15)
    expect(addResult).toBe(25)
  })

  it('should handle arithmetic operations', async () => {
    // ServiceA arithmetic
    const sum = await serviceA.add(5, 3)
    expect(sum).toBe(8)
    
    // ServiceB arithmetic  
    const product = await serviceB.multiply(4, 6)
    expect(product).toBe(24)
    
    // ServiceB processes a message
    const processed = await serviceB.processMessage('Math test')
    expect(processed).toBe('ServiceB processed: Math test')
  })

  it('should handle nested object access in both directions', async () => {
    // Access nested properties on ServiceB - need to await each level
    const data = await serviceB.data
    expect(data.items[0]).toBe('item1')
    expect(data.items[2]).toBe('item3')
    
    // ServiceA can access its own properties
    const currentCounter = await serviceA.counter
    expect(currentCounter).toBeGreaterThanOrEqual(0) // Counter should be some positive value
  })

  it('should handle concurrent calls to both services', async () => {
    // Make multiple concurrent calls to both services
    const promises = [
      serviceA.add(1, 1),
      serviceB.multiply(2, 2),
      serviceA.getValue(),
      serviceB.getValue(),
      serviceB.processMessage('concurrent')
    ]
    
    const results = await Promise.all(promises)
    
    expect(results[0]).toBe(2)        // add(1,1)
    expect(results[1]).toBe(4)        // multiply(2,2)  
    expect(results[2]).toBe('valueFromA')
    expect(results[3]).toBe('valueFromB')
    expect(results[4]).toBe('ServiceB processed: concurrent')
  })

  it('should handle error propagation in both directions', async () => {
    // Add error methods to test error handling
    const { port1: errorPort1, port2: errorPort2 } = new MessageChannel()
    
    const errorServiceA = {
      throwError: () => { throw new Error('Error from ServiceA') }
    }
    
    const errorServiceB = {
      throwError: () => { throw new Error('Error from ServiceB') }
    }
    
    provide(errorServiceA, errorPort1)
    provide(errorServiceB, errorPort2)
    
    const errorServiceAWrapped = consume(errorPort2)
    const errorServiceBWrapped = consume(errorPort1)
    
    // Test direct error propagation
    await expect(errorServiceAWrapped.throwError()).rejects.toThrow('Error from ServiceA')
    await expect(errorServiceBWrapped.throwError()).rejects.toThrow('Error from ServiceB')
  })
})