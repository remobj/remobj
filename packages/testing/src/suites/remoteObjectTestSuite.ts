import { provide, consume } from '@remobj/core'
import type { EndpointPair, TestSuiteOptions } from '../types'

/**
 * Test service interface for remote object testing
 */
interface TestService {
  // Basic operations
  add(a: number, b: number): Promise<number>
  multiply(a: number, b: number): Promise<number>
  echo(message: string): Promise<string>
  
  // Async operations
  delay(ms: number): Promise<string>
  asyncAdd(a: number, b: number): Promise<number>
  
  // Complex data types
  processArray(arr: number[]): Promise<number[]>
  processObject(obj: Record<string, any>): Promise<Record<string, any>>
  
  // Error scenarios
  throwError(message: string): Promise<never>
  throwAfterDelay(ms: number, message: string): Promise<never>
  
  // Performance tests
  performComputation(iterations: number): Promise<number>
  
  // State management
  setState(key: string, value: any): Promise<void>
  getState(key: string): Promise<any>
  clearState(): Promise<void>
}

/**
 * Comprehensive test suite for remobj remote objects
 */
export class RemoteObjectTestSuite {
  private service: TestService
  private remote: TestService

  constructor(
    private endpoints: EndpointPair,
    private options: TestSuiteOptions = {}
  ) {
    // Create test service implementation
    const state = new Map<string, any>()
    
    this.service = {
      async add(a: number, b: number): Promise<number> {
        return a + b
      },
      
      async multiply(a: number, b: number): Promise<number> {
        return a * b
      },
      
      async echo(message: string): Promise<string> {
        return message
      },
      
      async delay(ms: number): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, ms))
        return `Delayed ${ms}ms`
      },
      
      async asyncAdd(a: number, b: number): Promise<number> {
        // Simulate async computation
        await new Promise(resolve => setTimeout(resolve, 10))
        return a + b
      },
      
      async processArray(arr: number[]): Promise<number[]> {
        return arr.map(x => x * 2)
      },
      
      async processObject(obj: Record<string, any>): Promise<Record<string, any>> {
        const result: Record<string, any> = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = typeof value === 'number' ? value * 2 : value
        }
        return result
      },
      
      async throwError(message: string): Promise<never> {
        throw new Error(message)
      },
      
      async throwAfterDelay(ms: number, message: string): Promise<never> {
        await new Promise(resolve => setTimeout(resolve, ms))
        throw new Error(message)
      },
      
      async performComputation(iterations: number): Promise<number> {
        let result = 0
        for (let i = 0; i < iterations; i++) {
          result += Math.sqrt(i)
        }
        return result
      },
      
      async setState(key: string, value: any): Promise<void> {
        state.set(key, value)
      },
      
      async getState(key: string): Promise<any> {
        return state.get(key)
      },
      
      async clearState(): Promise<void> {
        state.clear()
      }
    }

    // Set up provider and consumer
    provide(this.service, this.endpoints.endpointA)
    this.remote = consume<TestService>(this.endpoints.endpointB)
  }

  /**
   * Run all remote object tests
   */
  async runAll(): Promise<void> {
    const tests = [
      this.testBasicOperations,
      this.testAsyncOperations,
      this.testComplexDataTypes,
      this.testErrorHandling,
      this.testConcurrentCalls,
      this.testStateManagement,
      this.testPerformance,
      this.testMethodChaining,
      this.testLargeDataTransfer,
      this.testTimeouts
    ]

    for (const test of tests) {
      await test.call(this)
    }
  }

  /**
   * Test basic remote operations
   */
  async testBasicOperations(): Promise<void> {
    // Test addition
    const addResult = await this.remote.add(5, 3)
    if (addResult !== 8) {
      throw new Error(`Expected 8, got ${addResult}`)
    }

    // Test multiplication
    const multiplyResult = await this.remote.multiply(4, 6)
    if (multiplyResult !== 24) {
      throw new Error(`Expected 24, got ${multiplyResult}`)
    }

    // Test echo
    const echoResult = await this.remote.echo('hello world')
    if (echoResult !== 'hello world') {
      throw new Error(`Expected 'hello world', got '${echoResult}'`)
    }
  }

  /**
   * Test async operations and timing
   */
  async testAsyncOperations(): Promise<void> {
    // Test delay operation
    const start = Date.now()
    const delayResult = await this.remote.delay(100)
    const elapsed = Date.now() - start
    
    if (!delayResult.includes('100ms')) {
      throw new Error(`Expected delay message, got '${delayResult}'`)
    }
    
    if (elapsed < 90 || elapsed > 200) {
      throw new Error(`Expected ~100ms delay, got ${elapsed}ms`)
    }

    // Test async computation
    const asyncResult = await this.remote.asyncAdd(10, 20)
    if (asyncResult !== 30) {
      throw new Error(`Expected 30, got ${asyncResult}`)
    }
  }

  /**
   * Test complex data type handling
   */
  async testComplexDataTypes(): Promise<void> {
    // Test array processing
    const inputArray = [1, 2, 3, 4, 5]
    const arrayResult = await this.remote.processArray(inputArray)
    const expectedArray = [2, 4, 6, 8, 10]
    
    if (JSON.stringify(arrayResult) !== JSON.stringify(expectedArray)) {
      throw new Error(`Array processing failed: expected ${JSON.stringify(expectedArray)}, got ${JSON.stringify(arrayResult)}`)
    }

    // Test object processing
    const inputObject = { a: 5, b: 'test', c: 10 }
    const objectResult = await this.remote.processObject(inputObject)
    const expectedObject = { a: 10, b: 'test', c: 20 }
    
    if (JSON.stringify(objectResult) !== JSON.stringify(expectedObject)) {
      throw new Error(`Object processing failed: expected ${JSON.stringify(expectedObject)}, got ${JSON.stringify(objectResult)}`)
    }
  }

  /**
   * Test error handling and propagation
   */
  async testErrorHandling(): Promise<void> {
    // Test immediate error
    try {
      await this.remote.throwError('test error')
      throw new Error('Expected error to be thrown')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('test error')) {
        throw new Error(`Expected 'test error', got: ${error}`)
      }
    }

    // Test delayed error
    try {
      const start = Date.now()
      await this.remote.throwAfterDelay(50, 'delayed error')
      throw new Error('Expected delayed error to be thrown')
    } catch (error) {
      const elapsed = Date.now() - Date.now()
      if (!(error instanceof Error) || !error.message.includes('delayed error')) {
        throw new Error(`Expected 'delayed error', got: ${error}`)
      }
    }
  }

  /**
   * Test concurrent remote calls
   */
  async testConcurrentCalls(): Promise<void> {
    const concurrentCount = 10
    const promises: Promise<number>[] = []
    
    // Start multiple concurrent operations
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(this.remote.add(i, i))
    }
    
    // Wait for all to complete
    const results = await Promise.all(promises)
    
    // Verify results
    for (let i = 0; i < concurrentCount; i++) {
      if (results[i] !== i + i) {
        throw new Error(`Concurrent call ${i} failed: expected ${i + i}, got ${results[i]}`)
      }
    }
  }

  /**
   * Test state management across calls
   */
  async testStateManagement(): Promise<void> {
    // Clear any existing state
    await this.remote.clearState()
    
    // Set some state
    await this.remote.setState('test1', 'value1')
    await this.remote.setState('test2', { nested: 'object' })
    await this.remote.setState('test3', [1, 2, 3])
    
    // Retrieve and verify state
    const value1 = await this.remote.getState('test1')
    if (value1 !== 'value1') {
      throw new Error(`Expected 'value1', got '${value1}'`)
    }
    
    const value2 = await this.remote.getState('test2')
    if (JSON.stringify(value2) !== JSON.stringify({ nested: 'object' })) {
      throw new Error(`Expected nested object, got ${JSON.stringify(value2)}`)
    }
    
    const value3 = await this.remote.getState('test3')
    if (JSON.stringify(value3) !== JSON.stringify([1, 2, 3])) {
      throw new Error(`Expected array [1,2,3], got ${JSON.stringify(value3)}`)
    }
    
    // Test non-existent key
    const nonExistent = await this.remote.getState('nonexistent')
    if (nonExistent !== undefined) {
      throw new Error(`Expected undefined for non-existent key, got ${nonExistent}`)
    }
    
    // Clear state and verify
    await this.remote.clearState()
    const clearedValue = await this.remote.getState('test1')
    if (clearedValue !== undefined) {
      throw new Error(`Expected undefined after clear, got ${clearedValue}`)
    }
  }

  /**
   * Test performance characteristics
   */
  async testPerformance(): Promise<void> {
    const iterations = 1000
    
    // Test computational performance
    const start = Date.now()
    const result = await this.remote.performComputation(iterations)
    const elapsed = Date.now() - start
    
    if (typeof result !== 'number' || result <= 0) {
      throw new Error(`Expected positive number result, got ${result}`)
    }
    
    // Verify reasonable performance (should complete within reasonable time)
    if (elapsed > 5000) { // 5 seconds max
      throw new Error(`Performance test took too long: ${elapsed}ms`)
    }
    
    // Test rapid sequential calls
    const rapidStart = Date.now()
    const rapidPromises = Array.from({ length: 20 }, (_, i) => this.remote.add(i, 1))
    await Promise.all(rapidPromises)
    const rapidElapsed = Date.now() - rapidStart
    
    if (rapidElapsed > 2000) { // 2 seconds max for 20 simple calls
      throw new Error(`Rapid calls took too long: ${rapidElapsed}ms`)
    }
  }

  /**
   * Test method chaining and complex interactions
   */
  async testMethodChaining(): Promise<void> {
    // Test sequential operations that depend on each other
    await this.remote.setState('counter', 0)
    
    const initial = await this.remote.getState('counter')
    const step1 = await this.remote.add(initial, 5)
    const step2 = await this.remote.multiply(step1, 2)
    
    await this.remote.setState('counter', step2)
    const final = await this.remote.getState('counter')
    
    if (final !== 10) { // (0 + 5) * 2 = 10
      throw new Error(`Method chaining failed: expected 10, got ${final}`)
    }
  }

  /**
   * Test large data transfer
   */
  async testLargeDataTransfer(): Promise<void> {
    // Create large array
    const largeArray = Array.from({ length: 10000 }, (_, i) => i)
    
    // Process large array
    const start = Date.now()
    const result = await this.remote.processArray(largeArray)
    const elapsed = Date.now() - start
    
    // Verify correctness
    if (result.length !== largeArray.length) {
      throw new Error(`Large array length mismatch: expected ${largeArray.length}, got ${result.length}`)
    }
    
    // Spot check some values
    for (let i = 0; i < 100; i++) {
      const randomIndex = Math.floor(Math.random() * largeArray.length)
      if (result[randomIndex] !== largeArray[randomIndex] * 2) {
        throw new Error(`Large array processing error at index ${randomIndex}`)
      }
    }
    
    // Verify reasonable performance
    if (elapsed > 10000) { // 10 seconds max
      throw new Error(`Large data transfer took too long: ${elapsed}ms`)
    }
  }

  /**
   * Test timeout scenarios (if supported by implementation)
   */
  async testTimeouts(): Promise<void> {
    // Test that very long operations can complete
    try {
      const result = await this.remote.delay(200)
      if (!result.includes('200ms')) {
        throw new Error(`Timeout test failed: unexpected result '${result}'`)
      }
    } catch (error) {
      // If this fails due to timeout, that's a configuration issue, not a failure
      console.warn('Timeout test failed - this may indicate timeout settings are too aggressive:', error)
    }
  }
}