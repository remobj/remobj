# @remobj/devtools

DevTools server for debugging RemObj applications.

## Architecture

The devtools package provides a two-server architecture:
- **Port 3333**: WebSocket server for core connections
- **Port 3334**: WebSocket server for web client connections
- **Port 3335**: HTTP server serving the web client

Messages from the core are relayed to all connected web clients for real-time debugging.

## Usage

### Starting the DevTools Server

```bash
npx remobj-devtools
```

This will:
1. Start the core WebSocket server on port 3333
2. Start the client WebSocket server on port 3334
3. Start the web interface on http://localhost:3335

### Integrating with Core

In your RemObj application:

```typescript
import { getDevTools } from "@remobj/devtools/core-integration"

// Connect to devtools (auto-connects in development)
const devtools = getDevTools()

// Send debug messages
devtools.send({
  type: "rpc-call",
  method: "someMethod",
  args: [1, 2, 3],
  realmId: "realm-123",
  channelId: "channel-456"
})
```

### Web Client Features

The web client provides:
- Real-time message logging
- Filtering by message type (RPC calls, Multiplex, Errors)
- Search functionality
- Export logs as JSON
- Auto-reconnection

## Message Types

- `connection`: Connection status updates
- `rpc-call`: RPC method calls
- `rpc-result`: RPC call results
- `rpc-error`: RPC errors
- `multiplex`: Multiplex channel operations

## Development

```bash
# Build the package
npm run build devtools

# Run tests
npm test packages/devtools
```