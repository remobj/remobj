/**
 * @remobj/testing - Enhanced testing utilities for remobj with advanced MessageChannel support
 * 
 * This package provides:
 * - Enhanced mock PostMessage endpoints with comprehensive testing utilities
 * - MessageChannel connection pools for complex topology testing
 * - Multi-instance BroadcastChannel simulation with global registry
 * - Specialized test helpers for MessageChannel patterns
 * - Cross-endpoint test suites with advanced scenarios
 * - Performance testing and stress testing utilities
 * - Integration helpers for popular test frameworks
 */

// Enhanced mock endpoints and utilities
export { MockEndpointPair, createMockEndpointPair } from './mocks/mockEndpoints'
export { MessageChannelEndpoints, createMessageChannelEndpoints } from './mocks/messageChannel'
export { BroadcastChannelEndpoints, createBroadcastChannelEndpoints } from './mocks/broadcastChannel'

// Advanced MessageChannel testing utilities
export { MessageChannelPool, createMessageChannelPool } from './mocks/messageChannelPool'

// Test suites
export { EndpointTestSuite } from './suites/endpointTestSuite'
export { RemoteObjectTestSuite } from './suites/remoteObjectTestSuite'
export { PerformanceTestSuite } from './suites/performanceTestSuite'

// Utilities
export { TestScenarios } from './scenarios/testScenarios'
export { TestHelpers } from './helpers/testHelpers'
export { MessageChannelHelpers } from './helpers/messageChannelHelpers'
export { PerformanceProfiler } from './profiling/performanceProfiler'

// Types
export type {
  MockEndpoint,
  EndpointPair,
  TestSuiteOptions,
  PerformanceMetrics,
  TestScenario,
  TestAssertion
} from './types'

// Main test runner
export { runEndpointTests, runMultiEndpointTests } from './runner/testRunner'