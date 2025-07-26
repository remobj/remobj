import type { TestScenario, EndpointPair } from '../types'
import { provide, consume } from '@remobj/core'

/**
 * Pre-defined test scenarios for common remobj use cases
 */
export class TestScenarios {
  /**
   * Basic calculator service scenario
   */
  static calculatorService(): TestScenario {
    return {
      name: 'Calculator Service',
      description: 'Tests basic mathematical operations through remote objects',
      
      setup: async (endpoints: EndpointPair) => {
        const calculator = {
          add: (a: number, b: number) => a + b,
          subtract: (a: number, b: number) => a - b,
          multiply: (a: number, b: number) => a * b,
          divide: (a: number, b: number) => {
            if (b === 0) throw new Error('Division by zero')
            return a / b
          }
        }
        
        provide(calculator, endpoints.endpointA)
      },
      
      execute: async (endpoints: EndpointPair) => {
        const calculator = consume<{
          add(a: number, b: number): number
          subtract(a: number, b: number): number
          multiply(a: number, b: number): number
          divide(a: number, b: number): number
        }>(endpoints.endpointB)
        
        const results = {
          add: await calculator.add(5, 3),
          subtract: await calculator.subtract(10, 4),
          multiply: await calculator.multiply(6, 7),
          divide: await calculator.divide(15, 3)
        }
        
        return results
      },
      
      validate: (result: any) => {
        return (
          result.add === 8 &&
          result.subtract === 6 &&
          result.multiply === 42 &&
          result.divide === 5
        )
      },
      
      timeout: 5000
    }
  }

  /**
   * Async data processing scenario
   */
  static asyncDataProcessing(): TestScenario {
    return {
      name: 'Async Data Processing',
      description: 'Tests asynchronous data processing operations',
      
      setup: async (endpoints: EndpointPair) => {
        const processor = {
          async processData(data: any[]): Promise<any[]> {
            // Simulate async processing
            await new Promise(resolve => setTimeout(resolve, 50))
            return data.map(item => ({ ...item, processed: true }))
          },
          
          async batchProcess(items: any[], batchSize: number): Promise<any[]> {
            const results: any[] = []
            for (let i = 0; i < items.length; i += batchSize) {
              const batch = items.slice(i, i + batchSize)
              await new Promise(resolve => setTimeout(resolve, 10))
              results.push(...batch.map(item => ({ ...item, batchProcessed: true })))
            }
            return results
          }
        }
        
        provide(processor, endpoints.endpointA)
      },
      
      execute: async (endpoints: EndpointPair) => {
        const processor = consume<{
          processData(data: any[]): Promise<any[]>
          batchProcess(items: any[], batchSize: number): Promise<any[]>
        }>(endpoints.endpointB)
        
        const testData = [
          { id: 1, value: 'a' },
          { id: 2, value: 'b' },
          { id: 3, value: 'c' },
          { id: 4, value: 'd' }
        ]
        
        const [processed, batched] = await Promise.all([
          processor.processData(testData),
          processor.batchProcess(testData, 2)
        ])
        
        return { processed, batched }
      },
      
      validate: (result: any) => {
        const { processed, batched } = result
        return (
          processed.length === 4 &&
          processed.every((item: any) => item.processed === true) &&
          batched.length === 4 &&
          batched.every((item: any) => item.batchProcessed === true)
        )
      },
      
      timeout: 10000
    }
  }

  /**
   * Error handling scenario
   */
  static errorHandling(): TestScenario {
    return {
      name: 'Error Handling',
      description: 'Tests proper error propagation and handling',
      
      setup: async (endpoints: EndpointPair) => {
        const errorService = {
          throwError(message: string): never {
            throw new Error(message)
          },
          
          async throwAsyncError(message: string, delay: number): Promise<never> {
            await new Promise(resolve => setTimeout(resolve, delay))
            throw new Error(message)
          },
          
          conditionalError(shouldThrow: boolean): string {
            if (shouldThrow) {
              throw new Error('Conditional error triggered')
            }
            return 'Success'
          }
        }
        
        provide(errorService, endpoints.endpointA)
      },
      
      execute: async (endpoints: EndpointPair) => {
        const errorService = consume<{
          throwError(message: string): never
          throwAsyncError(message: string, delay: number): Promise<never>
          conditionalError(shouldThrow: boolean): string
        }>(endpoints.endpointB)
        
        const results = {
          syncError: null as any,
          asyncError: null as any,
          conditionalSuccess: null as any,
          conditionalError: null as any
        }
        
        // Test sync error
        try {
          await errorService.throwError('Sync error test')
        } catch (error) {
          results.syncError = error
        }
        
        // Test async error
        try {
          await errorService.throwAsyncError('Async error test', 25)
        } catch (error) {
          results.asyncError = error
        }
        
        // Test conditional success
        results.conditionalSuccess = await errorService.conditionalError(false)
        
        // Test conditional error
        try {
          await errorService.conditionalError(true)
        } catch (error) {
          results.conditionalError = error
        }
        
        return results
      },
      
      validate: (result: any) => {
        const { syncError, asyncError, conditionalSuccess, conditionalError } = result
        return (
          syncError instanceof Error &&
          syncError.message.includes('Sync error test') &&
          asyncError instanceof Error &&
          asyncError.message.includes('Async error test') &&
          conditionalSuccess === 'Success' &&
          conditionalError instanceof Error &&
          conditionalError.message.includes('Conditional error triggered')
        )
      },
      
      timeout: 5000
    }
  }

  /**
   * State management scenario
   */
  static stateManagement(): TestScenario {
    return {
      name: 'State Management',
      description: 'Tests stateful operations and data persistence across calls',
      
      setup: async (endpoints: EndpointPair) => {
        const state = new Map<string, any>()
        
        const stateService = {
          set(key: string, value: any): void {
            state.set(key, value)
          },
          
          get(key: string): any {
            return state.get(key)
          },
          
          has(key: string): boolean {
            return state.has(key)
          },
          
          delete(key: string): boolean {
            return state.delete(key)
          },
          
          clear(): void {
            state.clear()
          },
          
          size(): number {
            return state.size
          },
          
          keys(): string[] {
            return Array.from(state.keys())
          }
        }
        
        provide(stateService, endpoints.endpointA)
      },
      
      execute: async (endpoints: EndpointPair) => {
        const stateService = consume<{
          set(key: string, value: any): void
          get(key: string): any
          has(key: string): boolean
          delete(key: string): boolean
          clear(): void
          size(): number
          keys(): string[]
        }>(endpoints.endpointB)
        
        // Test state operations
        await stateService.set('user', { name: 'John', age: 30 })
        await stateService.set('counter', 0)
        await stateService.set('config', { theme: 'dark', lang: 'en' })
        
        const user = await stateService.get('user')
        const counter = await stateService.get('counter')
        const hasConfig = await stateService.has('config')
        const size1 = await stateService.size()
        
        await stateService.delete('counter')
        const size2 = await stateService.size()
        const hasCounter = await stateService.has('counter')
        
        const keys = await stateService.keys()
        
        await stateService.clear()
        const size3 = await stateService.size()
        
        return {
          user,
          hasConfig,
          size1,
          size2,
          size3,
          hasCounter,
          keys
        }
      },
      
      validate: (result: any) => {
        const { user, hasConfig, size1, size2, size3, hasCounter, keys } = result
        return (
          user && user.name === 'John' && user.age === 30 &&
          hasConfig === true &&
          size1 === 3 &&
          size2 === 2 &&
          size3 === 0 &&
          hasCounter === false &&
          Array.isArray(keys) && keys.length === 2
        )
      },
      
      timeout: 5000
    }
  }

  /**
   * High throughput scenario
   */
  static highThroughput(): TestScenario {
    return {
      name: 'High Throughput',
      description: 'Tests system performance under high message volume',
      
      setup: async (endpoints: EndpointPair) => {
        const throughputService = {
          echo(data: any): any {
            return data
          },
          
          increment(value: number): number {
            return value + 1
          },
          
          processArray(arr: number[]): number[] {
            return arr.map(x => x * 2)
          }
        }
        
        provide(throughputService, endpoints.endpointA)
      },
      
      execute: async (endpoints: EndpointPair) => {
        const throughputService = consume<{
          echo(data: any): any
          increment(value: number): number
          processArray(arr: number[]): number[]
        }>(endpoints.endpointB)
        
        const messageCount = 500
        const startTime = Date.now()
        
        // Test rapid sequential calls
        const echoPromises = Array.from({ length: messageCount }, (_, i) => 
          throughputService.echo({ id: i, data: `message-${i}` })
        )
        
        const echoResults = await Promise.all(echoPromises)
        
        // Test rapid concurrent calls
        const incrementPromises = Array.from({ length: messageCount }, (_, i) =>
          throughputService.increment(i)
        )
        
        const incrementResults = await Promise.all(incrementPromises)
        
        const endTime = Date.now()
        const totalTime = endTime - startTime
        
        return {
          echoResults: echoResults.length,
          incrementResults: incrementResults.length,
          totalTime,
          messagesPerSecond: (messageCount * 2) / (totalTime / 1000)
        }
      },
      
      validate: (result: any) => {
        const { echoResults, incrementResults, totalTime, messagesPerSecond } = result
        return (
          echoResults === 500 &&
          incrementResults === 500 &&
          totalTime < 30000 && // Should complete within 30 seconds
          messagesPerSecond > 10 // At least 10 messages per second
        )
      },
      
      timeout: 35000
    }
  }

  /**
   * Get all available scenarios
   */
  static getAllScenarios(): TestScenario[] {
    return [
      this.calculatorService(),
      this.asyncDataProcessing(),
      this.errorHandling(),
      this.stateManagement(),
      this.highThroughput()
    ]
  }

  /**
   * Run a specific scenario
   */
  static async runScenario(
    scenario: TestScenario,
    endpoints: EndpointPair
  ): Promise<{ passed: boolean; error?: Error; result?: any; duration: number }> {
    const startTime = Date.now()
    
    try {
      // Setup
      if (scenario.setup) {
        await scenario.setup(endpoints)
      }
      
      // Execute
      const result = await scenario.execute(endpoints)
      
      // Validate
      let passed = true
      if (scenario.validate) {
        passed = await scenario.validate(result, endpoints)
      }
      
      // Cleanup
      if (scenario.cleanup) {
        await scenario.cleanup(endpoints)
      }
      
      const duration = Date.now() - startTime
      
      return { passed, result, duration }
      
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        passed: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration
      }
    }
  }

  /**
   * Run all scenarios
   */
  static async runAllScenarios(
    endpoints: EndpointPair
  ): Promise<Array<{ scenario: string; passed: boolean; error?: Error; duration: number }>> {
    const scenarios = this.getAllScenarios()
    const results: Array<{ scenario: string; passed: boolean; error?: Error; duration: number }> = []
    
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario, endpoints)
      results.push({
        scenario: scenario.name,
        passed: result.passed,
        error: result.error,
        duration: result.duration
      })
    }
    
    return results
  }
}