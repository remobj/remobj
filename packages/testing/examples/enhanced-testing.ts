/**
 * Enhanced Testing Examples for @remobj/testing
 * 
 * This file demonstrates the advanced testing capabilities
 * including MessageChannel pools, multi-instance BroadcastChannels,
 * and specialized testing helpers.
 */

import {
  MessageChannelEndpoints,
  MessageChannelPool,
  BroadcastChannelEndpoints,
  MessageChannelHelpers,
  TestHelpers
} from '../src/index'

// Example 1: Enhanced MessageChannel Testing
export async function exampleEnhancedMessageChannelTesting() {
  console.log('=== Enhanced MessageChannel Testing ===')
  
  const endpoints = new MessageChannelEndpoints()
  
  // Test transferable objects
  const transferables = [new ArrayBuffer(1024)]
  const transferResult = await MessageChannelHelpers.testTransferableObjects(endpoints, transferables)
  console.log('Transferable objects test:', transferResult)
  
  // Test port lifecycle
  const lifecycleResult = await MessageChannelHelpers.testPortLifecycle(endpoints)
  console.log('Port lifecycle test:', lifecycleResult)
  
  // Test error handling
  const errorResult = await MessageChannelHelpers.testErrorHandling(endpoints)
  console.log('Error handling test:', errorResult)
  
  // Check transfer history
  const transferHistory = endpoints.getAllTransfers()
  console.log('Transfer history:', transferHistory.length, 'transfers')
  
  // Get transfer statistics
  const stats = endpoints.getTransferStats()
  console.log('Transfer stats:', stats)
  
  endpoints.disconnect()
}

// Example 2: MessageChannel Connection Pool
export async function exampleMessageChannelPool() {
  console.log('\n=== MessageChannel Pool Testing ===')
  
  const pool = new MessageChannelPool()
  
  // Create multiple channels
  const channelIds = ['api-server', 'auth-service', 'database', 'cache', 'logger']
  for (const id of channelIds) {
    pool.createChannel(id)
  }
  
  // Test different topologies
  console.log('Testing Star Topology...')
  pool.createStarTopology('api-server', ['auth-service', 'database', 'cache'])
  console.log('Star topology stats:', pool.getPoolStats())
  
  // Reset and test mesh topology
  pool.reset()
  for (const id of channelIds) {
    pool.createChannel(id)
  }
  
  console.log('Testing Mesh Topology...')
  pool.createMeshTopology(channelIds)
  console.log('Mesh topology stats:', pool.getPoolStats())
  
  // Test latency simulation
  pool.setChannelLatency('api-server', 50) // 50ms latency
  
  // Test broadcast
  pool.broadcast('api-server', { type: 'health-check', timestamp: Date.now() })
  
  // Get message history
  const history = pool.getMessageHistory()
  console.log('Message history:', history.length, 'messages')
  
  // Test partition and recovery
  console.log('Testing partition recovery...')
  pool.partitionChannel('database')
  console.log('After partition:', pool.getPoolStats())
  
  pool.restoreChannel('database', ['api-server', 'cache'])
  console.log('After recovery:', pool.getPoolStats())
  
  pool.reset()
}

// Example 3: Multi-Instance BroadcastChannel Testing
export async function exampleMultiInstanceBroadcastChannel() {
  console.log('\n=== Multi-Instance BroadcastChannel Testing ===')
  
  const endpoints = new BroadcastChannelEndpoints('test-channel-a', 'test-channel-b')
  
  // Create additional instances for testing multi-instance behavior
  const instance1 = endpoints.createAdditionalInstance('test-channel-a')
  const instance2 = endpoints.createAdditionalInstance('test-channel-a')
  const instance3 = endpoints.createAdditionalInstance('test-channel-b')
  
  // Test instance counts
  const counts = endpoints.getChannelInstanceCounts()
  console.log('Channel instance counts:', counts)
  
  // Test external broadcast simulation
  endpoints.simulateExternalBroadcast('test-channel-a', { 
    type: 'external-message', 
    content: 'Hello from external instance' 
  })
  
  // Get message history
  const history = endpoints.getMessageHistory()
  console.log('BroadcastChannel message history:', history)
  
  // Get active channels
  const activeChannels = endpoints.getActiveChannels()
  console.log('Active channels:', activeChannels)
  
  // Cleanup
  instance1.close()
  instance2.close()
  instance3.close()
  endpoints.disconnect()
}

// Example 4: Performance Benchmarking
export async function examplePerformanceBenchmarking() {
  console.log('\n=== Performance Benchmarking ===')
  
  // Benchmark MessageChannel performance
  const benchmarkResult = await MessageChannelHelpers.benchmarkMessageChannel(1000)
  console.log('MessageChannel benchmark:', benchmarkResult)
  
  // Stress test multiple channels
  const stressResult = await MessageChannelHelpers.stressTestMessageChannels(5, 100, 10)
  console.log('Stress test result:', stressResult)
  
  // Test topology patterns
  const topologyResult = await MessageChannelHelpers.testTopologyPatterns()
  console.log('Topology patterns test:', topologyResult)
}

// Example 5: Edge Case Testing
export async function exampleEdgeCaseTesting() {
  console.log('\n=== Edge Case Testing ===')
  
  const endpoints = new MessageChannelEndpoints()
  const edgeCases = MessageChannelHelpers.generateEdgeCaseScenarios()
  
  for (const scenario of edgeCases) {
    console.log(`Testing: ${scenario.name}`)
    console.log(`Description: ${scenario.description}`)
    
    try {
      const result = await scenario.test(endpoints)
      console.log(`Result: ${result ? 'PASS' : 'FAIL'}`)
    } catch (error) {
      console.log(`Result: ERROR - ${error instanceof Error ? error.message : String(error)}`)
    }
    
    console.log('---')
  }
  
  endpoints.disconnect()
}

// Example 6: remobj Integration Testing
export async function exampleRemobjIntegration() {
  console.log('\n=== remobj Integration Testing ===')
  
  // Define a test API
  const testAPI = {
    testMethod: async (value: number) => {
      await TestHelpers.delay(Math.random() * 10) // Simulate async work
      return value * 2
    },
    
    echo: (message: string) => message,
    
    error: () => {
      throw new Error('Intentional test error')
    },
    
    complex: {
      nested: {
        operation: (a: number, b: number) => a + b
      }
    }
  }
  
  // Test integration
  const integrationResult = await MessageChannelHelpers.testRemobjIntegration(testAPI, 50)
  console.log('remobj Integration result:', integrationResult)
}

// Run all examples
export async function runAllExamples() {
  try {
    await exampleEnhancedMessageChannelTesting()
    await exampleMessageChannelPool()
    await exampleMultiInstanceBroadcastChannel()
    await examplePerformanceBenchmarking()
    await exampleEdgeCaseTesting()
    await exampleRemobjIntegration()
    
    console.log('\n✅ All examples completed successfully!')
  } catch (error) {
    console.error('❌ Example failed:', error)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runAllExamples()
}