---
title: "Core Concepts"
description: "Understanding the fundamental concepts behind Remobj"
---

# Core Concepts

This guide explains the fundamental concepts that make Remobj work. Understanding these concepts will help you use Remobj effectively and troubleshoot any issues.

## The Proxy Pattern

At its core, Remobj uses **JavaScript Proxies** to intercept method calls and transform them into cross-context messages. When you call a method on a consumed object, you're not actually calling the method locally - instead, Remobj:

1. **Intercepts** the method call using a Proxy
2. **Serializes** the method name and arguments
3. **Sends** a message to the remote context
4. **Waits** for the response
5. **Deserializes** and returns the result

```typescript
// This looks like a local call...
const result = await remoteAPI.calculatePi(1000)

// ...but it's actually doing this behind the scenes:
// 1. Proxy intercepts: calculatePi(1000)
// 2. Serialize: { method: 'calculatePi', args: [1000] }
// 3. Send message to remote context
// 4. Remote context calls the actual method
// 5. Response comes back with the result
// 6. Promise resolves with the result
```

## PostMessage Endpoints

Remobj abstracts different communication mechanisms through the **PostMessage Endpoint** pattern. An endpoint is anything that can:

- Send messages with `postMessage()`
- Receive messages via event listeners

This includes:
- Web Workers (`worker.postMessage()`)
- Windows/iframes (`window.postMessage()`)
- MessagePorts from MessageChannel API
- WebRTC DataChannels (with adapters)
- Node.js Worker Threads (with adapters)

```typescript
// All of these work the same way:
provide(api, worker)      // Web Worker
provide(api, iframe)      // Iframe window
provide(api, dataChannel) // WebRTC (with adapter)
provide(api, workerThread) // Node.js (with adapter)
```

## Bidirectional Communication

Unlike traditional client-server models, Remobj supports **bidirectional communication**. Both sides of a connection can simultaneously:

- **Provide** APIs for the other side to consume
- **Consume** APIs provided by the other side

```typescript
// Main thread
const mainAPI = {
  updateProgress: (percent: number) => {
    progressBar.style.width = `${percent}%`
  }
}

provide(mainAPI, worker)
const workerAPI = consume<WorkerAPI>(worker)

// Worker thread  
const workerAPI = {
  processData: async (data: any[]) => {
    for (let i = 0; i < data.length; i++) {
      // Process item
      await mainAPI.updateProgress((i / data.length) * 100)
    }
  }
}

provide(workerAPI, self)
const mainAPI = consume<MainAPI>(self)
```

## Serialization & Structured Clone

Remobj uses the browser's **Structured Clone Algorithm** for serialization, which means:

✅ **Supported types:**
- Primitives (string, number, boolean, null, undefined)
- Objects and arrays
- Dates, RegExp, ArrayBuffer, TypedArrays
- Maps, Sets
- Blob, File (in browsers)

❌ **Not supported:**
- Functions
- Classes (only their data properties)
- Symbols
- DOM nodes
- Promises (use async/await instead)

```typescript
// ✅ This works
const api = {
  processData: (data: { name: string, values: number[] }) => {
    return { processed: true, timestamp: new Date() }
  }
}

// ❌ This doesn't work - functions can't be serialized
const api = {
  process: (callback: () => void) => {
    callback() // Error: callback is not a function
  }
}
```

## Error Handling

Errors thrown in remote contexts are **automatically propagated** to the calling context:

```typescript
// Remote context
const api = {
  divide: (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Division by zero!')
    }
    return a / b
  }
}

// Local context
try {
  const result = await remoteAPI.divide(10, 0)
} catch (error) {
  console.error(error.message) // "Division by zero!"
}
```

The original error message and stack trace are preserved, making debugging easier.

## Async by Default

All remote method calls are **inherently asynchronous** because they involve cross-context communication. Even if the remote method is synchronous, the call returns a Promise:

```typescript
// Remote context - synchronous method
const api = {
  add: (a: number, b: number) => a + b // Synchronous
}

// Local context - always async
const result = await remoteAPI.add(2, 3) // Returns Promise<number>
```

This design ensures consistent behavior regardless of whether the remote method is sync or async.

## Type Safety

Remobj provides full TypeScript support through **generic type parameters**:

```typescript
interface CalculatorAPI {
  add(a: number, b: number): number
  divide(a: number, b: number): number
  calculatePi(digits: number): Promise<string>
}

// Type-safe consumption
const calc = consume<CalculatorAPI>(worker)

// IDE knows the exact method signatures
const sum = await calc.add(2, 3)        // number
const result = await calc.divide(10, 2)  // number  
const pi = await calc.calculatePi(100)   // string
```

The type system ensures you can only call methods that exist on the remote API, with correct argument types.

## Resource Management

Remobj automatically handles resource cleanup when contexts are destroyed:

- **Event listeners** are automatically removed
- **Message queues** are cleared
- **Pending promises** are rejected with appropriate errors

You don't need to manually clean up connections in most cases.

## Security Considerations

Remobj includes several security features:

### Input Validation
All incoming messages are validated to ensure they match the expected structure.

### Prototype Pollution Protection
Remobj prevents modification of built-in prototypes through malicious messages.

### Sandboxing
Remote contexts can only call methods explicitly provided via `provide()` - they cannot access arbitrary code.

```typescript
// Only these methods are accessible remotely
const safeAPI = {
  processData: (data) => { /* safe operation */ },
  getStatus: () => ({ status: 'ok' })
}

provide(safeAPI, worker)

// Private functions remain inaccessible
function secretFunction() {
  // This cannot be called from remote contexts
}
```

## Performance Considerations

### Message Overhead
Each method call involves serialization, network/IPC overhead, and deserialization. For high-frequency operations, consider:

- **Batching** multiple operations into single calls
- **Streaming** large datasets instead of single messages
- **Caching** results when appropriate

### Memory Usage
Remobj keeps minimal state - just the message handlers and pending promise resolution. It doesn't store copies of your data.

## Next Steps

Now that you understand the core concepts, learn how to use the main API functions:

- [Provide & Consume](./provide-consume) - Detailed guide to the main functions
- [Package Overview](./packages) - Understanding the Remobj ecosystem