import type { EndpointPair } from '../types'

/**
 * Utility functions for testing remobj endpoints
 */
export class TestHelpers {
  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    checkInterval: number = 10
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return
      }
      await this.delay(checkInterval)
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms timeout`)
  }

  /**
   * Create a promise that resolves after specified delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Assert that two values are deeply equal
   */
  static deepEqual(actual: any, expected: any, message?: string): void {
    const actualStr = JSON.stringify(actual, null, 2)
    const expectedStr = JSON.stringify(expected, null, 2)
    
    if (actualStr !== expectedStr) {
      const errorMessage = message 
        ? `${message}: Expected ${expectedStr}, got ${actualStr}`
        : `Expected ${expectedStr}, got ${actualStr}`
      throw new Error(errorMessage)
    }
  }

  /**
   * Assert that a value is truthy
   */
  static assert(value: any, message?: string): void {
    if (!value) {
      throw new Error(message || `Assertion failed: expected truthy value, got ${value}`)
    }
  }

  /**
   * Assert that a function throws an error
   */
  static async assertThrows(
    fn: () => Promise<any> | any,
    expectedError?: string | RegExp,
    message?: string
  ): Promise<Error> {
    try {
      await fn()
      throw new Error(message || 'Expected function to throw an error')
    } catch (error) {
      if (expectedError) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (typeof expectedError === 'string') {
          if (!errorMessage.includes(expectedError)) {
            throw new Error(`Expected error to contain '${expectedError}', got '${errorMessage}'`)
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorMessage)) {
            throw new Error(`Expected error to match ${expectedError}, got '${errorMessage}'`)
          }
        }
      }
      
      return error instanceof Error ? error : new Error(String(error))
    }
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  static timeout<T>(promise: Promise<T>, timeoutMs: number, message?: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(message || `Operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })
    ])
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  }

  /**
   * Generate random test data
   */
  static generateTestData(type: 'string' | 'number' | 'array' | 'object', size?: number): any {
    switch (type) {
      case 'string':
        const length = size || 10
        return Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')
      
      case 'number':
        return Math.floor(Math.random() * (size || 1000))
      
      case 'array':
        const arraySize = size || 10
        return Array.from({ length: arraySize }, (_, i) => i)
      
      case 'object':
        const objSize = size || 5
        const obj: Record<string, any> = {}
        for (let i = 0; i < objSize; i++) {
          obj[`key${i}`] = `value${i}`
        }
        return obj
      
      default:
        throw new Error(`Unknown test data type: ${type}`)
    }
  }

  /**
   * Monitor message flow between endpoints
   */
  static createMessageMonitor(endpoints: EndpointPair): MessageMonitor {
    return new MessageMonitor(endpoints)
  }

  /**
   * Create a stress test scenario
   */
  static async stressTest(
    endpoints: EndpointPair,
    operations: Array<() => Promise<void>>,
    concurrency: number = 10,
    duration: number = 5000
  ): Promise<StressTestResult> {
    const startTime = Date.now()
    const results: StressTestResult = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      errors: []
    }

    const latencies: number[] = []
    const runOperation = async (): Promise<void> => {
      while (Date.now() - startTime < duration) {
        const operation = operations[Math.floor(Math.random() * operations.length)]
        const operationStart = Date.now()
        
        try {
          await operation()
          const latency = Date.now() - operationStart
          latencies.push(latency)
          results.successfulOperations++
          results.maxLatency = Math.max(results.maxLatency, latency)
          results.minLatency = Math.min(results.minLatency, latency)
        } catch (error) {
          results.failedOperations++
          results.errors.push(error instanceof Error ? error : new Error(String(error)))
        }
        
        results.totalOperations++
      }
    }

    // Run concurrent operations
    const workers = Array.from({ length: concurrency }, () => runOperation())
    await Promise.all(workers)

    // Calculate average latency
    if (latencies.length > 0) {
      results.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    }

    if (results.minLatency === Infinity) {
      results.minLatency = 0
    }

    return results
  }
}

/**
 * Message monitor for debugging endpoint communication
 */
export class MessageMonitor {
  private messages: Array<{ timestamp: number; direction: 'A->B' | 'B->A'; data: any }> = []
  private listeners: Set<(event: MessageEvent) => void> = new Set()

  constructor(private endpoints: EndpointPair) {
    this.setupMonitoring()
  }

  private setupMonitoring(): void {
    const originalPostMessageA = this.endpoints.endpointA.postMessage.bind(this.endpoints.endpointA)
    const originalPostMessageB = this.endpoints.endpointB.postMessage.bind(this.endpoints.endpointB)

    // Override postMessage to capture sent messages
    this.endpoints.endpointA.postMessage = (data: any) => {
      this.messages.push({
        timestamp: Date.now(),
        direction: 'A->B',
        data: JSON.parse(JSON.stringify(data)) // Deep clone
      })
      return originalPostMessageA(data)
    }

    this.endpoints.endpointB.postMessage = (data: any) => {
      this.messages.push({
        timestamp: Date.now(),
        direction: 'B->A',
        data: JSON.parse(JSON.stringify(data)) // Deep clone
      })
      return originalPostMessageB(data)
    }
  }

  /**
   * Get all captured messages
   */
  getMessages(): Array<{ timestamp: number; direction: 'A->B' | 'B->A'; data: any }> {
    return [...this.messages]
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this.messages.length = 0
  }

  /**
   * Get message statistics
   */
  getStats(): { totalMessages: number; aToB: number; bToA: number; averageSize: number } {
    const aToB = this.messages.filter(m => m.direction === 'A->B').length
    const bToA = this.messages.filter(m => m.direction === 'B->A').length
    
    const totalSize = this.messages.reduce((sum, msg) => {
      return sum + JSON.stringify(msg.data).length
    }, 0)
    
    return {
      totalMessages: this.messages.length,
      aToB,
      bToA,
      averageSize: this.messages.length > 0 ? totalSize / this.messages.length : 0
    }
  }

  /**
   * Wait for a specific number of messages
   */
  async waitForMessages(count: number, timeoutMs: number = 5000): Promise<void> {
    await TestHelpers.waitFor(() => this.messages.length >= count, timeoutMs)
  }

  /**
   * Wait for a message matching a predicate
   */
  async waitForMessage(
    predicate: (data: any) => boolean,
    timeoutMs: number = 5000
  ): Promise<any> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const message = this.messages.find(m => predicate(m.data))
      if (message) {
        return message.data
      }
      await TestHelpers.delay(10)
    }
    
    throw new Error(`Message matching predicate not found within ${timeoutMs}ms`)
  }
}

/**
 * Stress test results
 */
export interface StressTestResult {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  averageLatency: number
  maxLatency: number
  minLatency: number
  errors: Error[]
}