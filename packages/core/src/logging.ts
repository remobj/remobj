/**
 * @fileoverview Logging and debugging utilities for remobj communication
 * 
 * This module provides logging capabilities for debugging and monitoring
 * PostMessage communication in remobj applications. Useful for development,
 * testing, and production monitoring.
 * 
 * @example Basic Usage
 * ```typescript
 * import { withLogging } from './logging'
 * 
 * const worker = new Worker('worker.js')
 * const loggedWorker = withLogging(worker, {
 *   prefix: 'MyWorker',
 *   logIncoming: true,
 *   logOutgoing: true
 * })
 * ```
 */

import type { PostMessageEndpoint } from './endpoint'

/**
 * Event listener type for PostMessage events
 * @internal
 */
type Listener<T> = (this: unknown, ev: MessageEvent<T>) => any

/**
 * Configuration options for message logging functionality
 * @public
 */
export interface LoggingOptions {
  /** Prefix to add to all log messages (default: 'PostMessage') */
  prefix?: string
  /** Whether to log incoming messages (default: true) */
  logIncoming?: boolean
  /** Whether to log outgoing messages (default: true) */
  logOutgoing?: boolean
  /** Custom logger function (default: console.log) */
  logger?: (message: string, data?: any) => void
}

/**
 * Wraps a PostMessageEndpoint with logging capabilities for debugging and monitoring.
 * @public
 * Logs incoming and/or outgoing messages with configurable options.
 * 
 * This is useful for:
 * - Debugging communication issues
 * - Monitoring message flow
 * - Adding custom logging/telemetry
 * 
 * @param endpoint - The PostMessageEndpoint to wrap with logging
 * @param options - Logging configuration options
 * @returns A new PostMessageEndpoint with logging capabilities
 * 
 * @example
 * ```typescript
 * const worker = new Worker('worker.js')
 * const loggedWorker = withLogging(worker, {
 *   prefix: 'MyWorker',
 *   logIncoming: true,
 *   logOutgoing: true,
 *   logger: (msg, data) => console.log(`[DEBUG] ${msg}`, data)
 * })
 * 
 * // All messages will now be logged
 * loggedWorker.postMessage('Hello') // Logs: MyWorker [OUT]: Hello
 * ```
 */
export function withLogging(endpoint: PostMessageEndpoint, options: LoggingOptions = {}): PostMessageEndpoint {
  const {
    prefix = 'PostMessage',
    logIncoming = true,
    logOutgoing = true,
    logger = console.log
  } = options

  return {
    postMessage(data) {
      if (logOutgoing) {
        logger(`${prefix} [OUT]:`, data)
      }
      endpoint.postMessage(data)
    },
    addEventListener(type, listener) {
      if (type === 'message' && logIncoming) {
        const loggingListener: Listener<any> = (event) => {
          logger(`${prefix} [IN]:`, event.data)
          listener(event)
        }
        endpoint.addEventListener(type, loggingListener)
      } else {
        endpoint.addEventListener(type, listener)
      }
    },
    removeEventListener(type, listener) {
      endpoint.removeEventListener(type, listener)
    }
  }
}