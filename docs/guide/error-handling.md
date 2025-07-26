---
title: "Error Handling"
description: "Guide to handling errors in Remobj applications"
---

# Error Handling

Learn how to properly handle errors and failures in cross-context communication with Remobj.

## Error Propagation

Remobj automatically propagates errors across contexts:

```typescript
// Worker
const workerAPI = {
  riskyOperation: async (data: any): Promise<any> => {
    if (!data) {
      throw new Error('Data is required')
    }
    
    if (data.type === 'invalid') {
      throw new TypeError('Invalid data type')
    }
    
    return processData(data)
  }
}

// Main thread
try {
  const result = await workerAPI.riskyOperation(null)
} catch (error) {
  console.error('Operation failed:', error.message) // "Data is required"
  console.error('Error type:', error.constructor.name) // "Error"
}
```

## Custom Error Types

Create custom error classes for better error handling:

```typescript
class ValidationError extends Error {
  constructor(field: string, value: any) {
    super(`Validation failed for field '${field}' with value: ${value}`)
    this.name = 'ValidationError'
  }
}

class NetworkError extends Error {
  constructor(statusCode: number, message: string) {
    super(`Network error (${statusCode}): ${message}`)
    this.name = 'NetworkError'
  }
}

// Worker
const workerAPI = {
  validateAndProcess: async (userData: UserData): Promise<ProcessedData> => {
    if (!userData.email) {
      throw new ValidationError('email', userData.email)
    }
    
    try {
      return await processUserData(userData)
    } catch (networkError) {
      throw new NetworkError(500, 'Processing service unavailable')
    }
  }
}
```

## Error Recovery

Implement retry mechanisms and fallbacks:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

// Usage
const result = await withRetry(
  () => workerAPI.unreliableOperation(data),
  3,
  1000
)
```

## Graceful Degradation

Handle context unavailability gracefully:

```typescript
class ServiceManager {
  private workerAPI: WorkerAPI | null = null
  
  async initialize() {
    try {
      const worker = new Worker('./worker.js')
      this.workerAPI = consume<WorkerAPI>(worker)
      
      // Test connection
      await this.workerAPI.ping()
      console.log('Worker available')
    } catch (error) {
      console.warn('Worker unavailable, falling back to main thread')
      this.workerAPI = null
    }
  }
  
  async processData(data: any[]): Promise<any[]> {
    if (this.workerAPI) {
      try {
        return await this.workerAPI.processData(data)
      } catch (error) {
        console.warn('Worker processing failed, falling back')
        // Fall through to main thread processing
      }
    }
    
    // Fallback to main thread
    return this.processDataOnMainThread(data)
  }
  
  private processDataOnMainThread(data: any[]): any[] {
    return data.map(item => processItem(item))
  }
}
```

## Next Steps

- [Performance Optimization](./performance) - Optimize error handling performance
- [Testing Strategies](./testing) - Test error scenarios