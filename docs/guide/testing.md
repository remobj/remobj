---
title: "Testing Strategies"
description: "Guide to testing Remobj applications and cross-context communication"
---

# Testing Strategies

Learn effective strategies for testing cross-context communication and Remobj-based applications.

## Unit Testing

Test individual API methods in isolation:

```typescript
// worker-api.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { provide, consume } from '@remobj/core'

describe('WorkerAPI', () => {
  let worker: Worker
  let workerAPI: WorkerAPI
  let mainAPI: MainAPI
  
  beforeEach(async () => {
    // Create worker for testing
    worker = new Worker('./test-worker.js')
    
    // Mock main API
    mainAPI = {
      log: vi.fn(),
      getConfig: vi.fn().mockResolvedValue({ timeout: 5000 })
    }
    
    provide(mainAPI, worker)
    workerAPI = consume<WorkerAPI>(worker)
    
    // Wait for worker to initialize
    await new Promise(resolve => {
      worker.addEventListener('message', function onReady(event) {
        if (event.data.type === 'ready') {
          worker.removeEventListener('message', onReady)
          resolve(undefined)
        }
      })
    })
  })
  
  afterEach(() => {
    worker.terminate()
  })
  
  it('should process data correctly', async () => {
    const testData = [1, 2, 3, 4, 5]
    const result = await workerAPI.processData(testData)
    
    expect(result).toHaveLength(5)
    expect(result.every(n => typeof n === 'number')).toBe(true)
  })
  
  it('should handle empty data', async () => {
    const result = await workerAPI.processData([])
    expect(result).toEqual([])
  })
  
  it('should report progress', async () => {
    const progressPromise = new Promise<number[]>((resolve) => {
      const progress: number[] = []
      const originalLog = mainAPI.log as any
      
      mainAPI.log = vi.fn().mockImplementation((message: string) => {
        if (message.startsWith('Progress:')) {
          const percent = parseInt(message.split(':')[1])
          progress.push(percent)
          
          if (percent === 100) {
            resolve(progress)
          }
        }
        originalLog(message)
      })
    })
    
    const dataPromise = workerAPI.processLargeDataset(
      Array.from({ length: 1000 }, (_, i) => i)
    )
    
    const [progress] = await Promise.all([progressPromise, dataPromise])
    
    expect(progress.length).toBeGreaterThan(0)
    expect(progress[progress.length - 1]).toBe(100)
  })
})
```

## Integration Testing

Test complete workflows across contexts:

```typescript
// integration.test.ts
describe('Cross-Context Integration', () => {
  it('should handle complete user workflow', async () => {
    // Setup multiple contexts
    const worker = new Worker('./worker.js')
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    
    // Setup communication
    const workerAPI = consume<WorkerAPI>(worker)
    const iframeAPI = consume<IframeAPI>(iframe.contentWindow!)
    
    try {
      // Test workflow: iframe -> main -> worker -> main -> iframe
      const userData = await iframeAPI.getUserInput()
      expect(userData.name).toBeDefined()
      
      const processedData = await workerAPI.processUserData(userData)
      expect(processedData.id).toBeDefined()
      
      const success = await iframeAPI.displayResult(processedData)
      expect(success).toBe(true)
      
    } finally {
      worker.terminate()
      document.body.removeChild(iframe)
    }
  })
  
  it('should handle error propagation across contexts', async () => {
    const worker = new Worker('./worker.js')
    const workerAPI = consume<WorkerAPI>(worker)
    
    try {
      await expect(workerAPI.processInvalidData(null))
        .rejects
        .toThrow('Invalid data provided')
    } finally {
      worker.terminate()
    }
  })
})
```

## Mock Testing

Create mocks for cross-context communication:

```typescript
// mocks/worker-mock.ts
export class MockWorkerAPI implements WorkerAPI {
  private processingDelay = 100
  
  async processData(data: any[]): Promise<any[]> {
    await this.delay(this.processingDelay)
    return data.map(item => ({ processed: item, timestamp: Date.now() }))
  }
  
  async processLargeDataset(data: any[]): Promise<any[]> {
    const results = []
    
    for (let i = 0; i < data.length; i += 100) {
      const batch = data.slice(i, i + 100)
      const batchResult = await this.processData(batch)
      results.push(...batchResult)
      
      // Simulate progress reporting
      const progress = Math.round(((i + 100) / data.length) * 100)
      await this.mockMainAPI.log(`Progress: ${Math.min(progress, 100)}`)
    }
    
    return results
  }
  
  setProcessingDelay(ms: number) {
    this.processingDelay = ms
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Test with mock
describe('Application Logic', () => {
  it('should handle slow worker responses', async () => {
    const mockWorker = new MockWorkerAPI()
    mockWorker.setProcessingDelay(2000) // 2 second delay
    
    const startTime = Date.now()
    await mockWorker.processData([1, 2, 3])
    const endTime = Date.now()
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(2000)
  })
})
```

## Performance Testing

Test performance characteristics:

```typescript
// performance.test.ts
describe('Performance Tests', () => {
  it('should handle large datasets efficiently', async () => {
    const worker = new Worker('./worker.js')
    const workerAPI = consume<WorkerAPI>(worker)
    
    const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
      id: i,
      data: `item-${i}`,
      timestamp: Date.now()
    }))
    
    const startTime = performance.now()
    const result = await workerAPI.processLargeDataset(largeDataset)
    const endTime = performance.now()
    
    const processingTime = endTime - startTime
    const itemsPerSecond = largeDataset.length / (processingTime / 1000)
    
    expect(result).toHaveLength(largeDataset.length)
    expect(itemsPerSecond).toBeGreaterThan(1000) // At least 1000 items/sec
    
    worker.terminate()
  })
  
  it('should not exceed memory limits', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    const worker = new Worker('./worker.js')
    const workerAPI = consume<WorkerAPI>(worker)
    
    // Process multiple large datasets
    for (let i = 0; i < 10; i++) {
      const dataset = Array.from({ length: 10000 }, (_, j) => j)
      await workerAPI.processData(dataset)
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    // Memory should not increase by more than 50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    
    worker.terminate()
  })
})
```

## Error Scenario Testing

Test error handling and edge cases:

```typescript
// error-scenarios.test.ts
describe('Error Scenarios', () => {
  it('should handle worker termination gracefully', async () => {
    const worker = new Worker('./worker.js')
    const workerAPI = consume<WorkerAPI>(worker)
    
    // Start a long-running operation
    const operationPromise = workerAPI.processLargeDataset(
      Array.from({ length: 10000 }, (_, i) => i)
    )
    
    // Terminate worker mid-operation
    setTimeout(() => worker.terminate(), 100)
    
    await expect(operationPromise).rejects.toThrow(/terminated/i)
  })
  
  it('should handle network disconnection (iframe)', async () => {
    const iframe = document.createElement('iframe')
    iframe.src = 'https://example.com/iframe.html'
    document.body.appendChild(iframe)
    
    const iframeAPI = consume<IframeAPI>(iframe.contentWindow!)
    
    // Remove iframe to simulate disconnection
    setTimeout(() => document.body.removeChild(iframe), 100)
    
    await expect(iframeAPI.getData()).rejects.toThrow()
  })
  
  it('should handle serialization errors', async () => {
    const worker = new Worker('./worker.js')
    const workerAPI = consume<WorkerAPI>(worker)
    
    // Try to send non-serializable data
    const circularData = { prop: null as any }
    circularData.prop = circularData // Circular reference
    
    await expect(workerAPI.processData([circularData]))
      .rejects
      .toThrow(/circular|serialize/i)
    
    worker.terminate()
  })
})
```

## Test Utilities

Create reusable test utilities:

```typescript
// test-utils.ts
export class TestWorkerManager {
  private workers: Worker[] = []
  
  createWorker(script: string): Worker {
    const worker = new Worker(script)
    this.workers.push(worker)
    return worker
  }
  
  createMockWorker<T>(mockAPI: T): { worker: Worker; api: T } {
    const worker = this.createWorker('./mock-worker.js')
    
    // Setup mock API
    worker.postMessage({ type: 'setup-mock', api: mockAPI })
    
    return { worker, api: mockAPI }
  }
  
  async waitForWorkerReady(worker: Worker): Promise<void> {
    return new Promise((resolve) => {
      worker.addEventListener('message', function onReady(event) {
        if (event.data.type === 'ready') {
          worker.removeEventListener('message', onReady)
          resolve()
        }
      })
    })
  }
  
  cleanupAll() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
  }
}

// Usage in tests
describe('Test Suite', () => {
  const testManager = new TestWorkerManager()
  
  afterEach(() => {
    testManager.cleanupAll()
  })
  
  it('should work with mock worker', async () => {
    const { worker, api } = testManager.createMockWorker({
      process: vi.fn().mockResolvedValue([1, 2, 3])
    })
    
    await testManager.waitForWorkerReady(worker)
    
    const workerAPI = consume<WorkerAPI>(worker)
    const result = await workerAPI.process([])
    
    expect(result).toEqual([1, 2, 3])
  })
})
```

## Next Steps

- [Core Concepts](./core-concepts) - Understanding Remobj fundamentals
- [Performance Optimization](./performance) - Optimize your applications