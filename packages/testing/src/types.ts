import type { PostMessageEndpoint } from '@remobj/core'

/**
 * Enhanced mock endpoint interface for testing with comprehensive MessageChannel support
 */
export interface MockEndpoint extends PostMessageEndpoint {
  /** Standard postMessage compatible with core interface */
  postMessage(data: any): void
  /** Get all messages sent through this endpoint */
  getSentMessages(): any[]
  /** Clear the message history */
  clearMessages(): void
  /** Simulate receiving a message */
  simulateMessage(data: any): void
  /** Check if endpoint is connected */
  isConnected(): boolean
  /** Disconnect the endpoint */
  disconnect(): void
  
  // Enhanced MessageChannel-specific testing utilities
  /** Get transfer history with transferable objects */
  getTransferHistory?(): Array<{ port: string; data: any; timestamp: number; transferables?: Transferable[] }>
  /** Get the last transfer record */
  getLastTransfer?(): { port: string; data: any; timestamp: number; transferables?: Transferable[] } | undefined
  /** Simulate an error event */
  simulateError?(error: Error): void
  /** Simulate a message error event */
  simulateMessageError?(data: any): void
  /** Start the MessagePort (for MessageChannel compatibility) */
  start?(): void
  /** Close the MessagePort (for MessageChannel compatibility) */
  close?(): void
  /** Get the underlying MessagePort for advanced testing */
  _getPort?(): MessagePort
}

/**
 * A pair of connected endpoints for testing
 */
export interface EndpointPair {
  /** First endpoint (typically provider) */
  endpointA: MockEndpoint
  /** Second endpoint (typically consumer) */
  endpointB: MockEndpoint
  /** Disconnect both endpoints */
  disconnect(): void
}

/**
 * Options for test suites
 */
export interface TestSuiteOptions {
  /** Test name for identification */
  name?: string
  /** Timeout for async operations (ms) */
  timeout?: number
  /** Number of iterations for performance tests */
  iterations?: number
  /** Enable detailed logging */
  verbose?: boolean
  /** Custom assertions to run */
  assertions?: TestAssertion[]
}

/**
 * Performance metrics collected during testing
 */
export interface PerformanceMetrics {
  /** Test name */
  testName: string
  /** Total execution time (ms) */
  totalTime: number
  /** Average time per operation (ms) */
  averageTime: number
  /** Minimum execution time (ms) */
  minTime: number
  /** Maximum execution time (ms) */
  maxTime: number
  /** Number of operations */
  operationCount: number
  /** Memory usage before test (bytes) */
  memoryBefore?: number
  /** Memory usage after test (bytes) */
  memoryAfter?: number
  /** Memory difference (bytes) */
  memoryDelta?: number
  /** Messages sent during test */
  messageCount: number
  /** Errors encountered */
  errorCount: number
}

/**
 * A test scenario definition
 */
export interface TestScenario {
  /** Scenario name */
  name: string
  /** Description of what this scenario tests */
  description: string
  /** Function to set up the test */
  setup: (endpoints: EndpointPair) => Promise<void> | void
  /** Function to execute the test */
  execute: (endpoints: EndpointPair) => Promise<any> | any
  /** Function to clean up after test */
  cleanup?: (endpoints: EndpointPair) => Promise<void> | void
  /** Expected result validator */
  validate?: (result: any, endpoints: EndpointPair) => boolean | Promise<boolean>
  /** Timeout for this specific test */
  timeout?: number
}

/**
 * Custom assertion function
 */
export interface TestAssertion {
  /** Assertion name */
  name: string
  /** The assertion function */
  assert: (endpoints: EndpointPair, result?: any) => boolean | Promise<boolean>
  /** Error message if assertion fails */
  message: string
}