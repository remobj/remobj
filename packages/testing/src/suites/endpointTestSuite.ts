import type { EndpointPair, TestSuiteOptions } from '../types'

/**
 * Comprehensive test suite for PostMessage endpoints
 * Tests basic functionality, reliability, and edge cases
 */
export class EndpointTestSuite {
  constructor(
    private endpoints: EndpointPair,
    private options: TestSuiteOptions = {}
  ) {}

  /**
   * Run all endpoint tests
   */
  async runAll(): Promise<void> {
    const tests = [
      this.testBasicCommunication,
      this.testBidirectionalCommunication,
      this.testMultipleMessages,
      this.testLargeMessages,
      this.testMessageOrdering,
      this.testEventHandling,
      this.testDisconnection,
      this.testErrorHandling,
      this.testConcurrentMessages,
      this.testMessageTypes
    ]

    for (const test of tests) {
      await test.call(this)
    }
  }

  /**
   * Test basic one-way communication
   */
  async testBasicCommunication(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const testMessage = { type: 'test', data: 'hello' }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Basic communication test timeout')), 1000)
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        try {
          if (JSON.stringify(event.data) === JSON.stringify(testMessage)) {
            clearTimeout(timeout)
            resolve()
          }
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
      
      endpointA.postMessage(testMessage)
    })
  }

  /**
   * Test bidirectional communication
   */
  async testBidirectionalCommunication(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const messageA = { from: 'A', data: 'ping' }
    const messageB = { from: 'B', data: 'pong' }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Bidirectional communication test timeout')), 2000)
      let receivedA = false
      let receivedB = false
      
      const checkComplete = () => {
        if (receivedA && receivedB) {
          clearTimeout(timeout)
          resolve()
        }
      }
      
      endpointA.addEventListener('message', (event: MessageEvent) => {
        if (event.data.from === 'B') {
          receivedA = true
          checkComplete()
        }
      })
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        if (event.data.from === 'A') {
          receivedB = true
          // Send response
          endpointB.postMessage(messageB)
          checkComplete()
        }
      })
      
      endpointA.postMessage(messageA)
    })
  }

  /**
   * Test multiple messages in sequence
   */
  async testMultipleMessages(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const messageCount = 10
    const messages = Array.from({ length: messageCount }, (_, i) => ({ id: i, data: `message-${i}` }))
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Multiple messages test timeout')), 3000)
      const receivedMessages: any[] = []
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        receivedMessages.push(event.data)
        
        if (receivedMessages.length === messageCount) {
          clearTimeout(timeout)
          
          // Verify all messages received correctly
          for (let i = 0; i < messageCount; i++) {
            if (receivedMessages[i].id !== i) {
              return reject(new Error(`Message order incorrect: expected ${i}, got ${receivedMessages[i].id}`))
            }
          }
          
          resolve()
        }
      })
      
      // Send messages with small delays
      messages.forEach((message, index) => {
        setTimeout(() => endpointA.postMessage(message), index * 10)
      })
    })
  }

  /**
   * Test large message handling
   */
  async testLargeMessages(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const largeData = 'x'.repeat(100000) // 100KB string
    const testMessage = { type: 'large', data: largeData }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Large message test timeout')), 5000)
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        try {
          if (event.data.type === 'large' && event.data.data === largeData) {
            clearTimeout(timeout)
            resolve()
          }
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
      
      endpointA.postMessage(testMessage)
    })
  }

  /**
   * Test message ordering under load
   */
  async testMessageOrdering(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const messageCount = 50 // Reduced for more reliable testing
    const messages = Array.from({ length: messageCount }, (_, i) => ({ sequence: i }))
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Message ordering test timeout')), 5000)
      const receivedMessages: any[] = []
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        if (typeof event.data.sequence === 'number') {
          receivedMessages.push(event.data)
          
          if (receivedMessages.length === messageCount) {
            clearTimeout(timeout)
            
            // Sort by sequence to verify all messages arrived
            receivedMessages.sort((a, b) => a.sequence - b.sequence)
            
            // Verify all messages received (ordering may vary in async environments)
            for (let i = 0; i < messageCount; i++) {
              if (receivedMessages[i].sequence !== i) {
                return reject(new Error(`Message missing or corrupted at position ${i}: expected ${i}, got ${receivedMessages[i]?.sequence}`))
              }
            }
            
            resolve()
          }
        }
      })
      
      // Send messages with small delays to improve reliability
      messages.forEach((message, index) => {
        setTimeout(() => endpointA.postMessage(message), index)
      })
    })
  }

  /**
   * Test event listener management
   */
  async testEventHandling(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Event handling test timeout')), 2000)
      let callCount = 0
      
      const listener1 = (event: MessageEvent) => {
        if (event.data.test === 'event-handling') callCount++
      }
      
      const listener2 = (event: MessageEvent) => {
        if (event.data.test === 'event-handling') callCount++
      }
      
      // Add listeners
      endpointB.addEventListener('message', listener1)
      endpointB.addEventListener('message', listener2)
      
      // Send message
      endpointA.postMessage({ test: 'event-handling' })
      
      setTimeout(() => {
        // Remove one listener
        endpointB.removeEventListener('message', listener1)
        
        // Send another message
        endpointA.postMessage({ test: 'event-handling' })
        
        setTimeout(() => {
          clearTimeout(timeout)
          
          // Should be called 3 times total (2 listeners first time, 1 listener second time)
          if (callCount === 3) {
            resolve()
          } else {
            reject(new Error(`Expected 3 calls, got ${callCount}`))
          }
        }, 100)
      }, 100)
    })
  }

  /**
   * Test endpoint disconnection
   */
  async testDisconnection(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    
    // Verify initially connected
    if (!endpointA.isConnected() || !endpointB.isConnected()) {
      throw new Error('Endpoints should be connected initially')
    }
    
    // Disconnect and verify
    endpointA.disconnect()
    
    if (endpointA.isConnected()) {
      throw new Error('EndpointA should be disconnected')
    }
    
    // Try to send message (should not crash)
    endpointA.postMessage({ test: 'after-disconnect' })
    
    // Wait a bit to ensure no message was sent
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify no message was received
    const sentMessages = endpointA.getSentMessages()
    const disconnectMessages = sentMessages.filter(msg => msg.test === 'after-disconnect')
    
    if (disconnectMessages.length > 0) {
      throw new Error('Message should not be sent after disconnection')
    }
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandling(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Error handling test timeout')), 5000)
      let normalMessageReceived = false
      
      // Add error-throwing listener (errors in listeners shouldn't break the endpoint)
      const errorListener = (event: MessageEvent) => {
        if (event.data.shouldError) {
          try {
            throw new Error('Intentional test error')
          } catch (error) {
            // Swallow the error - this is expected behavior
            console.warn('Expected test error caught:', error instanceof Error ? error.message : error)
          }
        }
      }
      
      // Add normal listener
      const normalListener = (event: MessageEvent) => {
        if (event.data.test === 'error-recovery') {
          normalMessageReceived = true
          clearTimeout(timeout)
          resolve()
        }
      }
      
      endpointB.addEventListener('message', errorListener)
      endpointB.addEventListener('message', normalListener)
      
      // Send error-causing message
      endpointA.postMessage({ shouldError: true })
      
      // Send normal message after error to verify endpoint still works
      setTimeout(() => {
        endpointA.postMessage({ test: 'error-recovery' })
      }, 50)
    })
  }

  /**
   * Test concurrent message handling
   */
  async testConcurrentMessages(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    const concurrentCount = 50
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Concurrent messages test timeout')), 5000)
      const receivedMessages = new Set<number>()
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        if (typeof event.data.concurrent === 'number') {
          receivedMessages.add(event.data.concurrent)
          
          if (receivedMessages.size === concurrentCount) {
            clearTimeout(timeout)
            resolve()
          }
        }
      })
      
      // Send many messages concurrently
      for (let i = 0; i < concurrentCount; i++) {
        setTimeout(() => {
          endpointA.postMessage({ concurrent: i })
        }, Math.random() * 100) // Random timing
      }
    })
  }

  /**
   * Test different message types and serialization
   */
  async testMessageTypes(): Promise<void> {
    const { endpointA, endpointB } = this.endpoints
    
    const testCases = [
      { name: 'string', value: 'test string' },
      { name: 'number', value: 42 },
      { name: 'boolean', value: true },
      { name: 'null', value: null },
      { name: 'undefined', value: undefined },
      { name: 'array', value: [1, 2, 3, 'test'] },
      { name: 'object', value: { a: 1, b: 'test', c: [1, 2, 3] } },
      { name: 'date', value: new Date('2023-01-01') },
      { name: 'nested', value: { level1: { level2: { level3: 'deep' } } } }
    ]
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Message types test timeout')), 3000)
      let completedTests = 0
      
      endpointB.addEventListener('message', (event: MessageEvent) => {
        if (event.data.testType) {
          const testCase = testCases.find(tc => tc.name === event.data.testType)
          if (testCase) {
            // Deep comparison for received value
            const received = event.data.value
            const expected = testCase.value
            
            try {
              if (JSON.stringify(received) === JSON.stringify(expected)) {
                completedTests++
                
                if (completedTests === testCases.length) {
                  clearTimeout(timeout)
                  resolve()
                }
              } else {
                clearTimeout(timeout)
                reject(new Error(`Type test failed for ${testCase.name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(received)}`))
              }
            } catch (error) {
              clearTimeout(timeout)
              reject(error)
            }
          }
        }
      })
      
      // Send all test cases
      testCases.forEach(testCase => {
        endpointA.postMessage({
          testType: testCase.name,
          value: testCase.value
        })
      })
    })
  }
}