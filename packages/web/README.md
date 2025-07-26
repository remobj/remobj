# @remobj/web

> Web API adapters for seamless browser communication

[![npm version](https://img.shields.io/npm/v/@remobj/web.svg)](https://www.npmjs.com/package/@remobj/web)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@remobj/web.svg)](https://bundlephobia.com/package/@remobj/web)

@remobj/web provides adapters to convert browser Web APIs (WebRTC DataChannels, WebSockets) into standardized PostMessageEndpoint interfaces, enabling seamless integration with the remobj ecosystem.

## ✨ Features

- **🌐 WebRTC DataChannels**: Convert RTCDataChannel to PostMessage or Stream interfaces
- **📡 WebSocket Support**: Seamless WebSocket integration with automatic JSON serialization
- **🔄 Bidirectional Communication**: Full duplex communication through all adapters
- **🛡️ Automatic Error Handling**: Built-in connection state checking and error boundaries
- **📦 Lightweight**: Minimal overhead on top of native Web APIs
- **🎯 Type-Safe**: Full TypeScript support with intelligent type inference

## 🚀 Quick Start

### Installation

```bash
npm install @remobj/web @remobj/core
```

### WebSocket Example

```typescript
import { webSocketToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

// Client side
const ws = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(ws)
const serverAPI = consume<ServerAPI>(endpoint)

// Type-safe remote calls over WebSocket
const userData = await serverAPI.getUserData(123)
await serverAPI.updateUser(123, { name: 'Updated' })
```

### WebRTC DataChannel Example

```typescript
import { dataChannelToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

// After establishing WebRTC connection
const dataChannel = peerConnection.createDataChannel('remobj-api')
const endpoint = dataChannelToPostMessage(dataChannel)
const peerAPI = consume<PeerAPI>(endpoint)

// Direct peer-to-peer communication
await peerAPI.shareFile(fileData)
await peerAPI.syncGameState(gameState)
```

## 📖 Complete Examples

### Real-Time Chat with WebSockets

**Client:**
```typescript
import { webSocketToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

interface ChatAPI {
  sendMessage(message: string, room: string): Promise<void>
  getHistory(room: string): Promise<ChatMessage[]>
  joinRoom(room: string): Promise<void>
}

interface ClientAPI {
  onMessage(message: ChatMessage): void
  onUserJoined(user: string): void
  onUserLeft(user: string): void
}

const ws = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(ws)

// Consume server API
const chat = consume<ChatAPI>(endpoint)

// Provide client callbacks
const clientAPI: ClientAPI = {
  onMessage: (message) => displayMessage(message),
  onUserJoined: (user) => showNotification(`${user} joined`),
  onUserLeft: (user) => showNotification(`${user} left`)
}
provide(clientAPI, endpoint)

// Use the API
await chat.joinRoom('general')
await chat.sendMessage('Hello everyone!', 'general')
const history = await chat.getHistory('general')
```

**Server (Node.js with ws library):**
```typescript
import WebSocket from 'ws'
import { webSocketToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', (ws) => {
  const endpoint = webSocketToPostMessage(ws)
  const client = consume<ClientAPI>(endpoint)
  
  const chatAPI: ChatAPI = {
    async sendMessage(message, room) {
      // Broadcast to all clients in room
      broadcastToRoom(room, { type: 'message', message, user: getUser(ws) })
    },
    
    async getHistory(room) {
      return await database.getChatHistory(room)
    },
    
    async joinRoom(room) {
      addUserToRoom(ws, room)
      await client.onUserJoined(getUser(ws))
    }
  }
  
  provide(chatAPI, endpoint)
})
```

### Peer-to-Peer File Sharing with WebRTC

```typescript
import { dataChannelToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

interface FileShareAPI {
  sendFile(filename: string, data: ArrayBuffer): Promise<void>
  requestFile(filename: string): Promise<ArrayBuffer>
  listFiles(): Promise<string[]>
}

// Establish WebRTC connection (simplified)
const peerConnection = new RTCPeerConnection(configuration)
const dataChannel = peerConnection.createDataChannel('file-share', {
  ordered: true,
  maxRetransmits: 3
})

const endpoint = dataChannelToPostMessage(dataChannel)

// Peer A - File provider
const fileStore = new Map<string, ArrayBuffer>()

const providerAPI: FileShareAPI = {
  async sendFile(filename, data) {
    fileStore.set(filename, data)
    await peerAPI.onFileReceived(filename, data.byteLength)
  },
  
  async requestFile(filename) {
    const data = fileStore.get(filename)
    if (!data) throw new Error('File not found')
    return data
  },
  
  async listFiles() {
    return Array.from(fileStore.keys())
  }
}

provide(providerAPI, endpoint)

// Peer B - File consumer
const peerAPI = consume<FileShareAPI>(endpoint)

// Request files from peer
const availableFiles = await peerAPI.listFiles()
const fileData = await peerAPI.requestFile('document.pdf')
const blob = new Blob([fileData], { type: 'application/pdf' })
```

### Gaming with Low-Latency Communication

```typescript
import { dataChannelToPostMessage } from '@remobj/web'
import { consume, provide } from '@remobj/core'

interface GameAPI {
  updatePlayerPosition(x: number, y: number): void
  shootProjectile(angle: number, power: number): Promise<boolean>
  chatMessage(message: string): void
  getGameState(): Promise<GameState>
}

// Set up WebRTC with ordered, low-latency channel
const dataChannel = peerConnection.createDataChannel('game', {
  ordered: false,  // Allow packet loss for position updates
  maxRetransmits: 0  // No retransmission for real-time data
})

const endpoint = dataChannelToPostMessage(dataChannel)
const opponent = consume<GameAPI>(endpoint)

const gameAPI: GameAPI = {
  updatePlayerPosition(x, y) {
    // Update local game state immediately
    localPlayer.position = { x, y }
    renderGame()
  },
  
  async shootProjectile(angle, power) {
    const hit = calculateHit(angle, power)
    if (hit) {
      await opponent.onHit(localPlayer.id)
      return true
    }
    return false
  },
  
  chatMessage(message) {
    displayChatMessage(message, 'opponent')
  },
  
  async getGameState() {
    return getCurrentGameState()
  }
}

provide(gameAPI, endpoint)

// Game loop
setInterval(async () => {
  const { x, y } = localPlayer.position
  opponent.updatePlayerPosition(x, y)
}, 16) // 60 FPS updates
```

## 🔧 API Reference

### WebRTC DataChannel Adapters

#### `dataChannelToPostMessage(dataChannel: RTCDataChannel): PostMessageEndpoint`

Converts a WebRTC DataChannel to a PostMessage interface with automatic readyState checking.

**Features:**
- Automatic connection state management
- Error handling for closed channels
- Compatible with all remobj core functions

**Example:**
```typescript
const dataChannel = peerConnection.createDataChannel('api')
const endpoint = dataChannelToPostMessage(dataChannel)
const api = consume<MyAPI>(endpoint)
```

#### `dataChannelToStream(dataChannel: RTCDataChannel): StreamEndpoint`

Converts a WebRTC DataChannel to a bidirectional stream interface.

**Features:**
- Stream-based data flow
- Automatic backpressure handling
- Compatible with Web Streams API

**Example:**
```typescript
const dataChannel = peerConnection.createDataChannel('stream')
const stream = dataChannelToStream(dataChannel)

// Write data to peer
const writer = stream.input.getWriter()
await writer.write('Hello peer!')

// Read data from peer
const reader = stream.output.getReader()
const { value } = await reader.read()
```

### WebSocket Adapters

#### `webSocketToPostMessage(webSocket: WebSocket): PostMessageEndpoint`

Converts a WebSocket to a PostMessage interface with automatic JSON serialization.

**Features:**
- Automatic JSON serialization/deserialization
- Connection state management
- Error handling for malformed JSON
- Works with both browser and Node.js WebSockets

**Example:**
```typescript
const ws = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(ws)
const serverAPI = consume<ServerAPI>(endpoint)

await serverAPI.someMethod() // Automatically serialized as JSON
```

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebSockets | ✅ All versions | ✅ All versions | ✅ All versions | ✅ All versions |
| WebRTC DataChannels | ✅ 56+ | ✅ 22+ | ✅ 11+ | ✅ 79+ |
| Web Streams API | ✅ 89+ | ✅ 102+ | ✅ 14.1+ | ✅ 89+ |

## 🔒 Security Considerations

### WebSocket Security
- Always use `wss://` in production for encrypted connections
- Validate origin headers on the server side
- Implement proper authentication before API access

### WebRTC Security
- Use TURN servers with authentication for production
- Validate peer certificates when available
- Implement timeout handling for connection establishment

### Data Validation
- All data is automatically validated by remobj core
- Custom validation can be added at the API level
- Structured clone algorithm prevents code injection

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

- **[@remobj/core](../core)**: Core communication library and RPC functionality
- **[@remobj/stream](../stream)**: Stream utilities and WebStreams integration
- **[@remobj/node](../node)**: Node.js specific adapters for server-side communication

## 📄 License

ISC

---

Made with ❤️ by the remobj team