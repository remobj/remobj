# Getting Started

RemObj is a powerful library for transparent remote procedure calls (RPC) in JavaScript. It allows you to call functions across different execution contexts (Web Workers, iframes, Node.js processes) as if they were local functions, with full TypeScript support.

## Installation

::: code-group

```bash [npm]
npm install @remobj/core
```

```bash [pnpm]
pnpm add @remobj/core
```

```bash [yarn]
yarn add @remobj/core
```

:::

For specific environments, install the appropriate packages:

```bash
# For web applications (Web Workers, iframes, etc.)
npm install @remobj/core @remobj/web

# For Node.js applications (child processes, worker threads)
npm install @remobj/core @remobj/node
```

## Basic Concepts

RemObj works with two main concepts:

### Provider
The **provider** exposes an object or API that can be accessed remotely. It listens for incoming requests and executes the corresponding functions.

### Consumer
The **consumer** creates a proxy object that forwards all operations to the remote provider. It looks and feels like a regular JavaScript object but executes remotely.

## Your First RemObj Application

Let's create a simple example using Web Workers:

### Step 1: Create the Worker (Provider)

Create a file `worker.js`:

```javascript
// worker.js
import { provide } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'

// Define your API
const mathAPI = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b,
  fibonacci: (n) => {
    if (n <= 1) return n
    return mathAPI.fibonacci(n - 1) + mathAPI.fibonacci(n - 2)
  },
  asyncCalculation: async (value) => {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1000))
    return value * 2
  }
}

// Expose the API
const endpoint = createWebWorkerEndpoint(self)
provide(mathAPI, endpoint)
```

### Step 2: Use the Worker (Consumer)

In your main application:

```javascript
// main.js
import { consume } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'

// Create the worker
const worker = new Worker('./worker.js', { type: 'module' })
const endpoint = createWebWorkerEndpoint(worker)

// Create the remote API proxy
const math = consume(endpoint)

// Use it like a regular object!
async function runCalculations() {
  console.log(await math.add(5, 3))              // 8
  console.log(await math.multiply(4, 7))         // 28
  console.log(await math.fibonacci(10))          // 55
  console.log(await math.asyncCalculation(21))   // 42 (after 1 second)
}

runCalculations()
```

## TypeScript Support

One of RemObj's key features is full TypeScript support across boundaries:

```typescript
// types.ts - Shared types
export interface MathAPI {
  add: (a: number, b: number) => number
  multiply: (a: number, b: number) => number
  fibonacci: (n: number) => number
  asyncCalculation: (value: number) => Promise<number>
}
```

```typescript
// worker.ts
import { provide } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'
import type { MathAPI } from './types'

const mathAPI: MathAPI = {
  // Implementation...
}

provide(mathAPI, createWebWorkerEndpoint(self))
```

```typescript
// main.ts
import { consume } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'
import type { MathAPI } from './types'

const worker = new Worker('./worker.js', { type: 'module' })
const math = consume<MathAPI>(createWebWorkerEndpoint(worker))

// Full type safety and IntelliSense!
const result = await math.add(5, 3) // TypeScript knows this returns Promise<number>
```

## Next Steps

- Learn about [different transport types](./transports)
- Understand [advanced patterns](./advanced)
- Explore [error handling](./error-handling)
- Set up [DevTools integration](./devtools)

## Common Use Cases

### Offloading Heavy Computations

```typescript
// worker.ts
const computeAPI = {
  processLargeDataset: async (data: number[]) => {
    // CPU-intensive operation
    return data.map(x => Math.sqrt(x)).reduce((a, b) => a + b)
  }
}

provide(computeAPI, endpoint)
```

### Sandboxed Execution

```typescript
// iframe-sandbox.ts
const sandboxAPI = {
  executeUserCode: (code: string) => {
    // Safely execute user code in an iframe
    return new Function(code)()
  }
}

provide(sandboxAPI, endpoint)
```

### Microservice Communication

```typescript
// service.ts
const userService = {
  getUser: async (id: string) => {
    return await database.users.findById(id)
  },
  updateUser: async (id: string, data: UserUpdate) => {
    return await database.users.update(id, data)
  }
}

provide(userService, endpoint)
```