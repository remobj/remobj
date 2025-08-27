---
layout: home

hero:
  name: RemObj
  text: Remote Objects Made Simple
  tagline: Transparent RPC communication for JavaScript with full TypeScript support
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/remobj/remobj

features:
  - icon: 🚀
    title: Zero Configuration
    details: Works out of the box with Web Workers, WebSockets, Node.js child processes and more. No complex setup required.
  
  - icon: 🔄
    title: Transparent RPC
    details: Call remote functions as if they were local. Full async/await support with automatic serialization.
  
  - icon: 📦
    title: Tiny Bundle Size
    details: Core package is only ~6KB gzipped. Tree-shakeable and optimized for production.
  
  - icon: 🎯
    title: Full TypeScript Support
    details: Complete type safety across the wire. Your remote APIs are fully typed with IntelliSense support.
  
  - icon: 🔌
    title: Multiple Transports
    details: Support for WebWorkers, WebSockets, MessagePort, Node.js child processes, and custom endpoints.
  
  - icon: 🛠️
    title: DevTools Integration
    details: Built-in DevTools for monitoring, debugging, and analyzing RPC communication in real-time.
---

## Quick Example

```typescript
// Provider side - expose your API
import { provide } from '@remobj/core'

const api = {
  greet: (name: string) => `Hello, ${name}!`,
  calculate: async (a: number, b: number) => {
    // Complex calculations can run in a worker
    return a + b
  }
}

provide(api, endpoint)
```

```typescript
// Consumer side - use the remote API
import { consume } from '@remobj/core'

const remote = consume<typeof api>(endpoint)

// Call remote functions with full type safety
const greeting = await remote.greet('World')
const result = await remote.calculate(5, 3)
```

## Why RemObj?

Traditional RPC libraries often require complex setup, protocol definitions, or lose type safety across boundaries. RemObj changes this by providing:

- **Simple API**: Just two functions - `provide()` and `consume()`
- **Type Safety**: Full TypeScript support with type inference
- **Performance**: Minimal overhead with efficient serialization
- **Flexibility**: Works with any message-passing interface
- **Memory Efficient**: Automatic garbage collection of remote references

## Use Cases

<div class="use-cases">

### Web Workers
Offload CPU-intensive tasks without blocking the main thread

### Microservices
Build distributed systems with type-safe communication

### Electron Apps
Secure IPC between main and renderer processes

### Browser Extensions
Communication between content scripts and background workers

</div>

## Ready to Get Started?

<div class="tip custom-block" style="padding-top: 8px">

Just want to try it out? Skip to the [Quickstart](./guide/).

</div>

<style>
.use-cases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.use-cases h3 {
  margin-top: 0;
  font-size: 1.1rem;
}
</style>