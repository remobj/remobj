---
title: "Performance Optimization"
description: "Guide to optimizing Remobj applications for best performance"
---

# Performance Optimization

Learn how to optimize your Remobj applications for maximum performance and minimal overhead.

## Message Serialization

Optimize data serialization for better performance:

```typescript
// ❌ Avoid large objects with complex nesting
const inefficientData = {
  users: Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    profile: {
      details: {
        personal: { /* deep nesting */ },
        professional: { /* more deep nesting */ }
      }
    }
  }))
}

// ✅ Use flat structures and batch operations
const efficientData = {
  userIds: Array.from({ length: 10000 }, (_, i) => i),
  userProfiles: new Map() // Separate lookup
}

// ✅ Process in batches
const workerAPI = {
  processBatch: async (userIds: number[]): Promise<ProcessedUser[]> => {
    return userIds.map(id => processUser(id))
  }
}

// Process in chunks of 1000
const results = []
for (let i = 0; i < userIds.length; i += 1000) {
  const batch = userIds.slice(i, i + 1000)
  const batchResults = await workerAPI.processBatch(batch)
  results.push(...batchResults)
}
```

## Connection Pooling

Reuse connections and workers:

```typescript
class WorkerPool {
  private workers: Worker[] = []
  private workerAPIs: WorkerAPI[] = []
  private busyWorkers = new Set<number>()
  private taskQueue: Task[] = []
  
  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      this.createWorker(i)
    }
  }
  
  private createWorker(index: number) {
    const worker = new Worker('./optimized-worker.js')
    this.workers[index] = worker
    
    provide(mainAPI, worker)
    this.workerAPIs[index] = consume<WorkerAPI>(worker)
    
    // Reuse worker after task completion
    worker.addEventListener('message', (event) => {
      if (event.data.type === 'task-complete') {
        this.busyWorkers.delete(index)
        this.processQueue()
      }
    })
  }
  
  async executeTask<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject })
      this.processQueue()
    })
  }
  
  private processQueue() {
    if (this.taskQueue.length === 0) return
    
    const availableWorker = this.workers.findIndex((_, i) => 
      !this.busyWorkers.has(i)
    )
    
    if (availableWorker !== -1) {
      const { task, resolve, reject } = this.taskQueue.shift()!
      this.busyWorkers.add(availableWorker)
      
      this.workerAPIs[availableWorker]
        .executeTask(task)
        .then(resolve)
        .catch(reject)
    }
  }
}
```

## Memory Management

Prevent memory leaks and optimize memory usage:

```typescript
// ✅ Clean references after use
class ContextManager {
  private contexts = new Map<string, Context>()
  private contextAPIs = new Map<string, any>()
  
  async createContext(id: string, config: ContextConfig): Promise<ContextAPI> {
    const context = new Context(config)
    const api = consume<ContextAPI>(context)
    
    this.contexts.set(id, context)
    this.contextAPIs.set(id, api)
    
    return api
  }
  
  async destroyContext(id: string) {
    const context = this.contexts.get(id)
    const api = this.contextAPIs.get(id)
    
    if (context) {
      await context.terminate()
      this.contexts.delete(id)
    }
    
    if (api) {
      // Clear any pending promises or callbacks
      this.contextAPIs.delete(id)
    }
  }
  
  // Periodic cleanup
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupInactiveContexts()
    }, 60000) // Every minute
  }
  
  private cleanupInactiveContexts() {
    const now = Date.now()
    
    for (const [id, context] of this.contexts) {
      if (now - context.lastActivity > 300000) { // 5 minutes
        this.destroyContext(id)
      }
    }
  }
}
```

## Lazy Loading

Load resources only when needed:

```typescript
class LazyWorkerManager {
  private workerPromise: Promise<WorkerAPI> | null = null
  
  private async getWorker(): Promise<WorkerAPI> {
    if (!this.workerPromise) {
      this.workerPromise = this.createWorker()
    }
    return this.workerPromise
  }
  
  private async createWorker(): Promise<WorkerAPI> {
    // Load worker script dynamically
    const workerBlob = new Blob([
      await (await fetch('./worker.js')).text()
    ], { type: 'application/javascript' })
    
    const worker = new Worker(URL.createObjectURL(workerBlob))
    provide(mainAPI, worker)
    
    return consume<WorkerAPI>(worker)
  }
  
  async processData(data: any[]): Promise<any[]> {
    const worker = await this.getWorker()
    return worker.processData(data)
  }
}
```

## Caching Strategies

Implement intelligent caching:

```typescript
class CachedWorkerAPI {
  private cache = new Map<string, { result: any, timestamp: number }>()
  private worker: WorkerAPI
  
  constructor(worker: WorkerAPI) {
    this.worker = worker
  }
  
  async processWithCache(
    data: any,
    ttl: number = 300000 // 5 minutes
  ): Promise<any> {
    const key = this.getCacheKey(data)
    const cached = this.cache.get(key)
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.result
    }
    
    const result = await this.worker.process(data)
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
    
    return result
  }
  
  private getCacheKey(data: any): string {
    return JSON.stringify(data) // Simple key generation
  }
  
  clearExpiredCache() {
    const now = Date.now()
    
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > 300000) {
        this.cache.delete(key)
      }
    }
  }
}
```

## Monitoring Performance

Track and optimize performance metrics:

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>()
  
  async measureOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - start
      
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration)
      throw error
    }
  }
  
  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }
  
  getAverageTime(operation: string): number {
    const values = this.metrics.get(operation) || []
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }
  
  getPerformanceReport(): PerformanceReport {
    const report: PerformanceReport = {}
    
    for (const [name, values] of this.metrics) {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      
      report[name] = { avg, min, max, count: values.length }
    }
    
    return report
  }
}

// Usage
const monitor = new PerformanceMonitor()

const result = await monitor.measureOperation('data-processing', async () => {
  return workerAPI.processLargeDataset(data)
})
```

## Next Steps

- [Testing Strategies](./testing) - Test performance optimizations
- [TypeScript Integration](./typescript) - Optimize TypeScript usage