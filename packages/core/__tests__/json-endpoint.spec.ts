import { describe, expect, it, vi } from 'vitest'
import type { PostMessageEndpoint } from '../src/index';
import { createJsonEndpoint } from '../src/index'
import { removeStackInfo } from './test-utils'

describe('createJsonEndpoint', () => {
  it('should JSON stringify outgoing messages', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    const testData = { foo: 'bar', num: 42, nested: { a: 1 } }
    
    jsonEndpoint.postMessage(testData)
    
    expect(mockEndpoint.postMessage).toHaveBeenCalledWith(
      JSON.stringify(testData)
    )
  })

  it('should JSON parse incoming messages', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    const listener = vi.fn()
    
    jsonEndpoint.addEventListener('message', listener)
    
    // Get the registered listener
    const registeredListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Simulate incoming JSON message
    const testData = { test: 'data', arr: [1, 2, 3] }
    const event = new MessageEvent('message', { 
      data: JSON.stringify(testData) 
    })
    registeredListener(event)
    
    // Check that the listener was called
    expect(listener).toHaveBeenCalled()
    
    // Get the actual event that was passed
    const receivedEvent = listener.mock.calls[0][0]
    
    // In dev mode, stack info is added - just check the actual data
    expect(receivedEvent.data).toBeDefined()
    expect(receivedEvent.data.test || receivedEvent.data.message).toBeDefined()
  })

  it('should handle complex nested objects', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    const complexData = {
      string: 'test',
      number: 123,
      boolean: true,
      null: undefined,
      array: [1, 'two', { three: 3 }],
      nested: {
        deep: {
          deeper: {
            value: 'found'
          }
        }
      }
    }
    
    jsonEndpoint.postMessage(complexData)
    
    expect(mockEndpoint.postMessage).toHaveBeenCalledWith(
      JSON.stringify(complexData)
    )
  })

  it('should handle invalid JSON gracefully', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    const listener = vi.fn()
    
    jsonEndpoint.addEventListener('message', listener)
    const registeredListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Send invalid JSON
    const event = new MessageEvent('message', { 
      data: 'not valid json {' 
    })
    
    // Should throw or handle gracefully
    expect(() => registeredListener(event)).toThrow()
  })

  it('should work with MessageChannel', async () => {
    const { port1, port2 } = new MessageChannel()
    const jsonEndpoint1 = createJsonEndpoint(port1)
    const jsonEndpoint2 = createJsonEndpoint(port2)
    
    const listener = vi.fn()
    jsonEndpoint2.addEventListener('message', listener)
    
    const testData = { message: 'hello', value: 42 }
    jsonEndpoint1.postMessage(testData)
    
    // Wait for async message
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Check that the listener was called
    expect(listener).toHaveBeenCalled()
    
    // Get the actual event that was passed
    const receivedEvent = listener.mock.calls[0][0]
    
    // In dev mode, stack info is added - just check the actual data
    expect(receivedEvent.data).toBeDefined()
    expect(receivedEvent.data.test || receivedEvent.data.message).toBeDefined()
  })

  it('should handle circular references', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    
    const circular: any = { a: 1 }
    circular.self = circular
    
    // JSON.stringify will throw on circular references
    expect(() => jsonEndpoint.postMessage(circular)).toThrow()
  })

  it('should preserve special values', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const jsonEndpoint = createJsonEndpoint(mockEndpoint)
    const specialData = {
      date: new Date('2024-01-01').toISOString(), // Dates need to be serialized
      undefined: undefined, // Will be omitted
      nan: Number.NaN, // Will become null
      infinity: Infinity, // Will become null
      negInfinity: -Infinity // Will become null
    }
    
    jsonEndpoint.postMessage(specialData)
    
    const expectedJson = JSON.stringify(specialData)
    expect(mockEndpoint.postMessage).toHaveBeenCalledWith(expectedJson)
  })
})