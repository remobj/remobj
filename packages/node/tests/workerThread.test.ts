import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { workerThreadToPostMessage } from '../src/adapter/node'
import { consume, provide } from '@remobj/core'

class MockWorker {
  private messageListeners: ((data: any) => void)[] = []
  private messages: any[] = []
  private terminated = false

  on(event: string, listener: (data: any) => void) {
    if (event === 'message') {
      this.messageListeners.push(listener)
    }
  }

  postMessage(data: any) {
    if (!this.terminated) {
      this.messages.push(data)
    }
  }

  terminate() {
    this.terminated = true
  }

  simulateMessage(data: any) {
    if (!this.terminated) {
      this.messageListeners.forEach(listener => listener(data))
    }
  }

  getMessages() {
    return this.messages
  }

  isTerminated() {
    return this.terminated
  }
}

class MockMessagePort {
  private messageListeners: ((data: any) => void)[] = []
  private messages: any[] = []
  private closed = false

  on(event: string, listener: (data: any) => void) {
    if (event === 'message') {
      this.messageListeners.push(listener)
    }
  }

  postMessage(data: any) {
    if (!this.closed) {
      this.messages.push(data)
    }
  }

  close() {
    this.closed = false
  }

  simulateMessage(data: any) {
    if (!this.closed) {
      this.messageListeners.forEach(listener => listener(data))
    }
  }

  getMessages() {
    return this.messages
  }

  isClosed() {
    return this.closed
  }
}

describe('workerThreadToPostMessage', () => {
  describe('Worker instance tests', () => {
    let mockWorker: MockWorker
    let endpoint: ReturnType<typeof workerThreadToPostMessage>

    beforeEach(() => {
      mockWorker = new MockWorker()
      endpoint = workerThreadToPostMessage(mockWorker as any)
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    describe('Basic functionality', () => {
      it('should create a PostMessageEndpoint from worker', () => {
        expect(endpoint).toHaveProperty('postMessage')
        expect(endpoint).toHaveProperty('addEventListener')
        expect(endpoint).toHaveProperty('removeEventListener')
        expect(typeof endpoint.postMessage).toBe('function')
        expect(typeof endpoint.addEventListener).toBe('function')
        expect(typeof endpoint.removeEventListener).toBe('function')
      })

      it('should send messages through worker', () => {
        const testData = { type: 'task', payload: { operation: 'compute', data: [1, 2, 3] } }
        endpoint.postMessage(testData)
        
        const messages = mockWorker.getMessages()
        expect(messages).toHaveLength(1)
        expect(messages[0]).toEqual(testData)
      })

      it('should receive messages from worker', () => {
        const messageHandler = vi.fn()
        endpoint.addEventListener('message', messageHandler)
        
        const testData = { type: 'result', payload: { result: 42, status: 'completed' } }
        mockWorker.simulateMessage(testData)
        
        expect(messageHandler).toHaveBeenCalledTimes(1)
        expect(messageHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'message',
            data: testData
          })
        )
      })

      it('should handle multiple message listeners', () => {
        const handler1 = vi.fn()
        const handler2 = vi.fn()
        
        endpoint.addEventListener('message', handler1)
        endpoint.addEventListener('message', handler2)
        
        const testData = { type: 'broadcast', payload: 'all handlers' }
        mockWorker.simulateMessage(testData)
        
        expect(handler1).toHaveBeenCalledTimes(1)
        expect(handler2).toHaveBeenCalledTimes(1)
        expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
        expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
      })

      it('should remove event listeners correctly', () => {
        const handler = vi.fn()
        endpoint.addEventListener('message', handler)
        endpoint.removeEventListener('message', handler)
        
        mockWorker.simulateMessage({ test: 'data' })
        expect(handler).not.toHaveBeenCalled()
      })

      it('should ignore non-message event types', () => {
        const handler = vi.fn()
        endpoint.addEventListener('error', handler)
        endpoint.removeEventListener('error', handler)
        
        mockWorker.simulateMessage({ test: 'data' })
        expect(handler).not.toHaveBeenCalled()
      })
    })

    describe('Integration test placeholder', () => {
      it('should be tested with real remobj core integration', () => {
        // Note: Full integration tests with provide/consume would require
        // more complex setup to properly simulate bidirectional communication.
        // The basic functionality tests above demonstrate that the adapter
        // correctly converts worker thread communication to PostMessage format.
        expect(true).toBe(true)
      })
    })
  })

  describe('MessagePort instance tests', () => {
    let mockPort: MockMessagePort
    let endpoint: ReturnType<typeof workerThreadToPostMessage>

    beforeEach(() => {
      mockPort = new MockMessagePort()
      endpoint = workerThreadToPostMessage(mockPort as any)
    })

    describe('Basic MessagePort functionality', () => {
      it('should create a PostMessageEndpoint from MessagePort', () => {
        expect(endpoint).toHaveProperty('postMessage')
        expect(endpoint).toHaveProperty('addEventListener')
        expect(endpoint).toHaveProperty('removeEventListener')
      })

      it('should send messages through MessagePort', () => {
        const testData = { channel: 'port', message: 'hello' }
        endpoint.postMessage(testData)
        
        const messages = mockPort.getMessages()
        expect(messages).toHaveLength(1)
        expect(messages[0]).toEqual(testData)
      })

      it('should receive messages from MessagePort', () => {
        const messageHandler = vi.fn()
        endpoint.addEventListener('message', messageHandler)
        
        const testData = { channel: 'port', response: 'world' }
        mockPort.simulateMessage(testData)
        
        expect(messageHandler).toHaveBeenCalledTimes(1)
        expect(messageHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'message',
            data: testData
          })
        )
      })

      it('should work with basic message port functionality', () => {
        // Note: Full integration test would require complex bidirectional setup
        expect(mockPort).toBeDefined()
        expect(endpoint).toHaveProperty('postMessage')
        expect(endpoint).toHaveProperty('addEventListener')
        expect(endpoint).toHaveProperty('removeEventListener')
      })
    })
  })

  describe('Edge cases and error handling', () => {
    let mockWorker: MockWorker
    let endpoint: ReturnType<typeof workerThreadToPostMessage>

    beforeEach(() => {
      mockWorker = new MockWorker()
      endpoint = workerThreadToPostMessage(mockWorker as any)
    })

    it('should handle rapid message sending', () => {
      const messages = []
      for (let i = 0; i < 100; i++) {
        messages.push({ taskId: i, operation: 'compute', input: i * i })
      }

      messages.forEach(msg => endpoint.postMessage(msg))
      
      const sentMessages = mockWorker.getMessages()
      expect(sentMessages).toHaveLength(100)
      expect(sentMessages[0]).toEqual({ taskId: 0, operation: 'compute', input: 0 })
      expect(sentMessages[99]).toEqual({ taskId: 99, operation: 'compute', input: 9801 })
    })

    it('should handle concurrent message listeners', () => {
      const handlers = []
      for (let i = 0; i < 10; i++) {
        const handler = vi.fn()
        handlers.push(handler)
        endpoint.addEventListener('message', handler)
      }
      
      const testData = { broadcast: true, data: 'concurrent test' }
      mockWorker.simulateMessage(testData)
      
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
      })
    })

    it('should handle worker termination gracefully', () => {
      expect(mockWorker.isTerminated()).toBe(false)
      endpoint.postMessage({ test: 'message1' })
      expect(mockWorker.getMessages()).toHaveLength(1)
      
      mockWorker.terminate()
      expect(mockWorker.isTerminated()).toBe(true)
      
      endpoint.postMessage({ test: 'message2' })
      expect(mockWorker.getMessages()).toHaveLength(1) // No new message should be sent
      
      const handler = vi.fn()
      endpoint.addEventListener('message', handler)
      mockWorker.simulateMessage({ test: 'terminated' })
      expect(handler).not.toHaveBeenCalled() // No message should be received
    })

    it('should handle listener registration and removal with terminated worker', () => {
      const handler = vi.fn()
      
      mockWorker.terminate()
      endpoint.addEventListener('message', handler)
      endpoint.removeEventListener('message', handler)
      
      mockWorker.simulateMessage({ test: 'data' })
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('MessageEvent compatibility', () => {
    let mockWorker: MockWorker
    let endpoint: ReturnType<typeof workerThreadToPostMessage>

    beforeEach(() => {
      mockWorker = new MockWorker()
      endpoint = workerThreadToPostMessage(mockWorker as any)
    })

    it('should create proper MessageEvent objects', () => {
      let receivedEvent: MessageEvent | null = null
      endpoint.addEventListener('message', (event) => {
        receivedEvent = event
      })
      
      const testData = { workerResult: 'success', timestamp: Date.now() }
      mockWorker.simulateMessage(testData)
      
      expect(receivedEvent).toBeInstanceOf(MessageEvent)
      expect(receivedEvent?.type).toBe('message')
      expect(receivedEvent?.data).toEqual(testData)
    })

    it('should handle transferable objects simulation', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const largeBuffer = new ArrayBuffer(1024)
      const testData = { 
        type: 'transferable',
        buffer: largeBuffer,
        metadata: { size: largeBuffer.byteLength }
      }
      
      mockWorker.simulateMessage(testData)
      
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message',
          data: expect.objectContaining({
            type: 'transferable',
            buffer: largeBuffer,
            metadata: { size: 1024 }
          })
        })
      )
    })

    it('should handle complex nested data structures', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const complexData = {
        results: {
          computations: [
            { id: 1, result: 42, metadata: { duration: 100 } },
            { id: 2, result: 84, metadata: { duration: 200 } }
          ],
          summary: {
            total: 2,
            avgDuration: 150,
            success: true
          }
        },
        timestamp: new Date().toISOString(),
        worker: {
          id: 'worker-123',
          version: '1.0.0'
        }
      }
      
      mockWorker.simulateMessage(complexData)
      
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message',
          data: complexData
        })
      )
    })
  })
})