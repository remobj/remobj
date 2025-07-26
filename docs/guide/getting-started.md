---
title: Getting Started
description: Quick start guide for installing and using Remobj
---

# Getting Started

This guide will help you install Remobj and create your first cross-context communication setup.

## Installation

Install the core Remobj package using your preferred package manager:

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

For specific use cases, you might also want additional packages:

```bash
# For WebRTC and WebSocket adapters
npm install @remobj/web

# For Node.js Worker Threads and Child Processes
npm install @remobj/node

# For streaming data utilities
npm install @remobj/stream
```

## Your First Example

Let's create a simple calculator that runs in a Web Worker:

### 1. Create the Main Thread Code

```typescript
// main.ts
import { consume } from '@remobj/core'

// Define the interface for type safety
interface Calculator {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
  divide(a: number, b: number): number
}

async function main() {
  // Create a worker and consume its API
  const worker = new Worker('./worker.ts', { type: 'module' })
  const calc = consume<Calculator>(worker)
  
  try {
    // Use the calculator as if it were local
    console.log('5 + 3 =', await calc.add(5, 3))           // 8
    console.log('4 * 6 =', await calc.multiply(4, 6))      // 24
    console.log('15 / 3 =', await calc.divide(15, 3))      // 5
  } catch (error) {
    console.error('Calculation failed:', error)
  }
}

main()
```

### 2. Create the Worker Code

```typescript
// worker.ts
import { provide } from '@remobj/core'

// Implement the calculator
const calculator = {
  add: (a: number, b: number): number => {
    console.log(`Worker: calculating ${a} + ${b}`)
    return a + b
  },
  
  multiply: (a: number, b: number): number => {
    console.log(`Worker: calculating ${a} * ${b}`)
    return a * b
  },
  
  divide: (a: number, b: number): number => {
    console.log(`Worker: calculating ${a} / ${b}`)
    if (b === 0) throw new Error('Division by zero!')
    return a / b
  }
}

// Expose the calculator to the main thread
provide(calculator, self)
```

### 3. Build and Run

If you're using Vite, create a simple `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Remobj Calculator</title>
</head>
<body>
  <h1>Remobj Calculator Example</h1>
  <p>Check the browser console for results!</p>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

Then run:

```bash
npx vite
```

Open your browser and check the console - you'll see the calculations being performed in the worker!

## Key Concepts

### Provide and Consume

The core of Remobj is built around two functions:

- **`provide(object, endpoint)`** - Exposes an object's methods to be called remotely
- **`consume<T>(endpoint)`** - Creates a proxy that lets you call remote methods

### Endpoints

An "endpoint" is any object that supports the PostMessage protocol:

- Web Workers (`Worker` instances)
- Service Workers
- Iframes (`contentWindow`)
- WebRTC Data Channels (with [@remobj/web](/api/web/))
- Node.js Worker Threads (with [@remobj/node](/api/node/))

### Type Safety

Remobj provides full TypeScript support. Define interfaces for your remote objects:

```typescript
interface MyAPI {
  getString(): Promise<string>
  getNumber(input: number): Promise<number>
  getObject(): Promise<{ key: string }>
}

const api = consume<MyAPI>(worker)
// TypeScript knows all available methods and their signatures!
```

## Error Handling

Remote method calls can fail, so always handle errors:

```typescript
try {
  const result = await api.riskyMethod()
  console.log(result)
} catch (error) {
  console.error('Remote call failed:', error.message)
}
```

## Debugging

Enable logging to see what's happening under the hood:

```typescript
import { withLogging } from '@remobj/core'

const worker = new Worker('./worker.ts', { type: 'module' })
const loggedWorker = withLogging(worker, {
  prefix: '[Worker]',
  logIncoming: true,
  logOutgoing: true
})

const api = consume(loggedWorker)
```

## Advanced Examples

### Iframe Communication

```typescript
// Parent window
const iframe = document.querySelector('iframe')
const childAPI = consume<ChildAPI>(iframe.contentWindow)

await childAPI.doSomething()
```

```typescript
// Child iframe
const parentAPI = consume<ParentAPI>(window.parent)
provide(childImplementation, window)
```

### Bidirectional Communication

Both sides can provide and consume:

```typescript
// Main thread
provide(mainAPI, worker)
const workerAPI = consume<WorkerAPI>(worker)

// Worker
provide(workerAPI, self)
const mainAPI = consume<MainAPI>(self)
```

## Next Steps

Now that you understand the basics, explore these topics:

- [Core Concepts](/guide/core-concepts) - Deeper understanding of how Remobj works
- [Provide & Consume](/guide/provide-consume) - Detailed API documentation
- [Working with Workers](/guide/workers) - Advanced Web Worker patterns
- [Examples](/examples/) - More practical examples

## Common Issues

### "Worker constructor not found"

Make sure you're bundling workers correctly. With Vite:

```typescript
const worker = new Worker('./worker.ts', { type: 'module' })
```

### "Method not found" errors

Ensure the method is actually exposed in your `provide()` call:

```typescript
// ❌ Wrong - only exposes the function, not as a method
provide(myFunction, worker)

// ✅ Correct - exposes an object with methods
provide({ myFunction }, worker)
```

### TypeScript types not working

Make sure you're using the same interface on both sides:

```typescript
// shared/types.ts
export interface MyAPI {
  method(): string
}

// Use the same interface in both main and worker
```

Ready to dive deeper? Continue with [Core Concepts](/guide/core-concepts) to understand how Remobj works under the hood.