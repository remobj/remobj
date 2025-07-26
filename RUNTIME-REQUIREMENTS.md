# remobj Runtime Requirements Analysis

> Comprehensive analysis of minimum runtime versions required for remobj functionality

**Last Updated:** 2025-07-25  
**Analysis Date:** 2025-07-25

## Executive Summary

Remobj requires **modern JavaScript runtime environments** due to its extensive use of cutting-edge Web APIs and ES2018+ language features. The library is designed for contemporary applications and requires relatively recent runtime versions.

### Minimum Runtime Requirements

| Runtime | Minimum Version | Recommended Version | Limitations |
|---------|----------------|---------------------|-------------|
| **Chrome** | 84+ | 92+ | crypto.randomUUID unavailable < 92 |
| **Firefox** | 95+ | 100+ | crypto.randomUUID and WritableStream |
| **Safari** | 15.4+ | 16+ | BroadcastChannel and crypto.randomUUID |
| **Edge** | 92+ | 100+ | crypto.randomUUID unavailable < 92 |
| **Node.js** | 10.5.0+ | 16.0.0+ | worker_threads and Web Streams |
| **Deno** | 1.0.0+ | 1.30+ | Full Web APIs compatibility |
| **Bun** | 0.1.0+ | 1.0+ | Modern runtime features |

## Detailed API Requirements Analysis

### Critical Web APIs (Blocking)

#### **PostMessage Communication**
```typescript
// APIs: MessageChannel, MessagePort, MessageEvent, Worker.postMessage
```
- **Chrome**: 4+ ✅
- **Firefox**: 3.5+ ✅ 
- **Safari**: 4+ ✅
- **Edge**: 12+ ✅
- **Impact**: Core functionality - library unusable without this

#### **Modern Memory Management**  
```typescript
// APIs: FinalizationRegistry, WeakRef
```
- **Chrome**: 84+ ⚠️
- **Firefox**: 79+ ⚠️
- **Safari**: 14.1+ ⚠️
- **Edge**: 84+ ⚠️
- **Impact**: Automatic cleanup of remote object proxies

#### **Proxy Objects**
```typescript
// APIs: Proxy constructor, Reflect API
```
- **Chrome**: 49+ ✅
- **Firefox**: 18+ ✅
- **Safari**: 10+ ✅
- **Edge**: 12+ ✅
- **Impact**: Core RPC functionality - provide() and consume() depend on this

### High-Impact Web APIs

#### **Cryptographic Functions**
```typescript
// APIs: crypto.randomUUID(), crypto.getRandomValues()
```
- **crypto.randomUUID():**
  - **Chrome**: 92+ ⚠️
  - **Firefox**: 95+ ⚠️
  - **Safari**: 15.4+ ⚠️
  - **Edge**: 92+ ⚠️
- **crypto.getRandomValues():**
  - **Chrome**: 11+ ✅
  - **Firefox**: 21+ ✅
  - **Safari**: 6.1+ ✅
  - **Edge**: 25+ ✅
- **Impact**: Endpoint ID generation, fallback to getRandomValues exists

#### **Web Streams API**
```typescript
// APIs: ReadableStream, WritableStream, TransformStream
```
- **ReadableStream:**
  - **Chrome**: 43+ ✅
  - **Firefox**: 65+ ✅
  - **Safari**: 10.1+ ✅
  - **Edge**: 14+ ✅
- **WritableStream:**
  - **Chrome**: 59+ ⚠️
  - **Firefox**: 100+ ⚠️
  - **Safari**: 14.1+ ⚠️
  - **Edge**: 79+ ⚠️
- **Impact**: @remobj/stream package functionality

#### **WebRTC Data Channels**
```typescript
// APIs: RTCDataChannel, RTCPeerConnection
```
- **Chrome**: 25+ ✅
- **Firefox**: 22+ ✅
- **Safari**: 11+ ✅
- **Edge**: 25+ ✅
- **Impact**: Peer-to-peer communication features

#### **BroadcastChannel**
```typescript
// APIs: BroadcastChannel constructor
```
- **Chrome**: 54+ ✅
- **Firefox**: 38+ ✅
- **Safari**: 15.4+ ⚠️
- **Edge**: 79+ ⚠️
- **Impact**: Cross-tab communication and devtools monitoring

### JavaScript Language Features

#### **ES2017+ Features (Required)**
```typescript
// Features: async/await, Promise
```
- **Chrome**: 55+ ✅
- **Firefox**: 52+ ✅
- **Safari**: 10.1+ ✅
- **Edge**: 14+ ✅
- **Impact**: Core async communication patterns

#### **ES2015+ Features (Required)**
```typescript
// Features: Arrow functions, template literals, destructuring, classes, Symbols
```
- **Chrome**: 49+ ✅
- **Firefox**: 45+ ✅
- **Safari**: 10+ ✅
- **Edge**: 14+ ✅
- **Impact**: Modern JavaScript syntax throughout codebase

#### **ES2018+ Features**
```typescript
// Features: Async iterators, object spread/rest
```
- **Chrome**: 63+ ✅
- **Firefox**: 57+ ✅
- **Safari**: 11.1+ ✅
- **Edge**: 79+ ✅
- **Impact**: Advanced streaming and iteration patterns

### Node.js Specific Requirements

#### **Worker Threads**
```typescript
// APIs: worker_threads.Worker, worker_threads.parentPort
```
- **Node.js**: 10.5.0+ ⚠️
- **Impact**: Multi-threaded processing support

#### **Child Processes**
```typescript
// APIs: child_process.fork(), child_process.spawn()
```
- **Node.js**: 0.8.0+ ✅
- **Impact**: Process-based communication

#### **Network APIs**
```typescript
// APIs: net.createConnection(), net.Socket
```
- **Node.js**: 0.3.4+ ✅
- **Impact**: TCP-based endpoint adapters

### Platform Detection Support

#### **Runtime Environment Detection**
```typescript
// Detection: globalThis, process, navigator, Deno, Bun globals
```
- **globalThis**: Chrome 71+, Firefox 65+, Safari 12.1+, Edge 79+
- **process**: Node.js 0.1.7+
- **navigator**: All browsers
- **Deno**: Deno 1.0.0+
- **Bun**: Bun 0.1.0+

## Compatibility Matrix

### Browser Support Levels

#### **Full Support (All Features)**
- **Chrome**: 92+
- **Firefox**: 100+  
- **Safari**: 15.4+
- **Edge**: 92+

#### **Core Support (Basic RPC)**
- **Chrome**: 84+
- **Firefox**: 95+
- **Safari**: 15.4+
- **Edge**: 84+

#### **Limited Support (PostMessage Only)**
- **Chrome**: 49+
- **Firefox**: 79+
- **Safari**: 14.1+
- **Edge**: 84+

### Node.js Support Levels

#### **Full Support**
- **Node.js**: 16.0.0+ (Web Streams compatibility)

#### **Core Support**
- **Node.js**: 10.5.0+ (worker_threads support)

#### **Basic Support**
- **Node.js**: 8.0.0+ (basic async/await support)

### Alternative Runtime Support

#### **Deno**
- **Full Support**: 1.0.0+
- **Web APIs**: Native support for most browser APIs
- **Limitations**: Some Node.js specific APIs unavailable

#### **Bun** 
- **Full Support**: 0.1.0+
- **Web APIs**: Extensive browser API compatibility
- **Performance**: Often faster than Node.js equivalents

## Feature Degradation Strategy

### Graceful Fallbacks

#### **Crypto API Fallback**
```typescript
// Primary: crypto.randomUUID() (Chrome 92+, Firefox 95+, Safari 15.4+)
// Fallback: crypto.getRandomValues() + manual UUID generation (Chrome 11+)
```

#### **Memory Management Fallback**
```typescript
// Primary: FinalizationRegistry + WeakRef (Chrome 84+)
// Fallback: Manual cleanup methods and WeakMap tracking
```

#### **Stream API Fallback**
```typescript
// Primary: WritableStream (Chrome 59+, Firefox 100+)
// Fallback: Event-based streaming or callback patterns
```

### Feature Detection Patterns

```typescript
// Example feature detection in remobj codebase
const hasFinalizationRegistry = typeof FinalizationRegistry !== 'undefined'
const hasCryptoUUID = typeof crypto?.randomUUID === 'function'
const hasWebStreams = typeof WritableStream !== 'undefined'
```

## Testing Environments

### Supported Test Environments
- **Node.js**: 10.5.0+ with worker_threads
- **Deno**: 1.0.0+ with Web APIs
- **Bun**: 0.1.0+ with Node.js compatibility
- **Browser**: Chrome 84+, Firefox 95+, Safari 15.4+

### CI/CD Considerations
- **GitHub Actions**: Use Node.js 16+ for full compatibility
- **Browser Testing**: Target Chrome 92+, Firefox 100+, Safari 15.4+
- **Legacy Testing**: Test fallback paths on older runtimes

## Migration Guide

### For Applications Currently Using Older Runtimes

#### **Chrome < 92**
```typescript
// Will experience crypto.randomUUID() fallback
// Performance impact: minimal (uses crypto.getRandomValues())
// Action: Upgrade to Chrome 92+ for optimal performance
```

#### **Firefox < 100**
```typescript
// Limited WritableStream support in @remobj/stream
// Fallback: Event-based streaming
// Action: Upgrade to Firefox 100+ for full streams support
```

#### **Safari < 15.4**
```typescript
// No BroadcastChannel support
// No crypto.randomUUID() support
// Action: Upgrade to Safari 15.4+ for full functionality
```

#### **Node.js < 16**
```typescript
// Limited Web Streams compatibility
// worker_threads available from 10.5.0+
// Action: Upgrade to Node.js 16+ for optimal compatibility
```

## Performance Implications

### Runtime Performance by Environment

#### **Modern Browsers (Chrome 92+, Firefox 100+)**
- **Optimal Performance**: All APIs native and optimized
- **Memory Management**: Automatic with FinalizationRegistry
- **Crypto Operations**: Native crypto.randomUUID() fastest

#### **Older Browsers (Chrome 84-91, Firefox 95-99)**
- **Good Performance**: Core functionality works well
- **Manual Cleanup**: Some memory management manual
- **Crypto Fallback**: Slight overhead for UUID generation

#### **Node.js Environments**
- **Node.js 16+**: Excellent performance with Web Streams
- **Node.js 10.5-15**: Good performance, limited streams
- **Deno/Bun**: Often superior performance to Node.js

## Security Considerations by Runtime

### Modern Runtime Security
- **Secure Contexts**: HTTPS required for some APIs
- **Origin Isolation**: Enhanced security in modern browsers
- **Worker Security**: Proper CSP policies needed

### Legacy Runtime Limitations
- **Reduced Security**: Older crypto APIs less secure
- **Missing Protections**: Some security features unavailable
- **Manual Validation**: More input validation required

---

**Recommendation**: Target Chrome 92+, Firefox 100+, Safari 15.4+, Edge 92+, and Node.js 16+ for production deployments to ensure full feature availability and optimal performance.