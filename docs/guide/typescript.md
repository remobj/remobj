---
title: "TypeScript Integration"
description: "Guide to using Remobj with TypeScript for type-safe cross-context communication"
---

# TypeScript Integration

Learn how to leverage TypeScript's type system for safe and productive cross-context communication with Remobj.

## Type-Safe APIs

Define interfaces for your cross-context APIs:

```typescript
// shared/types.ts - Shared type definitions
export interface UserAPI {
  getUser(id: string): Promise<User>
  updateUser(id: string, updates: Partial<User>): Promise<User>
  deleteUser(id: string): Promise<void>
}

export interface WorkerAPI {
  processData(data: ProcessingJob): Promise<ProcessingResult>
  getProgress(): Promise<ProgressInfo>
  cancelJob(jobId: string): Promise<void>
}

export interface ProcessingJob {
  id: string
  type: 'image' | 'video' | 'audio'
  input: ArrayBuffer
  options: ProcessingOptions
}

export interface ProcessingResult {
  jobId: string
  output: ArrayBuffer
  metadata: ProcessingMetadata
}
```

## Generic Type Inference

Leverage TypeScript's type inference:

```typescript
import { provide, consume } from '@remobj/core'

// Type-safe provide with automatic inference
function createTypedProvider<T>(api: T, target: MessagePort | Worker) {
  provide(api, target)
  return api // Returns typed API
}

// Type-safe consume with explicit typing
function createTypedConsumer<T>(target: MessagePort | Worker): T {
  return consume<T>(target)
}

// Usage
const workerAPI = {
  calculate: (x: number, y: number): Promise<number> => {
    return Promise.resolve(x + y)
  },
  
  process: async (data: string[]): Promise<ProcessedData[]> => {
    return data.map(item => ({ processed: item, timestamp: Date.now() }))
  }
}

// Automatic type inference
const typedWorkerAPI = createTypedProvider(workerAPI, worker)

// Explicit typing for consumer
interface WorkerAPI {
  calculate(x: number, y: number): Promise<number>
  process(data: string[]): Promise<ProcessedData[]>
}

const remoteWorker = createTypedConsumer<WorkerAPI>(worker)

// TypeScript ensures type safety
const result = await remoteWorker.calculate(10, 20) // result: number
const processed = await remoteWorker.process(['a', 'b']) // processed: ProcessedData[]
```

## Advanced Type Patterns

Use advanced TypeScript features:

```typescript
// Conditional types for API transformation
type RemoteAPI<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R
    ? R extends Promise<any>
      ? (...args: Args) => R  // Already async
      : (...args: Args) => Promise<R>  // Make async
    : never
}

// Utility type for creating remote APIs
type CreateRemoteAPI<T> = RemoteAPI<T>

// Example usage
interface LocalAPI {
  syncMethod(data: string): string
  asyncMethod(data: number): Promise<number>
  voidMethod(): void
}

// Automatically transforms to remote API
type RemoteLocalAPI = CreateRemoteAPI<LocalAPI>
// Result:
// {
//   syncMethod(data: string): Promise<string>
//   asyncMethod(data: number): Promise<number>
//   voidMethod(): Promise<void>
// }

const remoteAPI = consume<RemoteLocalAPI>(worker)
```

## Type Guards and Validation

Implement runtime type validation:

```typescript
// Type guards for runtime validation
function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string'
  )
}

function isProcessingJob(obj: any): obj is ProcessingJob {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    ['image', 'video', 'audio'].includes(obj.type) &&
    obj.input instanceof ArrayBuffer
  )
}

// Validated API wrapper
class ValidatedWorkerAPI {
  constructor(private worker: WorkerAPI) {}
  
  async processData(job: ProcessingJob): Promise<ProcessingResult> {
    if (!isProcessingJob(job)) {
      throw new TypeError('Invalid processing job format')
    }
    
    const result = await this.worker.processData(job)
    
    // Validate result
    if (!this.isProcessingResult(result)) {
      throw new TypeError('Invalid processing result format')
    }
    
    return result
  }
  
  private isProcessingResult(obj: any): obj is ProcessingResult {
    return (
      typeof obj === 'object' &&
      typeof obj.jobId === 'string' &&
      obj.output instanceof ArrayBuffer &&
      typeof obj.metadata === 'object'
    )
  }
}

// Usage with validation
const validatedAPI = new ValidatedWorkerAPI(
  consume<WorkerAPI>(worker)
)
```

## Generic Context Managers

Create reusable, typed context managers:

```typescript
abstract class TypedContextManager<TLocalAPI, TRemoteAPI> {
  protected localAPI!: TLocalAPI
  protected remoteAPI!: TRemoteAPI
  protected context!: Worker | MessagePort
  
  constructor(
    localAPI: TLocalAPI,
    contextFactory: () => Worker | MessagePort
  ) {
    this.localAPI = localAPI
    this.context = contextFactory()
    this.setupCommunication()
  }
  
  private setupCommunication() {
    provide(this.localAPI, this.context)
    this.remoteAPI = consume<TRemoteAPI>(this.context)
  }
  
  getRemoteAPI(): TRemoteAPI {
    return this.remoteAPI
  }
  
  abstract cleanup(): Promise<void>
}

// Specialized worker manager
class WorkerManager<TLocalAPI, TRemoteAPI> 
  extends TypedContextManager<TLocalAPI, TRemoteAPI> {
  
  constructor(
    localAPI: TLocalAPI,
    workerScript: string
  ) {
    super(localAPI, () => new Worker(workerScript))
  }
  
  async cleanup(): Promise<void> {
    if (this.context instanceof Worker) {
      this.context.terminate()
    }
  }
}

// Usage
interface MainAPI {
  log(message: string): void
  getConfig(): Promise<Config>
}

interface WorkerAPI {
  process(data: any[]): Promise<any[]>
  getStatus(): Promise<WorkerStatus>
}

const mainAPI: MainAPI = {
  log: (message) => console.log(`Worker: ${message}`),
  getConfig: async () => ({ timeout: 5000, retries: 3 })
}

const workerManager = new WorkerManager<MainAPI, WorkerAPI>(
  mainAPI,
  './typed-worker.js'
)

const worker = workerManager.getRemoteAPI()
const result = await worker.process(data) // Fully typed
```

## Type-Safe Error Handling

Define typed error handling:

```typescript
// Custom error types
abstract class RemobjError extends Error {
  abstract readonly code: string
  abstract readonly category: 'network' | 'validation' | 'processing'
}

class ValidationError extends RemobjError {
  readonly code = 'VALIDATION_ERROR'
  readonly category = 'validation' as const
  
  constructor(field: string, value: any) {
    super(`Validation failed for field '${field}' with value: ${value}`)
  }
}

class ProcessingError extends RemobjError {
  readonly code = 'PROCESSING_ERROR'
  readonly category = 'processing' as const
  
  constructor(operation: string, cause?: Error) {
    super(`Processing failed during ${operation}: ${cause?.message || 'Unknown error'}`)
  }
}

// Type-safe error handling wrapper
type APIWithErrors<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => Promise<infer R>
    ? (...args: Args) => Promise<R | never>
    : T[K]
}

class ErrorHandledAPI<T> {
  constructor(private api: T) {}
  
  async callSafely<K extends keyof T>(
    method: K,
    ...args: T[K] extends (...args: infer Args) => any ? Args : never
  ): Promise<T[K] extends (...args: any[]) => Promise<infer R> ? R : never> {
    try {
      const result = (this.api[method] as any)(...args)
      return await result
    } catch (error) {
      if (error instanceof RemobjError) {
        throw error // Re-throw typed errors
      }
      
      // Wrap unknown errors
      throw new ProcessingError(String(method), error as Error)
    }
  }
}

// Usage
const safeAPI = new ErrorHandledAPI(workerAPI)

try {
  const result = await safeAPI.callSafely('processData', jobData)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message)
  } else if (error instanceof ProcessingError) {
    console.error('Processing failed:', error.message)
  }
}
```

## Next Steps

- [Testing Strategies](./testing) - Test TypeScript integrations
- [Core Concepts](./core-concepts) - Understanding Remobj fundamentals