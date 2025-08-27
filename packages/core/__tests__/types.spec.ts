import { describe, it, expect, vi } from 'vitest'
import type { Listener, PostMessageEndpointBase, PostMessageEndpointString, PostMessageEndpoint } from '../src/types'

describe('PostMessage Types', () => {
  describe('Listener', () => {
    it('should define a proper message event listener type', () => {
      const mockEvent = new MessageEvent('message', { data: 'test' })
      
      const listener: Listener<string> = (ev) => {
        expect(ev.data).toBe('test')
        return 'handled'
      }
      
      const result = listener.call(null, mockEvent)
      expect(result).toBe('handled')
    })

    it('should support different data types', () => {
      const numberEvent = new MessageEvent('message', { data: 42 })
      const objectEvent = new MessageEvent('message', { data: { key: 'value' } })
      
      const numberListener: Listener<number> = (ev) => ev.data * 2
      const objectListener: Listener<{ key: string }> = (ev) => ev.data.key
      
      expect(numberListener.call(null, numberEvent)).toBe(84)
      expect(objectListener.call(null, objectEvent)).toBe('value')
    })
  })

  describe('PostMessageEndpointBase', () => {
    it('should define a complete endpoint interface', () => {
      const mockEndpoint: PostMessageEndpointBase<string> = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      // Test postMessage
      mockEndpoint.postMessage('test message')
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith('test message')
      
      // Test addEventListener
      const listener = vi.fn()
      mockEndpoint.addEventListener('message', listener)
      expect(mockEndpoint.addEventListener).toHaveBeenCalledWith('message', listener)
      
      // Test removeEventListener
      mockEndpoint.removeEventListener('message', listener)
      expect(mockEndpoint.removeEventListener).toHaveBeenCalledWith('message', listener)
    })

    it('should support different data types', () => {
      interface CustomMessage {
        type: string
        payload: unknown
      }
      
      const customEndpoint: PostMessageEndpointBase<CustomMessage> = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      const message: CustomMessage = { type: 'test', payload: { data: 'value' } }
      customEndpoint.postMessage(message)
      expect(customEndpoint.postMessage).toHaveBeenCalledWith(message)
    })
  })

  describe('PostMessageEndpointString', () => {
    it('should be specialized for string messages', () => {
      const stringEndpoint: PostMessageEndpointString = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      // Should only accept string messages
      stringEndpoint.postMessage('string message')
      expect(stringEndpoint.postMessage).toHaveBeenCalledWith('string message')
      
      // Listener should receive string data
      const listener: Listener<string> = vi.fn()
      stringEndpoint.addEventListener('message', listener)
      expect(stringEndpoint.addEventListener).toHaveBeenCalledWith('message', listener)
    })
  })

  describe('PostMessageEndpoint', () => {
    it('should accept any message type', () => {
      const anyEndpoint: PostMessageEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      // Should accept any type of message
      anyEndpoint.postMessage('string')
      anyEndpoint.postMessage(42)
      anyEndpoint.postMessage({ object: true })
      anyEndpoint.postMessage(['array'])
      
      expect(anyEndpoint.postMessage).toHaveBeenCalledTimes(4)
    })

    it('should work with MessagePort-like objects', () => {
      // Simulate a MessagePort-like implementation
      class MockMessagePort implements PostMessageEndpoint {
        private listeners: Listener<any>[] = []
        
        postMessage(data: any): void {
          // Simulate async message delivery
          setTimeout(() => {
            const event = new MessageEvent('message', { data })
            this.listeners.forEach(listener => listener.call(this, event))
          }, 0)
        }
        
        addEventListener(type: 'message', listener: Listener<any>): void {
          if (type === 'message') {
            this.listeners.push(listener)
          }
        }
        
        removeEventListener(type: 'message', listener: Listener<any>): void {
          if (type === 'message') {
            const index = this.listeners.indexOf(listener)
            if (index > -1) {
              this.listeners.splice(index, 1)
            }
          }
        }
      }
      
      const port = new MockMessagePort()
      const listener = vi.fn()
      
      port.addEventListener('message', listener)
      port.postMessage('test')
      
      // Wait for async message
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
              data: 'test',
              type: 'message'
            })
          )
          resolve()
        }, 10)
      })
    })
  })

  describe('Type compatibility', () => {
    it('should ensure PostMessageEndpointString extends PostMessageEndpointBase', () => {
      const stringEndpoint: PostMessageEndpointString = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      // Should be assignable to base type
      const baseEndpoint: PostMessageEndpointBase<string> = stringEndpoint
      expect(baseEndpoint).toBe(stringEndpoint)
    })

    it('should ensure PostMessageEndpoint extends PostMessageEndpointBase', () => {
      const anyEndpoint: PostMessageEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      
      // Should be assignable to base type
      const baseEndpoint: PostMessageEndpointBase<any> = anyEndpoint
      expect(baseEndpoint).toBe(anyEndpoint)
    })
  })
})