---
title: "Working with Web Workers"
description: "Complete guide to using Remobj with Web Workers"
---

# Working with Web Workers

Web Workers are one of the most common use cases for Remobj. This guide covers everything you need to know about using Remobj effectively with Web Workers.

## Why Web Workers?

Web Workers solve a fundamental problem in web development: **JavaScript's single-threaded nature**. Without workers, any CPU-intensive task will block the main thread, causing:

- ❄️ Frozen user interfaces
- 🐌 Unresponsive interactions  
- 📱 Poor user experience
- 🚫 Browser "unresponsive script" warnings

Web Workers run in parallel, keeping your UI smooth while handling heavy computations.

## Basic Setup

### Main Thread (UI)

```typescript
// main.ts
import { provide, consume } from '@remobj/core'

// API for worker to call back to main thread
const mainAPI = {
  updateProgress: (percent: number) => {
    const progressBar = document.getElementById('progress') as HTMLProgressElement
    progressBar.value = percent
  },
  
  showResult: (result: string) => {
    document.getElementById('result')!.textContent = result
  }
}

// Create worker and set up communication
const worker = new Worker('./worker.js', { type: 'module' })

// Provide main API to worker
provide(mainAPI, worker)

// Consume worker API
interface WorkerAPI {
  calculatePi(digits: number): Promise<string>
  processLargeDataset(data: number[]): Promise<number[]>
  cancelOperation(): Promise<void>
}

const workerAPI = consume<WorkerAPI>(worker)

// Use the worker
document.getElementById('calculate')?.addEventListener('click', async () => {
  try {
    const pi = await workerAPI.calculatePi(10000)
    console.log('π =', pi)
  } catch (error) {
    console.error('Calculation failed:', error)
  }
})
```

### Worker Thread

```typescript
// worker.ts
import { provide, consume } from '@remobj/core'

// API for main thread to call
const workerAPI = {
  calculatePi: async (digits: number): Promise<string> => {
    let pi = ''
    const total = digits * 1000 // Simulate work
    
    for (let i = 0; i < total; i++) {
      // Simulate heavy computation
      if (i % 10000 === 0) {
        await mainAPI.updateProgress((i / total) * 100)
      }
      
      // Actual pi calculation would go here
      pi += Math.floor(Math.random() * 10).toString()
    }
    
    await mainAPI.showResult(`Calculated π to ${digits} digits`)
    return pi
  },
  
  processLargeDataset: async (data: number[]): Promise<number[]> => {
    const results: number[] = []
    
    for (let i = 0; i < data.length; i++) {
      // Heavy processing
      const processed = Math.sqrt(data[i] * Math.PI)
      results.push(processed)
      
      if (i % 1000 === 0) {
        await mainAPI.updateProgress((i / data.length) * 100)
      }
    }
    
    return results
  },
  
  cancelOperation: async (): Promise<void> => {
    // Cancellation logic
    shouldCancel = true
  }
}

// Provide worker API to main thread
provide(workerAPI, self)

// Consume main thread API
interface MainAPI {
  updateProgress(percent: number): void
  showResult(result: string): void
}

const mainAPI = consume<MainAPI>(self)

let shouldCancel = false
```

## Common Patterns

### Progress Reporting

Long-running operations should report progress:

```typescript
// Worker
const workerAPI = {
  processImages: async (images: ImageData[]): Promise<ProcessedImage[]> => {
    const results: ProcessedImage[] = []
    
    for (let i = 0; i < images.length; i++) {
      if (shouldCancel) {
        throw new Error('Operation cancelled')
      }
      
      // Process image
      const processed = await processImage(images[i])
      results.push(processed)
      
      // Report progress
      const progress = ((i + 1) / images.length) * 100
      await mainAPI.updateProgress(progress, `Processing image ${i + 1}/${images.length}`)
    }
    
    return results
  }
}
```

### Cancellation Support

Allow users to cancel long-running operations:

```typescript
// Worker
let currentOperation: AbortController | null = null

const workerAPI = {
  startLongOperation: async (data: any[]): Promise<any[]> => {
    currentOperation = new AbortController()
    const signal = currentOperation.signal
    
    try {
      const results = []
      
      for (let i = 0; i < data.length; i++) {
        if (signal.aborted) {
          throw new Error('Operation cancelled')
        }
        
        const result = await processItem(data[i])
        results.push(result)
      }
      
      return results
    } finally {
      currentOperation = null
    }
  },
  
  cancelOperation: async (): Promise<void> => {
    if (currentOperation) {
      currentOperation.abort()
      await mainAPI.showMessage('Operation cancelled')
    }
  }
}
```

### Error Handling

Properly handle and report errors:

```typescript
// Worker
const workerAPI = {
  processFile: async (fileData: ArrayBuffer): Promise<ProcessedData> => {
    try {
      // Validate input
      if (!fileData || fileData.byteLength === 0) {
        throw new Error('Invalid file data')
      }
      
      if (fileData.byteLength > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE} bytes`)
      }
      
      // Process file
      return await processFileData(fileData)
      
    } catch (error) {
      // Log error details in worker
      console.error('Worker processing error:', error)
      
      // Report to main thread
      await mainAPI.showError(error.message)
      
      // Re-throw to maintain error propagation
      throw error
    }
  }
}

// Main thread
try {
  const result = await workerAPI.processFile(fileData)
  // Handle success
} catch (error) {
  // Error is automatically propagated from worker
  console.error('Processing failed:', error.message)
}
```

## Performance Optimization

### Batching Operations

Avoid chatty communication by batching operations:

```typescript
// ✅ Good - batch processing
const workerAPI = {
  processItemsBatch: (items: Item[]): ProcessedItem[] => {
    return items.map(item => processItem(item))
  }
}

// Usage
const results = await workerAPI.processItemsBatch(allItems)

// ❌ Less efficient - individual calls
const workerAPI = {
  processItem: (item: Item): ProcessedItem => {
    return processItem(item)
  }
}

// Usage - many round trips
const results = await Promise.all(
  allItems.map(item => workerAPI.processItem(item))
)
```

### Transferable Objects

For large ArrayBuffers, use Transferable Objects to avoid copying:

```typescript
// Main thread
const largeBuffer = new ArrayBuffer(1024 * 1024) // 1MB

// ❌ This copies the buffer (expensive)
const result = await workerAPI.processBuffer(largeBuffer)

// ✅ This transfers ownership (fast)
const result = await workerAPI.processBuffer(largeBuffer, [largeBuffer])
```

**Note**: Remobj doesn't directly support Transferable Objects yet, but you can use raw `postMessage` for this specific case:

```typescript
// For now, use raw postMessage for transferables
worker.postMessage({
  type: 'PROCESS_BUFFER',
  buffer: largeBuffer
}, [largeBuffer])
```

### Memory Management

Be mindful of memory usage in workers:

```typescript
// Worker
const workerAPI = {
  processLargeDataset: async (data: LargeData[]): Promise<ProcessedData[]> => {
    const results: ProcessedData[] = []
    
    // Process in chunks to avoid memory spikes
    const CHUNK_SIZE = 1000
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE)
      const processedChunk = chunk.map(processItem)
      results.push(...processedChunk)
      
      // Allow garbage collection
      if (i % (CHUNK_SIZE * 10) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    return results
  }
}
```

## Advanced Patterns

### Worker Pool

Manage multiple workers for parallel processing:

```typescript
// main.ts
class WorkerPool {
  private workers: Worker[] = []
  private workerAPIs: WorkerAPI[] = []
  private currentWorker = 0
  
  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker('./worker.js', { type: 'module' })
      provide(mainAPI, worker)
      
      this.workers.push(worker)
      this.workerAPIs.push(consume<WorkerAPI>(worker))
    }
  }
  
  async processTask<T>(task: () => Promise<T>): Promise<T> {
    const workerAPI = this.workerAPIs[this.currentWorker]
    this.currentWorker = (this.currentWorker + 1) % this.workers.length
    
    return workerAPI.executeTask(task.toString())
  }
  
  destroy() {
    this.workers.forEach(worker => worker.terminate())
  }
}

// Usage
const pool = new WorkerPool(4) // 4 workers

const tasks = Array.from({ length: 100 }, (_, i) => 
  () => heavyComputation(i)
)

const results = await Promise.all(
  tasks.map(task => pool.processTask(task))
)

pool.destroy()
```

### Shared State Management

Share state between main thread and workers:

```typescript
// main.ts
interface AppState {
  settings: UserSettings
  cache: Map<string, any>
  currentUser: User | null
}

class StateManager {
  private state: AppState = {
    settings: {},
    cache: new Map(),
    currentUser: null
  }
  
  private workers: WorkerAPI[] = []
  
  async updateSettings(newSettings: UserSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings }
    
    // Notify all workers
    await Promise.all(
      this.workers.map(worker => 
        worker.updateSettings(this.state.settings)
      )
    )
  }
  
  registerWorker(workerAPI: WorkerAPI) {
    this.workers.push(workerAPI)
    // Send initial state
    workerAPI.updateSettings(this.state.settings)
  }
}
```

### Hot Module Replacement

Support development-time worker reloading:

```typescript
// main.ts (development only)
if (process.env.NODE_ENV === 'development') {
  let worker: Worker
  let workerAPI: WorkerAPI
  
  const createWorker = () => {
    if (worker) {
      worker.terminate()
    }
    
    worker = new Worker('./worker.js', { type: 'module' })
    provide(mainAPI, worker)
    workerAPI = consume<WorkerAPI>(worker)
    
    console.log('Worker reloaded')
  }
  
  // Watch for worker file changes
  if (module.hot) {
    module.hot.accept('./worker.js', createWorker)
  }
  
  createWorker()
}
```

## Testing Workers with Remobj

### Unit Testing

Test worker logic independently:

```typescript
// worker.test.ts
import { workerAPI } from './worker'

describe('Worker API', () => {
  test('calculatePi returns correct format', async () => {
    const result = await workerAPI.calculatePi(5)
    expect(typeof result).toBe('string')
    expect(result.length).toBe(5)
  })
  
  test('processLargeDataset handles empty array', async () => {
    const result = await workerAPI.processLargeDataset([])
    expect(result).toEqual([])
  })
})
```

### Integration Testing

Test main thread and worker communication:

```typescript
// integration.test.ts
import { provide, consume } from '@remobj/core'

describe('Worker Integration', () => {
  let worker: Worker
  let workerAPI: WorkerAPI
  
  beforeEach(() => {
    worker = new Worker('./worker.js', { type: 'module' })
    provide(mockMainAPI, worker)
    workerAPI = consume<WorkerAPI>(worker)
  })
  
  afterEach(() => {
    worker.terminate()
  })
  
  test('worker processes data correctly', async () => {
    const testData = [1, 2, 3, 4, 5]
    const result = await workerAPI.processLargeDataset(testData)
    
    expect(result).toHaveLength(5)
    expect(result.every(n => typeof n === 'number')).toBe(true)
  })
})
```

## Common Pitfalls

### 1. Forgetting Async/Await

```typescript
// ❌ Wrong - missing await
const result = workerAPI.calculate(100) // Returns Promise<number>
console.log(result + 1) // NaN - trying to add to Promise

// ✅ Correct
const result = await workerAPI.calculate(100) // Returns number
console.log(result + 1) // Works correctly
```

### 2. Serialization Issues

```typescript
// ❌ Wrong - functions can't be serialized
const workerAPI = {
  processWithCallback: (data: any[], callback: (item: any) => any) => {
    return data.map(callback) // Error: callback is not a function
  }
}

// ✅ Correct - use data only
const workerAPI = {
  processWithOperation: (data: any[], operation: 'double' | 'square') => {
    const operations = {
      double: (x: number) => x * 2,
      square: (x: number) => x * x
    }
    return data.map(operations[operation])
  }
}
```

### 3. Memory Leaks

```typescript
// ❌ Wrong - worker not terminated
const worker = new Worker('./worker.js')
// ... use worker
// Worker keeps running forever

// ✅ Correct - clean up
const worker = new Worker('./worker.js')
// ... use worker
worker.terminate() // Clean up when done
```

## Next Steps

- [Provide & Consume](./provide-consume) - Deep dive into the core API
- [Core Concepts](./core-concepts) - Understanding how Remobj works
- [Package Overview](./packages) - Explore other Remobj packages