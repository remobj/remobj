import type { EndpointPair, TestSuiteOptions } from '../types'
import { EndpointTestSuite } from '../suites/endpointTestSuite'
import { RemoteObjectTestSuite } from '../suites/remoteObjectTestSuite'

/**
 * Test results for a single test suite
 */
export interface TestSuiteResult {
  name: string
  passed: boolean
  duration: number
  error?: Error
  details?: string
}

/**
 * Complete test run results
 */
export interface TestRunResults {
  endpointType: string
  totalDuration: number
  passed: number
  failed: number
  suites: TestSuiteResult[]
  summary: string
}

/**
 * Main test runner for remobj endpoint testing
 * Runs comprehensive tests against any PostMessage endpoint pair
 */
export async function runEndpointTests(
  endpoints: EndpointPair,
  endpointType: string = 'unknown',
  options: TestSuiteOptions = {}
): Promise<TestRunResults> {
  const startTime = Date.now()
  const results: TestSuiteResult[] = []
  
  console.log(`\\n🧪 Running remobj tests for ${endpointType} endpoints`)
  console.log('=' .repeat(60))

  // Test suites to run
  const testSuites = [
    {
      name: 'Endpoint Communication Tests',
      suite: new EndpointTestSuite(endpoints, options),
      tests: [
        'testBasicCommunication',
        'testBidirectionalCommunication',
        'testMultipleMessages',
        'testLargeMessages',
        'testMessageOrdering',
        'testEventHandling',
        'testDisconnection',
        'testErrorHandling',
        'testConcurrentMessages',
        'testMessageTypes'
      ]
    },
    {
      name: 'Remote Object Tests',
      suite: new RemoteObjectTestSuite(endpoints, options),
      tests: [
        'testBasicOperations',
        'testAsyncOperations',
        'testComplexDataTypes',
        'testErrorHandling',
        'testConcurrentCalls',
        'testStateManagement',
        'testPerformance',
        'testMethodChaining',
        'testLargeDataTransfer',
        'testTimeouts'
      ]
    }
  ]

  // Run each test suite
  for (const { name, suite, tests } of testSuites) {
    console.log(`\\n📋 ${name}`)
    console.log('-'.repeat(40))
    
    const suiteStartTime = Date.now()
    let suiteError: Error | undefined
    
    try {
      // Run individual tests if specified, otherwise run all
      if (tests && options.verbose) {
        for (const testName of tests) {
          const testMethod = (suite as any)[testName]
          if (typeof testMethod === 'function') {
            console.log(`  ⏳ ${testName}...`)
            const testStart = Date.now()
            
            try {
              await testMethod.call(suite)
              const testDuration = Date.now() - testStart
              console.log(`  ✅ ${testName} (${testDuration}ms)`)
            } catch (error) {
              const testDuration = Date.now() - testStart
              console.log(`  ❌ ${testName} (${testDuration}ms): ${error instanceof Error ? error.message : error}`)
              throw error
            }
          }
        }
      } else {
        // Run all tests at once
        await suite.runAll()
      }
      
      const suiteDuration = Date.now() - suiteStartTime
      console.log(`  ✅ All tests passed (${suiteDuration}ms)`)
      
      results.push({
        name,
        passed: true,
        duration: suiteDuration
      })
      
    } catch (error) {
      const suiteDuration = Date.now() - suiteStartTime
      suiteError = error instanceof Error ? error : new Error(String(error))
      
      console.log(`  ❌ Test suite failed (${suiteDuration}ms): ${suiteError.message}`)
      
      results.push({
        name,
        passed: false,
        duration: suiteDuration,
        error: suiteError,
        details: suiteError.stack
      })
    }
  }

  // Calculate final results
  const totalDuration = Date.now() - startTime
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  // Generate summary
  console.log('\\n' + '='.repeat(60))
  console.log(`📊 Test Results for ${endpointType}`)
  console.log(`   Total: ${results.length} suites`)
  console.log(`   Passed: ${passed} ✅`)
  console.log(`   Failed: ${failed} ❌`)
  console.log(`   Duration: ${totalDuration}ms`)
  
  if (failed === 0) {
    console.log(`\\n🎉 All tests passed for ${endpointType} endpoints!`)
  } else {
    console.log(`\\n⚠️  ${failed} test suite(s) failed for ${endpointType} endpoints`)
    
    // Show failed test details
    results.filter(r => !r.passed).forEach(result => {
      console.log(`\\n❌ ${result.name}:`)
      console.log(`   Error: ${result.error?.message}`)
      if (options.verbose && result.details) {
        console.log(`   Stack: ${result.details}`)
      }
    })
  }

  const summary = failed === 0 
    ? `✅ All ${results.length} test suites passed`
    : `❌ ${failed}/${results.length} test suites failed`

  return {
    endpointType,
    totalDuration,
    passed,
    failed,
    suites: results,
    summary
  }
}

/**
 * Run tests against multiple endpoint types
 */
export async function runMultiEndpointTests(
  endpointFactories: Array<{ name: string; factory: () => EndpointPair }>,
  options: TestSuiteOptions = {}
): Promise<TestRunResults[]> {
  console.log(`\\n🔬 Running comprehensive remobj tests across ${endpointFactories.length} endpoint types`)
  
  const allResults: TestRunResults[] = []
  
  for (const { name, factory } of endpointFactories) {
    try {
      const endpoints = factory()
      const results = await runEndpointTests(endpoints, name, options)
      allResults.push(results)
      
      // Clean up
      endpoints.disconnect()
      
      // Small delay between test runs
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`\\n❌ Failed to create ${name} endpoints:`, error)
      
      allResults.push({
        endpointType: name,
        totalDuration: 0,
        passed: 0,
        failed: 1,
        suites: [{
          name: 'Endpoint Creation',
          passed: false,
          duration: 0,
          error: error instanceof Error ? error : new Error(String(error))
        }],
        summary: '❌ Failed to create endpoints'
      })
    }
  }
  
  // Overall summary
  console.log('\\n' + '='.repeat(80))
  console.log('📈 COMPREHENSIVE TEST SUMMARY')
  console.log('='.repeat(80))
  
  allResults.forEach(result => {
    console.log(`${result.endpointType}: ${result.summary} (${result.totalDuration}ms)`)
  })
  
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0)
  const totalDuration = allResults.reduce((sum, r) => sum + r.totalDuration, 0)
  
  console.log(`\\n🏁 FINAL RESULTS:`)
  console.log(`   Endpoint Types: ${allResults.length}`)
  console.log(`   Total Test Suites: ${totalPassed + totalFailed}`)
  console.log(`   Passed: ${totalPassed} ✅`)
  console.log(`   Failed: ${totalFailed} ❌`)
  console.log(`   Total Duration: ${totalDuration}ms`)
  
  if (totalFailed === 0) {
    console.log(`\\n🎉 ALL TESTS PASSED! Remobj is working perfectly across all endpoint types! 🎉`)
  } else {
    console.log(`\\n⚠️  Some tests failed. Review the results above for details.`)
  }
  
  return allResults
}