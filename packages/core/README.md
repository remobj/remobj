# @remobj/core

Core package for RemObj - a modern RPC library enabling seamless remote procedure calls across different environments with provider/consumer patterns and multiplexing support.

## Installation

```bash
npm install @remobj/core
```

## Key Features

- **Provider/Consumer Pattern**: Create RPC endpoints that provide APIs and consumers that use them
- **Multiplexing Support**: Share single endpoints across multiple RPC channels  
- **DevTools Integration**: Built-in debugging and tracing capabilities
- **Cross-Platform**: Works in browsers, Node.js, and other JavaScript environments
- **Type Safety**: Full TypeScript support with type inference for remote objects

## Basic Usage

### Setting up a Provider

```typescript
import { provide, wrapPostMessageEndpoint } from '@remobj/core'

// Create an API object to provide
const api = {
  add: (a: number, b: number) => a + b,
  getData: async () => fetch('/api/data').then(r => r.json()),
  user: {
    name: 'John',
    greet: () => 'Hello!'
  }
}

// Create endpoint (example with Worker)
const worker = new Worker('./worker.js')
const endpoint = wrapPostMessageEndpoint(worker)

// Provide the API through the endpoint
provide(api, endpoint, { 
  name: 'MainAPI',
  allowWrite: false // Read-only by default
})
```

### Setting up a Consumer

```typescript
import { consume, wrapPostMessageEndpoint } from '@remobj/core'

// Create endpoint connection
const endpoint = wrapPostMessageEndpoint(self) // In worker context
const api = consume<typeof originalAPI>(endpoint, { 
  name: 'MainAPI',
  timeout: 5000 
})

// Use the remote API - all calls are automatically async
const result = await api.add(5, 3) // 8
const data = await api.getData()
const greeting = await api.user.greet() // 'Hello!'
```

### Multiplexing Endpoints

```typescript
import { createMultiplexedEndpoint, provide, consume } from '@remobj/core'

// Create multiplexed endpoint for sharing
const baseEndpoint = wrapPostMessageEndpoint(worker)
const multiplexed = createMultiplexedEndpoint(baseEndpoint)

// Provide multiple APIs on same endpoint
provide(mathAPI, multiplexed, { name: 'Math' })
provide(userAPI, multiplexed, { name: 'User' })

// Consumers automatically get routed to correct provider
const math = consume(multiplexed, { name: 'Math' })
const user = consume(multiplexed, { name: 'User' })
```

## Main Exports

### Core Functions
- `provide(data, endpoint, config)` - Provide an API through an endpoint
- `consume<T>(endpoint, config)` - Consume a remote API with type safety
- `registerPlugin(plugin)` - Register custom type serialization plugins

### Endpoint Utilities  
- `wrapPostMessageEndpoint(target)` - Wrap PostMessage-compatible objects
- `createJsonEndpoint(endpoint)` - Add JSON serialization layer
- `connectEndpoints(ep1, ep2)` - Bidirectionally connect two endpoints
- `createWebsocketEndpoint(ws)` - Create endpoint from WebSocket
- `createSendingEndpoint(target, type, name)` - Generic sending endpoint factory

### Multiplexing
- `createMultiplexedEndpoint(endpoint)` - Enable multiple RPC channels on single endpoint
- `Channel` - Type for multiplexed channels

### DevTools
- `devtools(traceId, event, id, type, name, detail, data)` - Manual devtools logging
- `getTraceID(data)` - Extract trace ID from RPC data
- `setDevtoolsEP(endpoint)` - Set devtools endpoint
- `wrapEndpointDevtools(endpoint, type, name)` - Add devtools to endpoint

### Types
- `Remote<T>` - Converts object type to async remote version
- `PostMessageEndpoint` - Standard endpoint interface  
- `ProvideConfig` - Provider configuration options
- `ConsumeConfig` - Consumer configuration options

## Advanced Configuration

### Provider Options

```typescript
provide(api, endpoint, {
  name: 'MyAPI',           // Name for debugging/multiplexing
  allowWrite: true         // Allow property assignments
})
```

### Consumer Options

```typescript
consume(endpoint, {
  name: 'MyAPI',          // Name for routing/debugging  
  timeout: 10000          // Request timeout in milliseconds
})
```

## Error Handling

```typescript
try {
  const result = await api.riskyOperation()
} catch (error) {
  // Remote errors are propagated as local errors
  console.error('Remote call failed:', error)
}
```

## Repository

Part of the [RemObj monorepo](https://github.com/remobj/remobj). For more information, examples, and documentation, visit the main repository.

## License

MIT