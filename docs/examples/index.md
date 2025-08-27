# Examples

This section contains practical examples of using RemObj in various scenarios. Each example includes complete, working code that you can use as a starting point for your own applications.

## Web Examples

### [Web Worker Example](./web-worker)
Learn how to offload CPU-intensive tasks to Web Workers while maintaining type safety.

## Framework Integration

### Framework Integration Examples
Coming soon: React, Vue, and Angular integration examples.

## Node.js Examples

### Node.js Examples
Coming soon: Worker threads and child process examples.

## Running the Examples

All examples are available in the [GitHub repository](https://github.com/remobj/remobj/tree/main/examples). To run them locally:

```bash
# Clone the repository
git clone https://github.com/remobj/remobj.git
cd remobj/examples

# Install dependencies
npm install

# Run a specific example
npm run example:web-worker
npm run example:websocket
npm run example:react
```

## Common Patterns

### Error Handling

```typescript
const remote = consume<API>(endpoint, {
  timeout: 5000, // 5 second timeout
  onError: (error) => {
    console.error('RPC error:', error)
    // Handle or recover from errors
  }
})

try {
  const result = await remote.someMethod()
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'DISCONNECTED') {
    // Handle disconnection
  }
}
```

### Cleanup

```typescript
// Provider cleanup
const cleanup = provide(api, endpoint)
// Later...
cleanup() // Stop providing the API

// Consumer cleanup
const remote = consume(endpoint)
// The proxy will be garbage collected automatically
// Or manually disconnect:
remote[Symbol.dispose]?.()
```

### Type Safety

```typescript
// shared-types.ts
export interface UserAPI {
  getUser: (id: string) => Promise<User>
  updateUser: (id: string, data: Partial<User>) => Promise<User>
  deleteUser: (id: string) => Promise<void>
}

// provider.ts
import type { UserAPI } from './shared-types'
const api: UserAPI = { /* implementation */ }
provide(api, endpoint)

// consumer.ts
import type { UserAPI } from './shared-types'
const users = consume<UserAPI>(endpoint)
// Full type safety and autocomplete!
```

## Need Help?

- Check the [Guide](/guide/) for conceptual understanding
- Browse the [API Reference](/api/) for detailed documentation
- Open an [issue on GitHub](https://github.com/remobj/remobj/issues) for bugs or questions
- Join the [discussions](https://github.com/remobj/remobj/discussions) for community support