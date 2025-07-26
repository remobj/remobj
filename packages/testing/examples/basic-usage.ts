/**
 * Basic usage example for @remobj/testing
 * This demonstrates how to test remobj endpoints using various approaches
 */

import {
  createMockEndpointPair,
  createMessageChannelEndpoints,
  runEndpointTests,
  runMultiEndpointTests,
  EndpointTestSuite,
  RemoteObjectTestSuite,
  PerformanceTestSuite,
  TestHelpers
} from '@remobj/testing'

async function basicEndpointTesting() {
  console.log('🧪 Basic Endpoint Testing Example')
  console.log('='.repeat(40))

  // Create mock endpoints for testing
  const endpoints = createMockEndpointPair()

  // Run comprehensive tests
  const results = await runEndpointTests(endpoints, 'Mock Endpoints', {
    verbose: true,
    timeout: 10000
  })

  console.log(`\\nTest Results: ${results.summary}`)
  console.log(`Duration: ${results.totalDuration}ms`)

  endpoints.disconnect()
}

async function multiEndpointTesting() {
  console.log('\\n🔬 Multi-Endpoint Testing Example')
  console.log('='.repeat(40))

  // Test multiple endpoint types
  const endpointFactories = [
    {
      name: 'Mock Endpoints',
      factory: () => createMockEndpointPair()
    },
    {
      name: 'MessageChannel',
      factory: () => createMessageChannelEndpoints()
    }
  ]

  const results = await runMultiEndpointTests(endpointFactories, {
    verbose: false,
    iterations: 100
  })

  console.log('\\nMulti-Endpoint Results:')
  results.forEach(result => {
    console.log(`  ${result.endpointType}: ${result.summary}`)
  })
}

async function customTestSuite() {
  console.log('\\n⚙️  Custom Test Suite Example')
  console.log('='.repeat(40))

  const endpoints = createMockEndpointPair()

  // Run individual test suites
  console.log('\\n📡 Running Endpoint Tests...')
  const endpointSuite = new EndpointTestSuite(endpoints)
  await endpointSuite.runAll()
  console.log('✅ Endpoint tests completed')

  console.log('\\n🔄 Running Remote Object Tests...')
  const remoteObjectSuite = new RemoteObjectTestSuite(endpoints)
  await remoteObjectSuite.runAll()
  console.log('✅ Remote object tests completed')

  console.log('\\n📊 Running Performance Tests...')
  const performanceSuite = new PerformanceTestSuite(endpoints, { iterations: 50 })
  const metrics = await performanceSuite.runAll()
  
  console.log('\\nPerformance Metrics:')
  metrics.forEach(metric => {
    console.log(`  ${metric.testName}: ${metric.totalTime}ms (${metric.operationCount} ops)`)
  })

  console.log(performanceSuite.generateReport())

  endpoints.disconnect()
}

async function testHelperExamples() {
  console.log('\\n🛠️  Test Helper Examples')
  console.log('='.repeat(40))

  const endpoints = createMockEndpointPair()

  // Message monitoring
  console.log('\\n📨 Message Monitoring:')
  const monitor = TestHelpers.createMessageMonitor(endpoints)

  endpoints.endpointA.postMessage({ type: 'ping' })
  endpoints.endpointB.postMessage({ type: 'pong' })

  await TestHelpers.delay(10) // Let messages flow

  const stats = monitor.getStats()
  console.log(`  Messages: ${stats.totalMessages} (A→B: ${stats.aToB}, B→A: ${stats.bToA})`)

  // Stress testing
  console.log('\\n💪 Stress Testing:')
  const operations = [
    async () => {
      endpoints.endpointA.postMessage({ test: Math.random() })
      await TestHelpers.delay(1)
    }
  ]

  const stressResult = await TestHelpers.stressTest(
    endpoints,
    operations,
    10, // 10 concurrent operations
    1000 // for 1 second
  )

  console.log(`  Operations: ${stressResult.totalOperations}`)
  console.log(`  Success Rate: ${(stressResult.successfulOperations / stressResult.totalOperations * 100).toFixed(1)}%`)
  console.log(`  Average Latency: ${stressResult.averageLatency.toFixed(2)}ms`)

  // Data generation
  console.log('\\n🎲 Test Data Generation:')
  const testString = TestHelpers.generateTestData('string', 20)
  const testArray = TestHelpers.generateTestData('array', 5)
  const testObject = TestHelpers.generateTestData('object', 3)

  console.log(`  String: "${testString}"`)
  console.log(`  Array: [${testArray.join(', ')}]`)
  console.log(`  Object: ${JSON.stringify(testObject)}`)

  // Timing measurements
  console.log('\\n⏱️  Timing Measurements:')
  const { result, duration } = await TestHelpers.measureTime(async () => {
    await TestHelpers.delay(100)
    return 'operation complete'
  })

  console.log(`  Result: ${result}`)
  console.log(`  Duration: ${duration}ms`)

  endpoints.disconnect()
}

async function errorHandlingExample() {
  console.log('\\n❌ Error Handling Example')
  console.log('='.repeat(40))

  const endpoints = createMockEndpointPair()

  try {
    // Test assertion helpers
    TestHelpers.assert(true, 'This should pass')
    console.log('✅ Assertion passed')

    TestHelpers.deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })
    console.log('✅ Deep equal passed')

    // Test error throwing
    const error = await TestHelpers.assertThrows(async () => {
      throw new Error('Expected test error')
    }, 'Expected test error')

    console.log(`✅ Error caught: ${error.message}`)

    // Test timeout handling
    try {
      await TestHelpers.timeout(
        new Promise(resolve => setTimeout(resolve, 200)),
        100 // 100ms timeout
      )
    } catch (timeoutError) {
      console.log(`✅ Timeout handled: ${timeoutError instanceof Error ? timeoutError.message : timeoutError}`)
    }

  } catch (error) {
    console.log(`❌ Unexpected error: ${error instanceof Error ? error.message : error}`)
  }

  endpoints.disconnect()
}

// Run all examples
async function runAllExamples() {
  try {
    await basicEndpointTesting()
    await multiEndpointTesting()
    await customTestSuite()
    await testHelperExamples()
    await errorHandlingExample()

    console.log('\\n🎉 All examples completed successfully!')

  } catch (error) {
    console.error('\\n💥 Example failed:', error)
    process.exit(1)
  }
}

// Export for use in other files
export {
  basicEndpointTesting,
  multiEndpointTesting,
  customTestSuite,
  testHelperExamples,
  errorHandlingExample,
  runAllExamples
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
}