---
layout: home

hero:
  name: Remobj
  text: Zero-dependency TypeScript library
  tagline: Seamless cross-context communication between Web Workers, iframes, ServiceWorkers, WebRTC, and more
  image:
    src: /logo.svg
    alt: Remobj Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/remobj/remobj

features:
  - icon: 🎯
    title: Simple API
    details: Just provide() and consume() - communication feels like local function calls
  - icon: 🚀
    title: Zero Dependencies
    details: Pure browser APIs, only 2.7kb gzipped with no external dependencies
  - icon: 🔒
    title: Type-Safe
    details: Complete TypeScript support with automatic type inference
  - icon: 🌐
    title: Universal
    details: Works with any PostMessage-compatible API across all JavaScript environments
  - icon: 🛡️
    title: Secure
    details: Built-in validation and protection against common security issues
  - icon: ⚡
    title: Fast
    details: Minimal overhead with optimized performance for real-world applications
---

## Quick Example

:::code-group

```typescript [main.ts]
import { consume } from '@remobj/core'

const worker = new Worker('./worker.js')
const calc = consume<Calculator>(worker)

// Call remote functions as if they were local
const result = await calc.add(5, 3) // 8
const product = await calc.multiply(4, 2) // 8
```

```typescript [worker.ts]
import { provide } from '@remobj/core'

interface Calculator {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
}

const calculator: Calculator = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b
}

// Expose the calculator to the main thread
provide(calculator, self)
```

:::

## Ecosystem Overview

Remobj consists of several packages that work together to provide comprehensive cross-context communication:

- **[@remobj/core](/api/core/)** - Core TypeScript library with provide/consume API
- **[@remobj/web](/api/web/)** - Web API adapters (WebRTC, WebSocket, BroadcastChannel)
- **[@remobj/node](/api/node/)** - Node.js adapters (Worker Threads, Child Processes, TCP)
- **[@remobj/stream](/api/stream/)** - Stream utilities for data flow management

## Why Remobj?

Traditional message passing between contexts is verbose and error-prone:

```javascript
// Traditional way - lots of boilerplate
worker.postMessage({ type: 'ADD', args: [5, 3] })
worker.onmessage = (e) => {
  if (e.data.type === 'ADD_RESULT') {
    console.log(e.data.result) // 8
  }
}
```

Remobj makes it simple and type-safe:

```typescript
// Remobj way - clean and type-safe
const result = await calc.add(5, 3) // 8
```

## Community

- [GitHub Discussions](https://github.com/remobj/remobj/discussions) - Ask questions and share ideas
- [Issues](https://github.com/remobj/remobj/issues) - Report bugs and request features
- [Discord](https://discord.gg/remobj) - Chat with the community

## License

MIT License - feel free to use Remobj in your projects!