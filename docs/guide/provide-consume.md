---
title: "Provide & Consume"
description: "Complete guide to Remobj's main API functions"
---

# Provide & Consume

The heart of Remobj consists of two simple but powerful functions: `provide()` and `consume()`. This guide covers everything you need to know about using these functions effectively.

## The `provide()` Function

The `provide()` function exposes an object's methods to remote contexts, making them callable across communication boundaries.

### Basic Syntax

```typescript
provide(api: object, endpoint: PostMessageEndpoint): void
```

### Simple Example

```typescript
import { provide } from '@remobj/core'

// Define your API object
const calculatorAPI = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => {
    if (b === 0) throw new Error('Division by zero')
    return a / b
  }
}

// Provide it to a Web Worker
const worker = new Worker('./worker.js')
provide(calculatorAPI, worker)
```

### What Gets Provided

Only **enumerable properties** that are **functions** are made available remotely:

```typescript
const api = {
  // ✅ Available remotely
  publicMethod: () => 'hello',
  
  // ✅ Available remotely  
  asyncMethod: async () => 'world',
  
  // ❌ Not available (not a function)
  someData: 'value',
  
  // ❌ Not available (not enumerable)
  [Symbol('private')]: () => 'secret'
}

provide(api, endpoint)
```

### Class Instances

You can provide class instances, but only their methods (not properties) will be available:

```typescript
class Calculator {
  private precision = 2
  
  // ✅ Available remotely
  add(a: number, b: number): number {
    return Number((a + b).toFixed(this.precision))
  }
  
  // ✅ Available remotely
  setPrecision(digits: number): void {
    this.precision = digits
  }
  
  // ❌ Not available (property, not method)
  getPrecision(): number {
    return this.precision
  }
}

const calc = new Calculator()
provide(calc, worker)
```

## The `consume()` Function

The `consume()` function creates a proxy object that allows you to call remote methods as if they were local.

### Basic Syntax

```typescript
consume<T>(endpoint: PostMessageEndpoint): T
```

The generic type `T` should match the interface of the remote API.

### Simple Example

```typescript
import { consume } from '@remobj/core'

// Define the expected remote API interface
interface CalculatorAPI {
  add(a: number, b: number): number
  subtract(a: number, b: number): number
  multiply(a: number, b: number): number
  divide(a: number, b: number): number
}

// Consume the remote API
const calc = consume<CalculatorAPI>(worker)

// Use it like a local object (but async!)
const result = await calc.add(5, 3) // 8
```

### Type Safety

TypeScript provides full IntelliSense and type checking:

```typescript
// ✅ Type-safe calls
const sum = await calc.add(1, 2)        // number
const diff = await calc.subtract(5, 3)  // number

// ❌ TypeScript errors
const result = await calc.nonExistent()  // Error: Property 'nonExistent' does not exist
const bad = await calc.add('a', 'b')     // Error: Argument of type 'string' is not assignable to 'number'
```

## Bidirectional Communication

Both sides can simultaneously provide and consume APIs:

### Main Thread

```typescript
// API for worker to call
const mainAPI = {
  updateProgress: (percent: number) => {
    document.getElementById('progress')!.style.width = `${percent}%`
  },
  
  showNotification: (message: string) => {
    alert(message)
  }
}

// Provide API to worker
provide(mainAPI, worker)

// Consume worker's API
interface WorkerAPI {
  processLargeDataset(data: any[]): Promise<any[]>
  cancelProcessing(): void
}

const workerAPI = consume<WorkerAPI>(worker)

// Use both directions
const processedData = await workerAPI.processLargeDataset(data)
```

### Worker Thread

```typescript
// API for main thread to call
const workerAPI = {
  processLargeDataset: async (data: any[]): Promise<any[]> => {
    const results = []
    
    for (let i = 0; i < data.length; i++) {
      // Process each item
      const processed = await processItem(data[i])
      results.push(processed)
      
      // Update progress in main thread
      const percent = ((i + 1) / data.length) * 100
      await mainAPI.updateProgress(percent)
    }
    
    await mainAPI.showNotification('Processing complete!')
    return results
  },
  
  cancelProcessing: () => {
    // Cancellation logic
  }
}

// Provide API to main thread
provide(workerAPI, self)

// Consume main thread's API
interface MainAPI {
  updateProgress(percent: number): void
  showNotification(message: string): void
}

const mainAPI = consume<MainAPI>(self)
```

## Async Methods

Both synchronous and asynchronous methods work seamlessly:

### Remote Side (Provider)

```typescript
const api = {
  // Synchronous method
  getTimestamp: () => Date.now(),
  
  // Asynchronous method
  fetchData: async (url: string) => {
    const response = await fetch(url)
    return response.json()
  },
  
  // Method returning Promise
  delayedResponse: (ms: number) => {
    return new Promise(resolve => {
      setTimeout(() => resolve('Done!'), ms)
    })
  }
}

provide(api, endpoint)
```

### Local Side (Consumer)

```typescript
interface API {
  getTimestamp(): number
  fetchData(url: string): Promise<any>
  delayedResponse(ms: number): Promise<string>
}

const remote = consume<API>(endpoint)

// All calls are async, regardless of remote implementation
const timestamp = await remote.getTimestamp()     // Even sync methods return Promise
const data = await remote.fetchData('/api/data')  // Async method
const result = await remote.delayedResponse(1000) // Promise-returning method
```

## Error Handling

Errors thrown in remote contexts are properly propagated:

### Remote Side

```typescript
const api = {
  divide: (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Cannot divide by zero')
    }
    return a / b
  },
  
  asyncError: async () => {
    throw new Error('Something went wrong')
  }
}

provide(api, endpoint)
```

### Local Side

```typescript
const remote = consume<typeof api>(endpoint)

try {
  const result = await remote.divide(10, 0)
} catch (error) {
  console.error(error.message) // "Cannot divide by zero"
  console.error(error.stack)   // Original stack trace preserved
}

try {
  await remote.asyncError()
} catch (error) {
  console.error(error.message) // "Something went wrong"
}
```

## Advanced Usage

### Conditional API Exposure

You can dynamically control which methods are available:

```typescript
const createAPI = (userRole: 'admin' | 'user') => {
  const baseAPI = {
    getData: () => fetchUserData(),
    updateProfile: (data: any) => updateUserProfile(data)
  }
  
  if (userRole === 'admin') {
    return {
      ...baseAPI,
      deleteUser: (id: string) => removeUser(id),
      getSystemStats: () => getAdminStats()
    }
  }
  
  return baseAPI
}

const api = createAPI(currentUserRole)
provide(api, worker)
```

### Multiple API Objects

You can provide multiple APIs by composing them:

```typescript
const databaseAPI = {
  findUser: (id: string) => db.users.findById(id),
  saveUser: (user: User) => db.users.save(user)
}

const authAPI = {
  login: (credentials: LoginData) => authenticate(credentials),
  logout: () => clearSession()
}

const compositeAPI = {
  ...databaseAPI,
  ...authAPI,
  // Additional methods
  getServerTime: () => new Date().toISOString()
}

provide(compositeAPI, worker)
```

### API Versioning

Handle API evolution gracefully:

```typescript
interface APIv1 {
  getData(): any[]
}

interface APIv2 extends APIv1 {
  getDataPaginated(page: number, size: number): { data: any[], total: number }
}

// Provide backward compatibility
const api: APIv2 = {
  getData: () => getAllData(),
  getDataPaginated: (page, size) => getPaginatedData(page, size)
}

provide(api, worker)

// Consumer can use either version
const remote = consume<APIv1 | APIv2>(worker)
```

## Best Practices

### 1. Define Clear Interfaces

Always define TypeScript interfaces for your APIs:

```typescript
// ✅ Good - clear interface
interface UserService {
  createUser(userData: UserCreateRequest): Promise<User>
  updateUser(id: string, updates: UserUpdateRequest): Promise<User>
  deleteUser(id: string): Promise<void>
  findUser(id: string): Promise<User | null>
}

// ❌ Avoid - no type safety
const userService = consume<any>(worker)
```

### 2. Handle Errors Appropriately

Provide meaningful error messages:

```typescript
const api = {
  processFile: async (file: File) => {
    if (!file) {
      throw new Error('File is required')
    }
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE} bytes`)
    }
    
    try {
      return await processFileContent(file)
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`)
    }
  }
}
```

### 3. Use Appropriate Data Types

Stick to serializable types:

```typescript
// ✅ Good - all serializable
interface DataAPI {
  processItems(items: Item[]): Promise<ProcessedItem[]>
  getTimestamp(): Promise<number>
  getConfig(): Promise<{ [key: string]: any }>
}

// ❌ Avoid - functions can't be serialized
interface BadAPI {
  processWithCallback(data: any, callback: (result: any) => void): void
  getDOMElement(): HTMLElement
}
```

### 4. Consider Performance

For high-frequency operations, batch calls:

```typescript
// ✅ Better - batch operation
const api = {
  processItemsBatch: (items: Item[]) => items.map(processItem)
}

// ❌ Less efficient - individual calls
const api = {
  processItem: (item: Item) => processItem(item)
}

// Usage
const results = await remote.processItemsBatch(items) // One call
// vs
const results = await Promise.all(items.map(item => remote.processItem(item))) // Multiple calls
```

## Next Steps

Now that you understand `provide()` and `consume()`, explore:

- [Package Overview](./packages) - Learn about the Remobj ecosystem
- [Workers Guide](./workers) - Specific patterns for Web Workers
- [API Reference](/api/core/) - Complete API documentation