# remobj

> Zero-dependency TypeScript library ecosystem for seamless cross-context communication

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Rush](https://img.shields.io/badge/Rush-Monorepo-green.svg)](https://rushjs.io/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

remobj (Remote Object) enables type-safe communication between Web Workers, iframes, ServiceWorkers, WebRTC DataChannels, and other JavaScript execution contexts. Make remote function calls feel like local ones, complete with TypeScript intellisense and error handling.

## ✨ Key Features

- **🎯 Type-Safe RPC**: Full TypeScript support with intelligent autocomplete
- **🔧 Zero Dependencies**: Pure browser APIs, minimal bundle size
- **🌐 Universal Compatibility**: Works with Workers, MessagePorts, WebRTC, WebSockets
- **🛡️ Security First**: Built-in validation and prototype pollution protection
- **📦 Modular Design**: Import only what you need for optimal bundle size
- **🔄 Automatic Cleanup**: Memory management via FinalizationRegistry

## 🚀 Quick Start

### Installation

```bash
npm install @remobj/core
```

### Basic Example

**Worker (Provider):**
```typescript
// worker.ts
import { provide } from '@remobj/core'

interface MathAPI {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
}

const mathAPI: MathAPI = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b
}

provide(mathAPI, self)
```

**Main Thread (Consumer):**
```typescript
// main.ts
import { consume } from '@remobj/core'

const worker = new Worker('./worker.js')
const math = consume<MathAPI>(worker) // Full type safety!

// IDE provides autocomplete and type checking
const sum = await math.add(5, 3)         // ✅ Type: number (8)
const product = await math.multiply(4, 7) // ✅ Type: number (28)
await math.add("5", "3")                 // ❌ TypeScript error!
```

## 📦 Packages

This monorepo contains several packages that work together to provide a complete cross-context communication solution:

### Core Packages

#### [@remobj/core](./packages/core) 
[![npm](https://img.shields.io/npm/v/@remobj/core.svg)](https://www.npmjs.com/package/@remobj/core)

The foundational library providing type-safe RPC communication via PostMessage APIs.

**Features:**
- `provide()` and `consume()` functions for RPC
- PostMessageEndpoint interfaces
- Channel creation and endpoint connection utilities
- Built-in devtools monitoring hooks

**Use cases:**
- Web Worker communication
- iframe cross-origin messaging
- ServiceWorker background processing

#### [@remobj/dev-core](./devtools/core)
[![npm](https://img.shields.io/npm/v/@remobj/dev-core.svg)](https://www.npmjs.com/package/@remobj/dev-core)

Reactive development tools for monitoring and debugging @remobj/core communication.

**Features:**
- Real-time message monitoring via Vue reactivity
- Network discovery and endpoint tracking
- Complete data capture for debugging
- Ultra-lightweight (< 1kB bundle)

**Use cases:**
- Browser devtools extensions
- Development debugging dashboards
- Communication analysis and optimization

### Extended Packages (In Development)

#### @remobj/stream
Stream-based communication utilities for bidirectional data flow.

#### @remobj/web  
Web API adapters for WebRTC DataChannels and WebSockets.

#### @remobj/node
Node.js specific adapters for IPC and child processes.

### Tools & Documentation

#### [@remobj/docs](./docs)
Comprehensive documentation and API reference.

#### [@remobj/playground](./playground)
Interactive examples and experimentation environment.

## 🏗️ Architecture

remobj follows a layered architecture that scales from simple RPC to complex distributed systems:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  Your APIs, Business Logic, UI Components                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   remobj Remote Object API                  │
│  provide(), consume(), type-safe proxies                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   remobj Core Endpoints                     │
│  PostMessageEndpoint, channels, connections                │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Platform Adapters                        │
│  Workers, MessagePorts, WebRTC, WebSockets                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Browser/Node APIs                       │
│  PostMessage, Streams, IPC, Child Processes                │
└─────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **PostMessageEndpoint**: Standardized interface for all communication types
2. **Remote Object API**: High-level RPC with automatic serialization
3. **Type Safety**: Full TypeScript support with intelligent inference
4. **Development Tools**: Real-time monitoring and debugging

## 🛠️ Development

This project uses [Rush](https://rushjs.io/) for monorepo management with pnpm.

### Prerequisites

- Node.js >= 18.20.3
- Rush CLI: `npm install -g @microsoft/rush`

### Setup

```bash
# Clone repository
git clone https://github.com/remobj/remobj.git
cd remobj

# Install dependencies and link packages
rush update

# Build all packages
rush build
```

### Common Commands

```bash
# Install dependencies for all packages
rush update

# Build all packages
rush build

# Rebuild all packages from scratch  
rush rebuild

# Run tests across all packages
rush test

# Work on specific package
cd packages/core
npm run dev
```

### Package Development

Each package can be developed independently:

```bash
# Core library development
cd packages/core
npm run dev        # Development server
npm run build      # Build library
npm run test       # Run tests

# DevTools development  
cd devtools/core
npm run dev        # Development server
npm run build      # Build library
npm run test       # Run tests
```

## 🧪 Testing

```bash
# Run all tests
rush test

# Run tests for specific package
cd packages/core && npm test
cd devtools/core && npm test

# Run tests with coverage
npm run coverage
```

## 📚 Documentation

- **[API Documentation](./docs/api/)**: Complete API reference
- **[Package READMEs](./packages/)**: Individual package documentation
- **[Examples](./playground/)**: Interactive examples and demos

## 🔒 Security

remobj includes multiple security layers:

- **Structured Clone Serialization**: Only safely serializable data is supported
- **Input Validation**: Prevents malformed messages and injection attacks
- **Prototype Pollution Protection**: Secure object creation and manipulation
- **Explicit API Exposure**: Only explicitly provided functions are callable remotely
- **Error Boundaries**: Remote errors don't crash host contexts

## 🌍 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Full support |
| Firefox | 92+ | ✅ Full support |
| Safari | 15+ | ✅ Full support |
| Edge | 88+ | ✅ Full support |
| Node.js | 18+ | ⚠️ Limited (core features only) |

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Run `rush build` and `rush test`
6. Submit a pull request

## 🙏 Acknowledgments

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)**: Inspiration for RPC-over-PostMessage
- **[Rush](https://rushjs.io/)**: Excellent monorepo tooling
- **[TypeScript](https://www.typescriptlang.org/)**: Making JavaScript development enjoyable

---

**remobj** - Making cross-context communication simple and type-safe 🚀