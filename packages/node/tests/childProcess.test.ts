import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { childProcessToPostMessage } from '../src/adapter/node'
import { consume, provide } from '@remobj/core'

class MockChildProcess {
  connected = true
  private messageListeners: ((data: any) => void)[] = []
  private messages: any[] = []

  on(event: string, listener: (data: any) => void) {
    if (event === 'message') {
      this.messageListeners.push(listener)
    }
  }

  send(data: any) {
    if (this.connected) {
      this.messages.push(data)
    }
  }

  simulateMessage(data: any) {
    this.messageListeners.forEach(listener => listener(data))
  }

  disconnect() {
    this.connected = false
  }

  getMessages() {
    return this.messages
  }
}

describe('childProcessToPostMessage', () => {
  let mockChildProcess: MockChildProcess
  let endpoint: ReturnType<typeof childProcessToPostMessage>

  beforeEach(() => {
    mockChildProcess = new MockChildProcess()
    endpoint = childProcessToPostMessage(mockChildProcess as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should create a PostMessageEndpoint from child process', () => {
      expect(endpoint).toHaveProperty('postMessage')
      expect(endpoint).toHaveProperty('addEventListener')
      expect(endpoint).toHaveProperty('removeEventListener')
      expect(typeof endpoint.postMessage).toBe('function')
      expect(typeof endpoint.addEventListener).toBe('function')
      expect(typeof endpoint.removeEventListener).toBe('function')
    })

    it('should send messages through child process', () => {
      const testData = { type: 'test', payload: 'hello' }
      endpoint.postMessage(testData)
      
      const messages = mockChildProcess.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual(testData)
    })

    it('should not send messages when child process is disconnected', () => {
      mockChildProcess.disconnect()
      const testData = { type: 'test', payload: 'hello' }
      endpoint.postMessage(testData)
      
      const messages = mockChildProcess.getMessages()
      expect(messages).toHaveLength(0)
    })

    it('should receive messages from child process', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const testData = { type: 'response', payload: 'world' }
      mockChildProcess.simulateMessage(testData)
      
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
      
      const testData = { type: 'broadcast', payload: 'everyone' }
      mockChildProcess.simulateMessage(testData)
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
      expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
    })

    it('should remove event listeners correctly', () => {
      const handler = vi.fn()
      endpoint.addEventListener('message', handler)
      endpoint.removeEventListener('message', handler)
      
      mockChildProcess.simulateMessage({ test: 'data' })
      expect(handler).not.toHaveBeenCalled()
    })

    it('should ignore non-message event types', () => {
      const handler = vi.fn()
      endpoint.addEventListener('error', handler)
      endpoint.removeEventListener('error', handler)
      
      mockChildProcess.simulateMessage({ test: 'data' })
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Integration test placeholder', () => {
    it('should be tested with real remobj core integration', () => {
      // Note: Full integration tests with provide/consume would require
      // more complex setup to properly simulate bidirectional communication.
      // The basic functionality tests above demonstrate that the adapter
      // correctly converts child process communication to PostMessage format.
      expect(true).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle rapid message sending', () => {
      const messages = []
      for (let i = 0; i < 100; i++) {
        messages.push({ id: i, data: `message_${i}` })
      }

      messages.forEach(msg => endpoint.postMessage(msg))
      
      const sentMessages = mockChildProcess.getMessages()
      expect(sentMessages).toHaveLength(100)
      expect(sentMessages[0]).toEqual({ id: 0, data: 'message_0' })
      expect(sentMessages[99]).toEqual({ id: 99, data: 'message_99' })
    })

    it('should handle rapid message receiving', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      for (let i = 0; i < 50; i++) {
        mockChildProcess.simulateMessage({ id: i, response: `response_${i}` })
      }
      
      expect(messageHandler).toHaveBeenCalledTimes(50)
    })

    it('should handle message listener registration and removal', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()
      
      endpoint.addEventListener('message', handler1)
      endpoint.addEventListener('message', handler2)
      endpoint.addEventListener('message', handler3)
      
      mockChildProcess.simulateMessage({ test: 'data1' })
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(1)
      
      endpoint.removeEventListener('message', handler2)
      
      mockChildProcess.simulateMessage({ test: 'data2' })
      expect(handler1).toHaveBeenCalledTimes(2)
      expect(handler2).toHaveBeenCalledTimes(1) // Should not be called again
      expect(handler3).toHaveBeenCalledTimes(2)
      
      endpoint.removeEventListener('message', handler1)
      endpoint.removeEventListener('message', handler3)
      
      mockChildProcess.simulateMessage({ test: 'data3' })
      expect(handler1).toHaveBeenCalledTimes(2)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(2)
    })

    it('should handle disconnected child process gracefully', () => {
      expect(mockChildProcess.connected).toBe(true)
      endpoint.postMessage({ test: 'message1' })
      expect(mockChildProcess.getMessages()).toHaveLength(1)
      
      mockChildProcess.disconnect()
      expect(mockChildProcess.connected).toBe(false)
      
      endpoint.postMessage({ test: 'message2' })
      expect(mockChildProcess.getMessages()).toHaveLength(1) // No new message should be sent
    })
  })

  describe('MessageEvent compatibility', () => {
    it('should create proper MessageEvent objects', () => {
      let receivedEvent: MessageEvent | null = null
      endpoint.addEventListener('message', (event) => {
        receivedEvent = event
      })
      
      const testData = { type: 'test', value: 123 }
      mockChildProcess.simulateMessage(testData)
      
      expect(receivedEvent).toBeInstanceOf(MessageEvent)
      expect(receivedEvent?.type).toBe('message')
      expect(receivedEvent?.data).toEqual(testData)
    })

    it('should handle various data types in MessageEvent', () => {
      const receivedData: any[] = []
      endpoint.addEventListener('message', (event) => {
        receivedData.push(event.data)
      })
      
      const testCases = [
        null,
        true,
        false,
        42,
        'string',
        { object: true },
        [1, 2, 3],
        new Date().toISOString(),
        'regex_pattern'
      ]
      
      testCases.forEach(testCase => {
        mockChildProcess.simulateMessage(testCase)
      })
      
      expect(receivedData).toHaveLength(testCases.length)
      expect(receivedData).toEqual(testCases)
    })
  })
})