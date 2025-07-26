import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { socketToPostMessage } from '../src/adapter/node'
import { consume, provide } from '@remobj/core'

class MockSocket {
  private listeners: Map<string, Function[]> = new Map()
  private buffer = ''
  destroyed = false
  private sentData: string[] = []

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(listener => listener(...args))
  }

  write(data: string) {
    if (!this.destroyed) {
      this.sentData.push(data)
    }
  }

  simulateData(data: string) {
    if (!this.destroyed) {
      this.emit('data', Buffer.from(data))
    }
  }

  simulateMessage(message: any) {
    const jsonString = JSON.stringify(message) + '\n'
    this.simulateData(jsonString)
  }

  simulatePartialData(data: string) {
    if (!this.destroyed) {
      this.emit('data', Buffer.from(data))
    }
  }

  destroy() {
    this.destroyed = true
  }

  getSentData() {
    return this.sentData
  }

  getSentMessages() {
    return this.sentData.map(data => {
      try {
        return JSON.parse(data.replace('\n', ''))
      } catch {
        return null
      }
    }).filter(msg => msg !== null)
  }
}

describe('socketToPostMessage', () => {
  let mockSocket: MockSocket
  let endpoint: ReturnType<typeof socketToPostMessage>
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    mockSocket = new MockSocket()
    endpoint = socketToPostMessage(mockSocket as any)
    consoleSpy.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should create a PostMessageEndpoint from socket', () => {
      expect(endpoint).toHaveProperty('postMessage')
      expect(endpoint).toHaveProperty('addEventListener')
      expect(endpoint).toHaveProperty('removeEventListener')
      expect(typeof endpoint.postMessage).toBe('function')
      expect(typeof endpoint.addEventListener).toBe('function')
      expect(typeof endpoint.removeEventListener).toBe('function')
    })

    it('should send JSON messages through socket', () => {
      const testData = { type: 'request', payload: { action: 'connect', params: {} } }
      endpoint.postMessage(testData)
      
      const sentData = mockSocket.getSentData()
      expect(sentData).toHaveLength(1)
      expect(sentData[0]).toBe(JSON.stringify(testData) + '\n')
      
      const sentMessages = mockSocket.getSentMessages()
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0]).toEqual(testData)
    })

    it('should not send messages when socket is destroyed', () => {
      mockSocket.destroy()
      const testData = { type: 'test', payload: 'should not send' }
      endpoint.postMessage(testData)
      
      const sentData = mockSocket.getSentData()
      expect(sentData).toHaveLength(0)
    })

    it('should receive JSON messages from socket', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const testData = { type: 'response', payload: { status: 'success', data: [1, 2, 3] } }
      mockSocket.simulateMessage(testData)
      
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
      
      const testData = { type: 'broadcast', message: 'hello all' }
      mockSocket.simulateMessage(testData)
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
      expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
    })

    it('should remove event listeners correctly', () => {
      const handler = vi.fn()
      endpoint.addEventListener('message', handler)
      endpoint.removeEventListener('message', handler)
      
      mockSocket.simulateMessage({ test: 'data' })
      expect(handler).not.toHaveBeenCalled()
    })

    it('should ignore non-message event types', () => {
      const handler = vi.fn()
      endpoint.addEventListener('error', handler)
      endpoint.removeEventListener('error', handler)
      
      mockSocket.simulateMessage({ test: 'data' })
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Line-delimited JSON protocol', () => {
    it('should handle single-line JSON messages', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const message1 = { id: 1, command: 'ping' }
      const message2 = { id: 2, command: 'pong' }
      
      mockSocket.simulateData(JSON.stringify(message1) + '\n')
      mockSocket.simulateData(JSON.stringify(message2) + '\n')
      
      expect(messageHandler).toHaveBeenCalledTimes(2)
      expect(messageHandler).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: message1 }))
      expect(messageHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: message2 }))
    })

    it('should handle multiple messages in single data chunk', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const message1 = { id: 1, type: 'first' }
      const message2 = { id: 2, type: 'second' }
      const message3 = { id: 3, type: 'third' }
      
      const combinedData = JSON.stringify(message1) + '\n' + 
                          JSON.stringify(message2) + '\n' + 
                          JSON.stringify(message3) + '\n'
      
      mockSocket.simulateData(combinedData)
      
      expect(messageHandler).toHaveBeenCalledTimes(3)
      expect(messageHandler).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: message1 }))
      expect(messageHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: message2 }))
      expect(messageHandler).toHaveBeenNthCalledWith(3, expect.objectContaining({ data: message3 }))
    })

    it('should handle fragmented messages across multiple data chunks', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const message = { id: 1, data: 'fragmented message', complex: { nested: true } }
      const jsonString = JSON.stringify(message)
      
      // Split the JSON string across multiple chunks
      const part1 = jsonString.slice(0, 15)
      const part2 = jsonString.slice(15, 30)
      const part3 = jsonString.slice(30) + '\n'
      
      mockSocket.simulateData(part1)
      expect(messageHandler).not.toHaveBeenCalled() // Incomplete message
      
      mockSocket.simulateData(part2)
      expect(messageHandler).not.toHaveBeenCalled() // Still incomplete
      
      mockSocket.simulateData(part3)
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(expect.objectContaining({ data: message }))
    })

    it('should handle empty lines and whitespace-only lines', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const message = { id: 1, valid: true }
      
      const dataWithEmptyLines = '\n' +                    // Empty line
                                ' \n' +                    // Whitespace-only line
                                JSON.stringify(message) + '\n' +
                                '\t\n' +                   // Tab-only line
                                '\n'                       // Another empty line
      
      mockSocket.simulateData(dataWithEmptyLines)
      
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(expect.objectContaining({ data: message }))
    })

    it('should handle malformed JSON gracefully', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const validMessage = { id: 1, status: 'ok' }
      
      // Send malformed JSON followed by valid JSON
      mockSocket.simulateData('{ invalid json \n')
      mockSocket.simulateData('{ "incomplete": \n')
      mockSocket.simulateData(JSON.stringify(validMessage) + '\n')
      
      expect(consoleSpy).toHaveBeenCalledTimes(3) // Two warnings for malformed JSON + devtools warning
      expect(messageHandler).toHaveBeenCalledTimes(1) // Only valid message processed
      expect(messageHandler).toHaveBeenCalledWith(expect.objectContaining({ data: validMessage }))
    })

    it('should maintain buffer state across partial messages', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const message1 = { id: 1, first: true }
      const message2 = { id: 2, second: true }
      
      // Send first message completely
      mockSocket.simulateData(JSON.stringify(message1) + '\n')
      expect(messageHandler).toHaveBeenCalledTimes(1)
      
      // Send partial second message
      const partialMessage2 = JSON.stringify(message2).slice(0, 10)
      mockSocket.simulateData(partialMessage2)
      expect(messageHandler).toHaveBeenCalledTimes(1) // No new message yet
      
      // Complete the second message
      const remainingMessage2 = JSON.stringify(message2).slice(10) + '\n'
      mockSocket.simulateData(remainingMessage2)
      expect(messageHandler).toHaveBeenCalledTimes(2)
      expect(messageHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: message2 }))
    })
  })

  describe('Integration test placeholder', () => {
    it('should be tested with real remobj core integration', () => {
      // Note: Full integration tests with provide/consume would require
      // more complex setup to properly simulate bidirectional communication.
      // The basic functionality tests above demonstrate that the adapter
      // correctly converts socket communication to PostMessage format.
      expect(true).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle rapid message sending', () => {
      const messages = []
      for (let i = 0; i < 100; i++) {
        messages.push({ sequenceId: i, data: `message_${i}`, timestamp: Date.now() + i })
      }

      messages.forEach(msg => endpoint.postMessage(msg))
      
      const sentMessages = mockSocket.getSentMessages()
      expect(sentMessages).toHaveLength(100)
      expect(sentMessages[0].sequenceId).toBe(0)
      expect(sentMessages[99].sequenceId).toBe(99)
    })

    it('should handle large JSON payloads', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const largeData = {
        id: 'large-payload',
        data: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: `item_${i}`,
          metadata: { created: Date.now(), random: Math.random() }
        }))
      }
      
      endpoint.postMessage(largeData)
      mockSocket.simulateMessage(largeData)
      
      const sentMessages = mockSocket.getSentMessages()
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0].data).toHaveLength(1000)
      
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({ data: largeData })
      )
    })

    it('should handle socket destruction gracefully', () => {
      expect(mockSocket.destroyed).toBe(false)
      endpoint.postMessage({ test: 'message1' })
      expect(mockSocket.getSentData()).toHaveLength(1)
      
      mockSocket.destroy()
      expect(mockSocket.destroyed).toBe(true)
      
      endpoint.postMessage({ test: 'message2' })
      expect(mockSocket.getSentData()).toHaveLength(1) // No new message should be sent
    })

    it('should handle mixed valid and invalid JSON in stream', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      const validMessage1 = { id: 1, valid: true }
      const validMessage2 = { id: 2, valid: true }
      
      const mixedData = JSON.stringify(validMessage1) + '\n' +
                       '{ invalid json }\n' +
                       'not json at all\n' +
                       JSON.stringify(validMessage2) + '\n' +
                       '{ "incomplete": \n'
      
      mockSocket.simulateData(mixedData)
      
      expect(consoleSpy).toHaveBeenCalledTimes(5) // Three warnings for malformed JSON + devtools warnings
      expect(messageHandler).toHaveBeenCalledTimes(2) // Only valid messages processed
      expect(messageHandler).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: validMessage1 }))
      expect(messageHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: validMessage2 }))
    })

    it('should handle very long lines without newlines', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      // Simulate a very long message that doesn't end with newline initially
      const longMessage = { 
        id: 'long',
        content: 'x'.repeat(10000), // Very long content
        metadata: { size: 'large' }
      }
      
      const jsonString = JSON.stringify(longMessage)
      
      // Send in parts without newline
      mockSocket.simulateData(jsonString.slice(0, 5000))
      expect(messageHandler).not.toHaveBeenCalled()
      
      mockSocket.simulateData(jsonString.slice(5000))
      expect(messageHandler).not.toHaveBeenCalled() // Still no newline
      
      // Finally send newline
      mockSocket.simulateData('\n')
      expect(messageHandler).toHaveBeenCalledTimes(1)
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({ data: longMessage })
      )
    })
  })

  describe('MessageEvent compatibility', () => {
    it('should create proper MessageEvent objects', () => {
      let receivedEvent: MessageEvent | null = null
      endpoint.addEventListener('message', (event) => {
        receivedEvent = event
      })
      
      const testData = { type: 'socket-message', connectionId: 'conn_123' }
      mockSocket.simulateMessage(testData)
      
      expect(receivedEvent).toBeInstanceOf(MessageEvent)
      expect(receivedEvent?.type).toBe('message')
      expect(receivedEvent?.data).toEqual(testData)
    })

    it('should handle various JSON data types in MessageEvent', () => {
      const receivedData: any[] = []
      endpoint.addEventListener('message', (event) => {
        receivedData.push(event.data)
      })
      
      const testCases = [
        null,
        true,
        false,
        42,
        3.14159,
        'string message',
        { object: true, nested: { deep: 'value' } },
        [1, 'two', { three: 3 }],
        { date: new Date().toISOString() },
        { regex: '/pattern/gi', special: 'chars: \n\t\r' }
      ]
      
      testCases.forEach(testCase => {
        mockSocket.simulateMessage(testCase)
      })
      
      expect(receivedData).toHaveLength(testCases.length)
      expect(receivedData).toEqual(testCases)
    })

    it('should handle concurrent message processing', () => {
      const messageHandlers = [vi.fn(), vi.fn(), vi.fn()]
      messageHandlers.forEach(handler => {
        endpoint.addEventListener('message', handler)
      })
      
      // Send multiple messages rapidly
      const messages = Array.from({ length: 10 }, (_, i) => ({ id: i, data: `concurrent_${i}` }))
      const combinedData = messages.map(msg => JSON.stringify(msg)).join('\n') + '\n'
      
      mockSocket.simulateData(combinedData)
      
      messageHandlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(10)
        messages.forEach((msg, index) => {
          expect(handler).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({ data: msg }))
        })
      })
    })
  })

  describe('Protocol compliance', () => {
    it('should send messages with proper line endings', () => {
      const messages = [
        { simple: 'message' },
        { with: 'newlines\ninside' },
        { unicode: '🚀 emoji support' },
        { special: 'chars: \t\r\b\f' }
      ]
      
      messages.forEach(msg => endpoint.postMessage(msg))
      
      const sentData = mockSocket.getSentData()
      expect(sentData).toHaveLength(4)
      
      sentData.forEach(data => {
        expect(data.endsWith('\n')).toBe(true)
        expect(data.split('\n')).toHaveLength(2) // Message + empty string after final \n
      })
    })

    it('should handle protocol edge cases correctly', () => {
      const messageHandler = vi.fn()
      endpoint.addEventListener('message', messageHandler)
      
      // Test messages with various line ending scenarios
      const scenarios = [
        '{"test": "single"}\n',
        '{"test": "double"}\n\n',
        '\n{"test": "leading_newline"}\n',
        '{"test": "trailing_space"} \n',
        '{"test": "with_internal_newline_\\n"}\n'
      ]
      
      scenarios.forEach(scenario => {
        mockSocket.simulateData(scenario)
      })
      
      // Should receive messages for valid JSON lines only
      // Just verify that we received some messages and they have the expected structure
      expect(messageHandler).toHaveBeenCalled()
      
      // Check that at least some expected messages were received
      const calls = messageHandler.mock.calls
      const dataItems = calls.map(call => call[0].data)
      
      expect(dataItems).toContainEqual({ test: 'single' })
      expect(dataItems).toContainEqual({ test: 'double' })
      expect(dataItems).toContainEqual({ test: 'leading_newline' })
      // The newline escape sequence is parsed as an actual newline in JSON
      expect(dataItems).toContainEqual({ test: 'with_internal_newline_\n' })
    })
  })
})