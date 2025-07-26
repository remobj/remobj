import type { EndpointPair, PerformanceMetrics } from '../types'

/**
 * Performance profiler for remobj endpoints
 */
export class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map()
  private activeTimers: Map<string, number> = new Map()

  /**
   * Start measuring a performance metric
   */
  startMeasurement(label: string): void {
    this.activeTimers.set(label, Date.now())
  }

  /**
   * End measuring a performance metric
   */
  endMeasurement(label: string): number {
    const startTime = this.activeTimers.get(label)
    if (!startTime) {
      throw new Error(`No active measurement found for label: ${label}`)
    }

    const duration = Date.now() - startTime
    this.activeTimers.delete(label)

    // Store measurement
    if (!this.measurements.has(label)) {
      this.measurements.set(label, [])
    }
    this.measurements.get(label)!.push(duration)

    return duration
  }

  /**
   * Measure a function execution
   */
  async measure<T>(label: string, fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    this.startMeasurement(label)
    const result = await fn()
    const duration = this.endMeasurement(label)
    return { result, duration }
  }

  /**
   * Get statistics for a measurement label
   */
  getStats(label: string): {
    count: number
    total: number
    average: number
    min: number
    max: number
    median: number
    p95: number
    p99: number
  } | null {
    const measurements = this.measurements.get(label)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const count = measurements.length
    const total = measurements.reduce((sum, val) => sum + val, 0)
    const average = total / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const median = sorted[Math.floor(count / 2)]
    const p95 = sorted[Math.floor(count * 0.95)]
    const p99 = sorted[Math.floor(count * 0.99)]

    return { count, total, average, min, max, median, p95, p99 }
  }

  /**
   * Get all measurement labels
   */
  getLabels(): string[] {
    return Array.from(this.measurements.keys())
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear()
    this.activeTimers.clear()
  }

  /**
   * Clear measurements for a specific label
   */
  clearLabel(label: string): void {
    this.measurements.delete(label)
    this.activeTimers.delete(label)
  }

  /**
   * Profile endpoint communication latency
   */
  async profileCommunicationLatency(
    endpoints: EndpointPair,
    messageCount: number = 100
  ): Promise<{
    sendLatency: ReturnType<PerformanceProfiler['getStats']>
    roundTripLatency: ReturnType<PerformanceProfiler['getStats']>
  }> {
    // Profile send latency
    for (let i = 0; i < messageCount; i++) {
      await this.measure('send', async () => {
        endpoints.endpointA.postMessage({ id: i, timestamp: Date.now() })
        // Small delay to ensure message is processed
        await new Promise(resolve => setTimeout(resolve, 1))
      })
    }

    // Profile round-trip latency
    for (let i = 0; i < messageCount; i++) {
      await this.measure('roundtrip', async () => {
        return new Promise<void>((resolve) => {
          const listener = (event: MessageEvent) => {
            if (event.data.id === i) {
              endpoints.endpointA.removeEventListener('message', listener)
              resolve()
            }
          }
          
          endpoints.endpointA.addEventListener('message', listener)
          endpoints.endpointB.postMessage({ id: i, timestamp: Date.now() })
        })
      })
    }

    return {
      sendLatency: this.getStats('send'),
      roundTripLatency: this.getStats('roundtrip')
    }
  }

  /**
   * Profile memory usage during operations
   */
  async profileMemoryUsage<T>(
    operation: () => Promise<T> | T,
    label: string = 'memory-profile'
  ): Promise<{
    result: T
    memoryBefore?: number
    memoryAfter?: number
    memoryDelta?: number
    duration: number
  }> {
    const memoryBefore = this.getMemoryUsage()
    
    const { result, duration } = await this.measure(label, operation)
    
    const memoryAfter = this.getMemoryUsage()
    const memoryDelta = memoryBefore && memoryAfter ? memoryAfter - memoryBefore : undefined

    return {
      result,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      duration
    }
  }

  /**
   * Profile concurrent operations
   */
  async profileConcurrency<T>(
    operations: Array<() => Promise<T> | T>,
    concurrency: number = 10,
    label: string = 'concurrent'
  ): Promise<{
    results: T[]
    totalDuration: number
    averageDuration: number
    concurrentStats: ReturnType<PerformanceProfiler['getStats']>
  }> {
    const startTime = Date.now()
    const results: T[] = []

    // Run operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency)
      
      const batchPromises = batch.map((operation, index) =>
        this.measure(`${label}-${i + index}`, operation)
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.map(r => r.result))
    }

    const totalDuration = Date.now() - startTime
    const averageDuration = totalDuration / operations.length

    // Get stats for individual operations
    const allDurations: number[] = []
    for (let i = 0; i < operations.length; i++) {
      const measurements = this.measurements.get(`${label}-${i}`)
      if (measurements) {
        allDurations.push(...measurements)
      }
    }

    // Create temporary stats for concurrent operations
    const tempLabel = `${label}-temp`
    this.measurements.set(tempLabel, allDurations)
    const concurrentStats = this.getStats(tempLabel)
    this.measurements.delete(tempLabel)

    return {
      results,
      totalDuration,
      averageDuration,
      concurrentStats
    }
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const labels = this.getLabels()
    if (labels.length === 0) {
      return 'No performance measurements recorded.'
    }

    let report = '\\n📊 PERFORMANCE PROFILER REPORT\\n'
    report += '='.repeat(50) + '\\n\\n'

    labels.forEach(label => {
      const stats = this.getStats(label)
      if (stats) {
        report += `🔍 ${label}:\\n`
        report += `   Count: ${stats.count}\\n`
        report += `   Total: ${stats.total}ms\\n`
        report += `   Average: ${stats.average.toFixed(2)}ms\\n`
        report += `   Min: ${stats.min}ms\\n`
        report += `   Max: ${stats.max}ms\\n`
        report += `   Median: ${stats.median}ms\\n`
        report += `   95th Percentile: ${stats.p95}ms\\n`
        report += `   99th Percentile: ${stats.p99}ms\\n`
        report += '\\n'
      }
    })

    return report
  }

  /**
   * Export measurements as JSON
   */
  exportMeasurements(): Record<string, {
    measurements: number[]
    stats: ReturnType<PerformanceProfiler['getStats']>
  }> {
    const exported: Record<string, any> = {}

    this.getLabels().forEach(label => {
      exported[label] = {
        measurements: this.measurements.get(label) || [],
        stats: this.getStats(label)
      }
    })

    return exported
  }

  /**
   * Import measurements from JSON
   */
  importMeasurements(data: Record<string, { measurements: number[] }>): void {
    Object.entries(data).forEach(([label, { measurements }]) => {
      this.measurements.set(label, [...measurements])
    })
  }

  /**
   * Get memory usage (platform-specific)
   */
  private getMemoryUsage(): number | undefined {
    // Node.js
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    
    // Modern browsers
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    
    return undefined
  }

  /**
   * Create a performance metrics object
   */
  createMetrics(
    testName: string,
    operationCount: number = 1,
    messageCount: number = 0,
    errorCount: number = 0
  ): PerformanceMetrics {
    const stats = this.getStats(testName)
    const memoryBefore = this.getMemoryUsage()
    const memoryAfter = this.getMemoryUsage()

    return {
      testName,
      totalTime: stats?.total || 0,
      averageTime: stats?.average || 0,
      minTime: stats?.min || 0,
      maxTime: stats?.max || 0,
      operationCount,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryBefore && memoryAfter ? memoryAfter - memoryBefore : undefined,
      messageCount,
      errorCount
    }
  }
}