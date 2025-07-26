/**
 * @fileoverview remobj - Zero-dependency TypeScript library for cross-context communication
 * 
 * remobj provides standardized interfaces for communication using PostMessage APIs
 * and Web Streams, enabling seamless data exchange between Workers, iframes,
 * ServiceWorkers, and other JavaScript execution contexts.
 * 
 * ## Core Features
 * 
 * - **🎯 Type-Safe RPC**: Full TypeScript support with intelligent autocomplete
 * - **🔧 Zero Dependencies**: Pure browser APIs, no external dependencies
 * - **🌐 Universal Compatibility**: Works with Workers, MessagePorts, WebRTC, WebSockets
 * - **🛡️ Security First**: Built-in validation and prototype pollution protection
 * - **📦 Modular Design**: Import only what you need for optimal bundle size
 * - **🔄 Automatic Cleanup**: Memory management via FinalizationRegistry
 * 
 * @example Basic Worker Communication with Full Type Safety
 * ```typescript
 * // === worker.ts (Provider) ===
 * interface MathAPI {
 *   add(a: number, b: number): number
 *   multiply(a: number, b: number): number
 *   divide(a: number, b: number): number
 * }
 * 
 * const mathAPI: MathAPI = {
 *   add: (a, b) => a + b,
 *   multiply: (a, b) => a * b,
 *   divide: (a, b) => {
 *     if (b === 0) throw new Error('Division by zero')
 *     return a / b
 *   }
 * }
 * 
 * provide(mathAPI, self) // Expose API to consumer
 * 
 * // === main.ts (Consumer) ===
 * const worker = new Worker('./worker.js')
 * const math = consume<MathAPI>(worker) // Full type safety!
 * 
 * // IDE provides autocomplete and type checking
 * const sum = await math.add(5, 3)         // ✅ Type: number (8)
 * const product = await math.multiply(4, 7) // ✅ Type: number (28)
 * await math.add("5", "3")                 // ❌ TypeScript error!
 * ```
 * 
 * @example Complex Nested Objects with Intellisense
 * ```typescript
 * interface DatabaseAPI {
 *   users: {
 *     findById(id: number): Promise<User | null>
 *     create(userData: CreateUserData): Promise<User>
 *     update(id: number, updates: Partial<User>): Promise<User>
 *   }
 *   posts: {
 *     findByUserId(userId: number): Promise<Post[]>
 *     createPost(postData: CreatePostData): Promise<Post>
 *   }
 * }
 * 
 * const db = consume<DatabaseAPI>(worker)
 * 
 * // Nested property access with full type safety
 * const user = await db.users.findById(123)     // Type: User | null
 * const posts = await db.posts.findByUserId(123) // Type: Post[]
 * 
 * // IDE provides autocomplete for all nested properties
 * db.users.   // ← Shows: findById, create, update
 * db.posts.   // ← Shows: findByUserId, createPost  
 * ```
 * 
 * @example Constructor Calls with Type Safety
 * ```typescript
 * interface ServiceAPI {
 *   Logger: new (name: string, level: 'debug' | 'info' | 'error') => {
 *     log(message: string): void
 *     error(message: string, error?: Error): void
 *   }
 * }
 * 
 * const services = consume<ServiceAPI>(worker)
 * 
 * // Constructor calls with full type safety
 * const logger = await new services.Logger('MyApp', 'debug')
 * await logger.log('Application started') // ✅ Fully typed
 * ```
 * 
 * @example Stream-based Communication
 * ```typescript
 * import { streamToPostMessage, postMessageToStream } from 'remobj'
 * 
 * const stream = { input: new WritableStream(), output: new ReadableStream() }
 * const endpoint = streamToPostMessage(stream)
 * endpoint.postMessage('Hello World')
 * ```
 * 
 * @author remobj Team
 * @license MIT (non-commercial) / €50/month (commercial)
 * @version 1.0.0
 */

// ============================================================================
// Core Types and Functions
// ============================================================================

/**
 * Core endpoint types for PostMessage-based communication.
 * These types provide standardized interfaces compatible with Web Workers, MessagePorts,
 * BroadcastChannels, ServiceWorkers, and Windows.
 */
export type { PostMessageEndpoint, PostMessageEndpointString } from './endpoint'

/**
 * Core PostMessage endpoint functions for creating isolated channels and connecting endpoints.
 */
export { createChannel, connectEndpoints } from './endpoint'

// ============================================================================
// Web API Adapters
// ============================================================================

/**
 * Web API adapters that convert browser communication mechanisms into standardized
 * PostMessageEndpoint or StreamEndpoint interfaces. Includes support for WebRTC
 * DataChannels and WebSockets with automatic serialization and error handling.
 * 
 * NOTE: Web adapters have been moved to @remobj/web package for better modularity.
 * Import from '@remobj/web' instead:
 * 
 * ```typescript
 * import { dataChannelToStream, dataChannelToPostMessage, webSocketToPostMessage } from '@remobj/web'
 * ```
 */

// ============================================================================
// Remote Object API
// ============================================================================

/**
 * High-level Remote Object API for cross-realm object manipulation.
 * Provides RPC-based communication with automatic serialization, proxy management,
 * and object reference tracking for seamless remote method calls.
 * 
 * @example Type-safe Remote Object Usage
 * ```typescript
 * // Define your API interface for complete IDE support
 * interface UserAPI {
 *   getUser(id: number): Promise<User>
 *   createUser(data: CreateUserData): Promise<User>
 *   updateUser(id: number, updates: Partial<User>): Promise<User>
 * }
 * 
 * // Provider side (Worker/ServiceWorker)
 * const userAPI: UserAPI = {
 *   async getUser(id) { return await db.users.findById(id) },
 *   async createUser(data) { return await db.users.create(data) },
 *   async updateUser(id, updates) { return await db.users.update(id, updates) }
 * }
 * provide(userAPI, self)
 * 
 * // Consumer side (Main thread)
 * const worker = new Worker('./user-worker.js')
 * const api = consume<UserAPI>(worker) // ← Full type safety and autocomplete
 * 
 * const user = await api.getUser(123)           // ✅ Type: Promise<User>
 * const newUser = await api.createUser(data)    // ✅ IDE validates data structure
 * ```
 */
export {
  consume,
  provide
} from './remoteObject'

/**
 * TypeScript types for Remote Object API including proxy wrapper types
 * for maintaining type safety across communication boundaries.
 */
export type { Wrapped } from './remoteTypes'

// ============================================================================
// Logging and Debugging Utilities
// ============================================================================

/**
 * Logging and debugging utilities for monitoring PostMessage communication.
 * Provides configurable logging capabilities for development and production monitoring.
 */
export { withLogging } from './logging'
export type { LoggingOptions } from './logging'

// ============================================================================
// Development Tools
// ============================================================================

/**
 * Development tools for monitoring and debugging PostMessage communication.
 * Provides endpoint proxying, network discovery, and message monitoring capabilities.
 */
export { setMonitorEndpoint, createProxyEndpoint } from './devtools'
export type { ProxyMessage, ProxyEndpointOptions, EndpointMetadata } from './devtools'

// ============================================================================
// Stream Utilities and Interfaces
// ============================================================================

/**
 * Stream-based communication interfaces and conversion functions.
 * Provides bidirectional data flow through ReadableStream/WritableStream pairs.
 * 
 * NOTE: Stream utilities have been moved to @remobj/stream package for better modularity.
 * Import from '@remobj/stream' instead:
 * 
 * ```typescript
 * import { 
 *   StreamEndpoint,
 *   streamToPostMessage, 
 *   postMessageToStream, 
 *   connectStreams,
 *   createDuplexStreams,
 *   multiplexStreams
 * } from '@remobj/stream'
 * ```
 */

// ============================================================================
// Platform-Specific Adapters
// ============================================================================

// Note: Platform-specific adapters have been moved to separate packages:
// - @remobj/web - Web API adapters (WebRTC, WebSocket)
// - @remobj/stream - Stream utilities and interfaces
// This provides better separation of concerns and reduced bundle size.

