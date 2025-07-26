import { provide, consume } from '@remobj/core'
import type { EndpointPair, TestSuiteOptions, PerformanceMetrics } from '../types'
import { TestHelpers } from '../helpers/testHelpers'

/**
 * Performance testing service interface
 */
interface PerformanceTestService {
  // CPU intensive operations
  fibonacci(n: number): Promise<number>
  primeFactors(n: number): Promise<number[]>
  sortArray(arr: number[]): Promise<number[]>
  
  // Memory operations
  createLargeObject(size: number): Promise<Record<string, any>>
  processLargeArray(arr: any[]): Promise<any[]>
  
  // I/O simulation
  simulateIO(delay: number): Promise<string>
  batchProcess(items: any[], batchSize: number): Promise<any[]>
  
  // Simple operations for throughput testing
  add(a: number, b: number): Promise<number>
  echo(data: any): Promise<any>
}

/**
 * Performance test suite for remobj endpoints
 */
export class PerformanceTestSuite {
  private service: PerformanceTestService
  private remote: PerformanceTestService
  private metrics: PerformanceMetrics[] = []

  constructor(
    private endpoints: EndpointPair,
    private options: TestSuiteOptions = {}
  ) {
    // Create performance test service
    this.service = {
      async fibonacci(n: number): Promise<number> {
        if (n <= 1) return n
        let a = 0, b = 1
        for (let i = 2; i <= n; i++) {
          const temp = a + b
          a = b
          b = temp
        }
        return b
      },

      async primeFactors(n: number): Promise<number[]> {
        const factors: number[] = []
        let divisor = 2
        
        while (n > 1) {
          while (n % divisor === 0) {
            factors.push(divisor)
            n /= divisor
          }
          divisor++
          if (divisor * divisor > n && n > 1) {
            factors.push(n)
            break
          }
        }
        
        return factors
      },

      async sortArray(arr: number[]): Promise<number[]> {
        return [...arr].sort((a, b) => a - b)
      },

      async createLargeObject(size: number): Promise<Record<string, any>> {
        const obj: Record<string, any> = {}
        for (let i = 0; i < size; i++) {
          obj[`key_${i}`] = {
            id: i,
            value: Math.random(),
            timestamp: Date.now(),
            data: `item_${i}`.repeat(10)
          }
        }
        return obj
      },

      async processLargeArray(arr: any[]): Promise<any[]> {
        return arr.map((item, index) => ({
          ...item,
          processed: true,
          index,
          processedAt: Date.now()
        }))
      },

      async simulateIO(delay: number): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, delay))
        return `IO operation completed after ${delay}ms`
      },

      async batchProcess(items: any[], batchSize: number): Promise<any[]> {
        const results: any[] = []
        
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize)
          const processed = batch.map(item => ({ ...item, processed: true }))
          results.push(...processed)
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        
        return results
      },

      async add(a: number, b: number): Promise<number> {
        return a + b
      },

      async echo(data: any): Promise<any> {
        return data
      }
    }

    // Set up provider and consumer
    provide(this.service, this.endpoints.endpointA)
    this.remote = consume<PerformanceTestService>(this.endpoints.endpointB)
  }

  /**
   * Run all performance tests
   */
  async runAll(): Promise<PerformanceMetrics[]> {
    this.metrics = []

    await this.testThroughput()
    await this.testLatency()
    await this.testCPUIntensiveOperations()
    await this.testLargeDataTransfer()
    await this.testConcurrentOperations()
    await this.testMemoryUsage()
    await this.testIOSimulation()
    await this.testBatchProcessing()

    return this.metrics
  }

  /**
   * Test message throughput
   */
  async testThroughput(): Promise<void> {
    const operationCount = this.options.iterations || 1000
    const testName = 'Message Throughput'
    
    const memoryBefore = this.getMemoryUsage()
    const startTime = Date.now()
    
    // Send rapid sequential messages
    const promises: Promise<number>[] = []
    for (let i = 0; i < operationCount; i++) {
      promises.push(this.remote.add(i, 1))
    }
    
    await Promise.all(promises)
    
    const endTime = Date.now()
    const memoryAfter = this.getMemoryUsage()
    
    const totalTime = endTime - startTime
    const averageTime = totalTime / operationCount
    
    this.metrics.push({
      testName,
      totalTime,
      averageTime,
      minTime: 0, // Not measured individually
      maxTime: 0, // Not measured individually
      operationCount,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: operationCount * 2, // Request + response
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  📊 ${testName}: ${operationCount} ops in ${totalTime}ms (${(operationCount / (totalTime / 1000)).toFixed(2)} ops/sec)`)
    }
  }

  /**
   * Test individual operation latency
   */
  async testLatency(): Promise<void> {
    const operationCount = Math.min(this.options.iterations || 100, 100) // Limit for individual timing
    const testName = 'Operation Latency'
    
    const times: number[] = []
    const memoryBefore = this.getMemoryUsage()
    
    for (let i = 0; i < operationCount; i++) {
      const { duration } = await TestHelpers.measureTime(() => this.remote.add(i, i))
      times.push(duration)
      
      // Small delay to prevent overwhelming
      if (i % 10 === 0) {
        await TestHelpers.delay(1)
      }
    }
    
    const memoryAfter = this.getMemoryUsage()
    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / operationCount
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    this.metrics.push({
      testName,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      operationCount,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: operationCount * 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  ⏱️  ${testName}: avg ${averageTime.toFixed(2)}ms, min ${minTime}ms, max ${maxTime}ms`)
    }
  }

  /**
   * Test CPU-intensive operations
   */
  async testCPUIntensiveOperations(): Promise<void> {
    const testName = 'CPU Intensive Operations'
    const memoryBefore = this.getMemoryUsage()
    const startTime = Date.now()
    
    // Test various CPU-intensive operations
    await this.remote.fibonacci(30)
    await this.remote.primeFactors(1000)
    await this.remote.sortArray(Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1000)))
    
    const endTime = Date.now()
    const memoryAfter = this.getMemoryUsage()
    
    this.metrics.push({
      testName,
      totalTime: endTime - startTime,
      averageTime: (endTime - startTime) / 3,
      minTime: 0,
      maxTime: 0,
      operationCount: 3,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: 3 * 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  🧮 ${testName}: ${endTime - startTime}ms for 3 operations`)
    }
  }

  /**
   * Test large data transfer performance
   */
  async testLargeDataTransfer(): Promise<void> {
    const testName = 'Large Data Transfer'
    const memoryBefore = this.getMemoryUsage()
    
    // Create and transfer large data
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: `item_${i}` }))
    
    const { result, duration } = await TestHelpers.measureTime(() => 
      this.remote.processLargeArray(largeArray)
    )
    
    const memoryAfter = this.getMemoryUsage()
    
    if (result.length !== largeArray.length) {
      throw new Error(`Large data transfer verification failed: expected ${largeArray.length}, got ${result.length}`)
    }

    this.metrics.push({
      testName,
      totalTime: duration,
      averageTime: duration,
      minTime: duration,
      maxTime: duration,
      operationCount: 1,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  📦 ${testName}: ${duration}ms for ${largeArray.length} items (${(largeArray.length / (duration / 1000)).toFixed(2)} items/sec)`)
    }
  }

  /**
   * Test concurrent operations performance
   */
  async testConcurrentOperations(): Promise<void> {
    const testName = 'Concurrent Operations'
    const concurrency = 20
    const memoryBefore = this.getMemoryUsage()
    
    const { duration } = await TestHelpers.measureTime(async () => {
      const promises = Array.from({ length: concurrency }, (_, i) => 
        this.remote.fibonacci(20 + i)
      )
      await Promise.all(promises)
    })
    
    const memoryAfter = this.getMemoryUsage()

    this.metrics.push({
      testName,
      totalTime: duration,
      averageTime: duration / concurrency,
      minTime: 0,
      maxTime: 0,
      operationCount: concurrency,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: concurrency * 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  🔄 ${testName}: ${concurrency} concurrent ops in ${duration}ms`)
    }
  }

  /**
   * Test memory usage patterns
   */
  async testMemoryUsage(): Promise<void> {
    const testName = 'Memory Usage'
    const memoryBefore = this.getMemoryUsage()
    
    // Create and process large objects
    const { duration } = await TestHelpers.measureTime(async () => {
      const largeObj = await this.remote.createLargeObject(1000)
      
      // Verify object was created correctly
      if (Object.keys(largeObj).length !== 1000) {
        throw new Error(`Memory test failed: expected 1000 keys, got ${Object.keys(largeObj).length}`)
      }
    })
    
    const memoryAfter = this.getMemoryUsage()

    this.metrics.push({
      testName,
      totalTime: duration,
      averageTime: duration,
      minTime: duration,
      maxTime: duration,
      operationCount: 1,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      const memoryDelta = memoryAfter && memoryBefore ? memoryAfter - memoryBefore : 0
      console.log(`  🧠 ${testName}: ${duration}ms, memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
    }
  }

  /**
   * Test I/O simulation performance
   */
  async testIOSimulation(): Promise<void> {
    const testName = 'I/O Simulation'
    const memoryBefore = this.getMemoryUsage()
    
    // Test various I/O delays
    const ioTests = [10, 50, 100, 200]
    const totalDuration = await TestHelpers.measureTime(async () => {
      for (const delay of ioTests) {
        await this.remote.simulateIO(delay)
      }
    })
    
    const memoryAfter = this.getMemoryUsage()

    this.metrics.push({
      testName,
      totalTime: totalDuration.duration,
      averageTime: totalDuration.duration / ioTests.length,
      minTime: 0,
      maxTime: 0,
      operationCount: ioTests.length,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: ioTests.length * 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  💾 ${testName}: ${totalDuration.duration}ms for ${ioTests.length} I/O operations`)
    }
  }

  /**
   * Test batch processing performance
   */
  async testBatchProcessing(): Promise<void> {
    const testName = 'Batch Processing'
    const itemCount = 1000
    const batchSize = 50
    const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, data: `item_${i}` }))
    
    const memoryBefore = this.getMemoryUsage()
    
    const { result, duration } = await TestHelpers.measureTime(() => 
      this.remote.batchProcess(items, batchSize)
    )
    
    const memoryAfter = this.getMemoryUsage()
    
    if (result.length !== itemCount) {
      throw new Error(`Batch processing verification failed: expected ${itemCount}, got ${result.length}`)
    }

    this.metrics.push({
      testName,
      totalTime: duration,
      averageTime: duration / Math.ceil(itemCount / batchSize),
      minTime: 0,
      maxTime: 0,
      operationCount: Math.ceil(itemCount / batchSize),
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter ? memoryAfter - (memoryBefore || 0) : undefined,
      messageCount: 2,
      errorCount: 0
    })

    if (this.options.verbose) {
      console.log(`  📋 ${testName}: ${itemCount} items in ${Math.ceil(itemCount / batchSize)} batches, ${duration}ms`)
    }
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number | undefined {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    
    return undefined
  }

  /**
   * Get performance metrics from all tests
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No performance metrics available. Run tests first.'
    }

    let report = '\\n📊 PERFORMANCE TEST REPORT\\n'
    report += '='.repeat(50) + '\\n\\n'

    this.metrics.forEach(metric => {
      report += `🔍 ${metric.testName}:\\n`
      report += `   Total Time: ${metric.totalTime}ms\\n`
      report += `   Average Time: ${metric.averageTime.toFixed(2)}ms\\n`
      if (metric.minTime > 0) {
        report += `   Min Time: ${metric.minTime}ms\\n`
        report += `   Max Time: ${metric.maxTime}ms\\n`
      }
      report += `   Operations: ${metric.operationCount}\\n`
      report += `   Messages: ${metric.messageCount}\\n`
      if (metric.memoryDelta !== undefined) {
        report += `   Memory Delta: ${(metric.memoryDelta / 1024 / 1024).toFixed(2)}MB\\n`
      }
      report += '\\n'
    })

    // Overall statistics
    const totalTime = this.metrics.reduce((sum, m) => sum + m.totalTime, 0)
    const totalOps = this.metrics.reduce((sum, m) => sum + m.operationCount, 0)
    const totalMessages = this.metrics.reduce((sum, m) => sum + m.messageCount, 0)

    report += '📈 SUMMARY:\\n'
    report += `   Total Test Time: ${totalTime}ms\\n`
    report += `   Total Operations: ${totalOps}\\n`
    report += `   Total Messages: ${totalMessages}\\n`
    report += `   Average Throughput: ${(totalOps / (totalTime / 1000)).toFixed(2)} ops/sec\\n`
    report += `   Message Rate: ${(totalMessages / (totalTime / 1000)).toFixed(2)} msgs/sec\\n`

    return report
  }
}