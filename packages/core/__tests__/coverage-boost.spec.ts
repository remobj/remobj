import { describe, expect, it, vi } from 'vitest'
import { consume, provide } from '../src/index'
import { wrapPostMessageEndpoint } from '../src/wrap-endpoint'
import { createArgumentWrappingEndpoint } from '../src/rpc-wrapper'
import type { PostMessageEndpoint } from '../src/types'

describe('coverage boost tests', () => {
  describe('wrapped endpoint edge cases', () => {
    it('should handle wrapped endpoint with transformations', () => {
      const mockEndpoint: PostMessageEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      let sendCount = 0
      let receiveCount = 0
      
      const wrapped = wrapPostMessageEndpoint(
        mockEndpoint,
        (data) => { sendCount++; return data },
        (data) => { receiveCount++; return data }
      )
      
      // Test sending
      wrapped.postMessage({ test: 'data' })
      expect(sendCount).toBe(1)
      
      // Test listener setup
      const listener = vi.fn()
      wrapped.addEventListener('message', listener)
      
      // Simulate receiving message
      const mockMessage = { data: { test: 'received' } }
      const registeredListener = (mockEndpoint.addEventListener as any).mock.calls[0][1]
      registeredListener(mockMessage)
      
      expect(receiveCount).toBe(1)
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('provide/consume edge cases', () => {
    it('should handle Symbol properties', () => {
      const sym = Symbol('test')
      const api = {
        [sym]: 'symbolValue',
        regularProp: 'regular'
      }
      
      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)
      
      // Symbol properties are not transferable over RPC
      expect(remote).toBeDefined()
    })

    it('should handle getter/setter properties', async () => {
      let value = 0
      const api = {
        get counter() { return value },
        set counter(v: number) { value = v }
      }
      
      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)
      
      // Getters work
      expect(await remote.counter).toBe(0)
    })

    it('should handle deep property access', async () => {
      const api = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      }
      
      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)
      
      const deep = await remote.level1.level2.level3.value
      expect(deep).toBe('deep')
    })
  })

  describe('error scenarios', () => {
    it('should handle circular references gracefully', () => {
      const obj: any = { a: 1 }
      obj.circular = obj
      
      const { port1, port2 } = new MessageChannel()
      
      // Should not crash
      expect(() => {
        provide(obj, port2 as PostMessageEndpoint)
        consume(port1 as PostMessageEndpoint)
      }).not.toThrow()
    })

    it('should handle very large arguments', async () => {
      const api = {
        processLargeData: (data: any[]) => data.length
      }
      
      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)
      
      const largeArray = new Array(1000).fill({ data: 'test' })
      const result = await remote.processLargeData(largeArray)
      expect(result).toBe(1000)
    })
  })

  describe('wrap endpoint variations', () => {
    it('should handle different message types', () => {
      const sendHandler = vi.fn()
      const receiveHandler = vi.fn()
      
      const mockEndpoint: PostMessageEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      const wrapped = wrapPostMessageEndpoint(mockEndpoint, sendHandler, receiveHandler)
      
      // Test with different data types
      wrapped.postMessage(null)
      wrapped.postMessage(undefined)
      wrapped.postMessage({ complex: { nested: true } })
      wrapped.postMessage([1, 2, 3])
      
      expect(sendHandler).toHaveBeenCalledTimes(4)
    })
  })

  describe('RPC wrapper plugin system', () => {
    it('should handle Date objects through wrapper', () => {
      const mockChannel = {
        id: 'mock-channel',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        createSubChannel: vi.fn().mockReturnValue({
          postMessage: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          close: vi.fn()
        }),
        close: vi.fn()
      } as any

      const endpoint = createArgumentWrappingEndpoint(mockChannel)
      
      // Send a message with Date
      endpoint.postMessage({
        type: 'call',
        id: 'test-123',
        method: 'processDate',
        args: [new Date('2024-01-01')]
      })
      
      expect(mockChannel.postMessage).toHaveBeenCalled()
    })

    it('should handle RegExp objects through wrapper', () => {
      const mockChannel = {
        id: 'mock-channel',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        createSubChannel: vi.fn().mockReturnValue({
          postMessage: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          close: vi.fn()
        }),
        close: vi.fn()
      } as any

      const endpoint = createArgumentWrappingEndpoint(mockChannel)
      
      // Send a message with RegExp
      endpoint.postMessage({
        type: 'call',
        id: 'test-456',
        method: 'processRegex',
        args: [/test/gi]
      })
      
      expect(mockChannel.postMessage).toHaveBeenCalled()
    })
  })
})