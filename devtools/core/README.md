# @remobj/dev-core

> Reactive development tools for @remobj/core monitoring and debugging

[![npm version](https://img.shields.io/npm/v/@remobj/dev-core.svg)](https://www.npmjs.com/package/@remobj/dev-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@remobj/dev-core.svg)](https://bundlephobia.com/package/@remobj/dev-core)

@remobj/dev-core provides reactive monitoring for @remobj/core communication. It captures all endpoint traffic and stores it in Vue reactive objects, enabling real-time debugging and network analysis.

## ✨ Features

- **📊 Real-time Monitoring**: Track all PostMessage communication in real-time
- **🔍 Network Discovery**: Automatic detection of endpoint connections
- **💾 Complete Data Storage**: Captures all raw data flowing through endpoints
- **⚡ Vue Reactivity**: Powered by @vue/reactivity for instant UI updates
- **🪶 Ultra Lightweight**: Just 0.87 kB (0.43 kB gzipped)
- **🎯 Type-Safe**: Full TypeScript support with proper interfaces

## 🚀 Quick Start

### Installation

```bash
npm install @remobj/dev-core
```

### Basic Usage

```typescript
import { createMonitor } from '@remobj/dev-core'
import { setMonitorEndpoint } from '@remobj/core'

// Create a monitor endpoint (e.g., BroadcastChannel for devtools)
const devtoolsChannel = new BroadcastChannel('remobj-devtools')

// Set up monitoring
setMonitorEndpoint(devtoolsChannel)

// Create reactive monitor
const monitor = createMonitor(devtoolsChannel)

// Access reactive data
console.log(monitor.connections.value)  // Connection[] - discovered endpoints
console.log(monitor.messages.value)     // Message[] - EP_EVENT_send/receive
console.log(monitor.data.value)         // DataEntry[] - all raw data

// Monitor updates automatically via Vue reactivity
monitor.connections.value.forEach(conn => {
  console.log(`Connection: ${conn.from} → ${conn.to}`)
})
```

## 📖 API Reference

### `createMonitor(endpoint: PostMessageEndpoint)`

Creates a reactive monitor that tracks all communication through the provided endpoint.

**Parameters:**
- `endpoint` - PostMessageEndpoint to monitor (e.g., BroadcastChannel, MessagePort)

**Returns:**
```typescript
{
  connections: Ref<Connection[]>  // Discovered endpoint connections
  messages: Ref<Message[]>        // EP_EVENT_send/receive messages  
  data: Ref<DataEntry[]>          // All raw data entries
  discover: () => void            // Trigger network discovery
  clear: () => void               // Clear all stored data
}
```

### Data Types

#### `Connection`
Represents a discovered endpoint connection:
```typescript
interface Connection {
  from: string      // Sender endpoint ID
  to: string        // Receiver endpoint ID  
  timestamp: number // When connection was discovered
}
```

#### `Message`
Represents a tracked EP_EVENT message:
```typescript
interface Message {
  id: string                               // Endpoint ID
  type: 'EP_EVENT_send' | 'EP_EVENT_receive' // Message direction
  timestamp: number                        // When message occurred
  message: any                            // The actual message content
}
```

#### `DataEntry`
Represents any raw data captured:
```typescript
interface DataEntry {
  timestamp: number     // When data was captured
  [key: string]: any   // All data from the message
}
```

## 🔧 Integration with DevTools

### Browser Extension Example

```typescript
// devtools-panel.ts
import { createMonitor } from '@remobj/dev-core'
import { ref, watch } from '@vue/reactivity'

const devtoolsChannel = new BroadcastChannel('remobj-devtools')
const monitor = createMonitor(devtoolsChannel)

// React to new connections
watch(monitor.connections, (connections) => {
  updateNetworkGraph(connections)
}, { deep: true })

// React to new messages
watch(monitor.messages, (messages) => {
  updateMessageLog(messages)
}, { deep: true })

// Trigger discovery when panel opens
monitor.discover()
```

### Vue Component Example

```vue
<template>
  <div>
    <h3>Endpoints ({{ connections.length }})</h3>
    <ul>
      <li v-for="conn in connections" :key="`${conn.from}-${conn.to}`">
        {{ conn.from }} → {{ conn.to }}
        <small>({{ new Date(conn.timestamp).toLocaleString() }})</small>
      </li>
    </ul>

    <h3>Messages ({{ messages.length }})</h3>
    <ul>
      <li v-for="msg in messages" :key="`${msg.id}-${msg.timestamp}`">
        <strong>{{ msg.type }}</strong> from {{ msg.id }}
        <pre>{{ JSON.stringify(msg.message, null, 2) }}</pre>
      </li>
    </ul>

    <button @click="monitor.discover()">Discover Network</button>
    <button @click="monitor.clear()">Clear Data</button>
  </div>
</template>

<script setup>
import { createMonitor } from '@remobj/dev-core'

const devtoolsChannel = new BroadcastChannel('remobj-devtools')
const monitor = createMonitor(devtoolsChannel)

const { connections, messages } = monitor
</script>
```

## 🎯 Real-World Usage

### Network Visualization

```typescript
import { createMonitor } from '@remobj/dev-core'
import { computed } from '@vue/reactivity'

const monitor = createMonitor(devtoolsChannel)

// Computed network graph
const networkGraph = computed(() => {
  const nodes = new Set()
  const edges = []
  
  monitor.connections.value.forEach(conn => {
    nodes.add(conn.from)
    nodes.add(conn.to)
    edges.push({ source: conn.from, target: conn.to })
  })
  
  return {
    nodes: Array.from(nodes).map(id => ({ id })),
    edges
  }
})

// Use with D3.js, vis.js, etc.
updateVisualization(networkGraph.value)
```

### Message Statistics

```typescript
const messageStats = computed(() => {
  const stats = { send: 0, receive: 0, byEndpoint: {} }
  
  monitor.messages.value.forEach(msg => {
    stats[msg.type === 'EP_EVENT_send' ? 'send' : 'receive']++
    stats.byEndpoint[msg.id] = (stats.byEndpoint[msg.id] || 0) + 1
  })
  
  return stats
})
```

## 🔍 Protocol Support

@remobj/dev-core automatically captures and categorizes different types of messages:

### Discovery Messages
- `EP_DETECTION_REQUEST` - Network discovery requests
- Detection responses with endpoint metadata

### Communication Messages  
- `EP_EVENT_send` - Outbound messages from endpoints
- `EP_EVENT_receive` - Inbound messages to endpoints

### Raw Data
- All message data is preserved in `data` array
- Includes timestamps for temporal analysis
- Supports any custom message types

## 🏗️ Architecture

@remobj/dev-core acts as the "other side" of the monitor endpoints created by @remobj/core:

```
Application Endpoints → Monitor Proxy → DevTools Channel → @remobj/dev-core
                     ↗                                   ↘
                @remobj/core                          Vue Reactive Store
```

1. **@remobj/core** creates proxy endpoints that forward events
2. **Monitor endpoint** (e.g., BroadcastChannel) receives all events  
3. **@remobj/dev-core** consumes events and stores in reactive objects
4. **DevTools UI** reacts to data changes automatically

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run coverage

# Development mode
npm run dev
```

## 📦 Related Packages

- **[@remobj/core](../core)**: Core communication library
- **@remobj/devtools-extension**: Browser extension for visual debugging (planned)

## 📄 License

ISC

---

Made with ❤️ by the remobj team