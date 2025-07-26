import { describe, it, expect, vi, beforeEach } from 'vitest'
import { provide, consume } from '../src/remoteObject'
import type { PostMessageEndpoint } from '../src/endpoint'

describe('Remote Object Advanced Features', () => {
  function createMockEndpointPair(): [PostMessageEndpoint, PostMessageEndpoint] {
    const listenersA = new Set<(event: MessageEvent) => void>()
    const listenersB = new Set<(event: MessageEvent) => void>()
    
    const endpointA: PostMessageEndpoint = {
      postMessage(data: any) {
        // Simulate async message delivery
        setTimeout(() => {
          const event = new MessageEvent('message', { data })
          listenersB.forEach(listener => listener(event))
        }, 0)
      },
      addEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        if (type === 'message') listenersA.add(listener)
      },
      removeEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        if (type === 'message') listenersA.delete(listener)
      }
    }
    
    const endpointB: PostMessageEndpoint = {
      postMessage(data: any) {
        setTimeout(() => {
          const event = new MessageEvent('message', { data })
          listenersA.forEach(listener => listener(event))
        }, 0)
      },
      addEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        if (type === 'message') listenersB.add(listener)
      },
      removeEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        if (type === 'message') listenersB.delete(listener)
      }
    }
    
    return [endpointA, endpointB]
  }

  describe('Error Handling and Propagation', () => {
    it('should propagate synchronous errors from remote methods', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const errorService = {
        throwError(message: string) {
          throw new Error(message)
        },
        safeMethod() {
          return 'success'
        }
      }
      
      provide(errorService, providerEndpoint)
      const remote = consume<typeof errorService>(consumerEndpoint)
      
      // Safe method should work
      const result = await remote.safeMethod()
      expect(result).toBe('success')
      
      // Error method should propagate error
      await expect(remote.throwError('test error')).rejects.toThrow('test error')
    })

    it('should propagate asynchronous errors from remote methods', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const asyncErrorService = {
        async asyncThrowError(message: string) {
          await new Promise(resolve => setTimeout(resolve, 10))
          throw new Error(message)
        },
        async asyncSuccess() {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'async success'
        }
      }
      
      provide(asyncErrorService, providerEndpoint)
      const remote = consume<typeof asyncErrorService>(consumerEndpoint)
      
      // Safe async method should work
      const result = await remote.asyncSuccess()
      expect(result).toBe('async success')
      
      // Async error method should propagate error
      await expect(remote.asyncThrowError('async error')).rejects.toThrow('async error')
    })

    it('should handle errors with custom error types', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message)
          this.name = 'CustomError'
        }
      }
      
      const customErrorService = {
        throwCustomError() {
          throw new CustomError('Custom error message', 404)
        }
      }
      
      provide(customErrorService, providerEndpoint)
      const remote = consume<typeof customErrorService>(consumerEndpoint)
      
      await expect(remote.throwCustomError()).rejects.toThrow('Custom error message')
    })
  })

  describe('Complex Data Types and Parameters', () => {
    it('should handle nested objects as parameters', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      interface ComplexData {
        user: {
          id: number
          profile: {
            name: string
            settings: {
              theme: string
              notifications: boolean
            }
          }
        }
        metadata: {
          timestamp: number
          version: string
        }
      }
      
      const dataService = {
        processComplexData(data: ComplexData): string {
          return `User ${data.user.profile.name} (${data.user.id}) prefers ${data.user.profile.settings.theme} theme`
        },
        
        mergeData(data1: ComplexData, data2: Partial<ComplexData>): ComplexData {
          return {
            ...data1,
            ...data2,
            user: {
              ...data1.user,
              ...data2.user,
              profile: {
                ...data1.user.profile,
                ...data2.user?.profile,
                settings: {
                  ...data1.user.profile.settings,
                  ...data2.user?.profile?.settings
                }
              }
            }
          }
        }
      }
      
      provide(dataService, providerEndpoint)
      const remote = consume<typeof dataService>(consumerEndpoint)
      
      const complexData: ComplexData = {
        user: {
          id: 123,
          profile: {
            name: 'Alice',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0'
        }
      }
      
      const result = await remote.processComplexData(complexData)
      expect(result).toBe('User Alice (123) prefers dark theme')
      
      const merged = await remote.mergeData(complexData, {
        user: { profile: { settings: { theme: 'light' } } }
      })
      expect(merged.user.profile.settings.theme).toBe('light')
      expect(merged.user.profile.settings.notifications).toBe(true)
    })

    it('should handle arrays and collections', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const collectionService = {
        processNumbers(numbers: number[]): { sum: number; average: number; max: number } {
          const sum = numbers.reduce((a, b) => a + b, 0)
          return {
            sum,
            average: sum / numbers.length,
            max: Math.max(...numbers)
          }
        },
        
        filterObjects<T extends { active: boolean }>(items: T[]): T[] {
          return items.filter(item => item.active)
        },
        
        groupByProperty<T, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
          const groups: Record<string, T[]> = {}
          for (const item of items) {
            const groupKey = String(item[key])
            if (!groups[groupKey]) groups[groupKey] = []
            groups[groupKey].push(item)
          }
          return groups
        }
      }
      
      provide(collectionService, providerEndpoint)
      const remote = consume<typeof collectionService>(consumerEndpoint)
      
      // Test number processing
      const numbers = [1, 2, 3, 4, 5, 10]
      const stats = await remote.processNumbers(numbers)
      expect(stats.sum).toBe(25)
      expect(stats.average).toBe(25/6)
      expect(stats.max).toBe(10)
      
      // Test object filtering
      const items = [
        { id: 1, name: 'Item 1', active: true },
        { id: 2, name: 'Item 2', active: false },
        { id: 3, name: 'Item 3', active: true }
      ]
      const activeItems = await remote.filterObjects(items)
      expect(activeItems).toHaveLength(2)
      expect(activeItems.every(item => item.active)).toBe(true)
      
      // Test grouping
      const grouped = await remote.groupByProperty(items, 'active')
      expect(grouped['true']).toHaveLength(2)
      expect(grouped['false']).toHaveLength(1)
    })

    it('should handle null, undefined, and edge case values', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const edgeService = {
        handleNullable(value: string | null | undefined): string {
          if (value === null) return 'null'
          if (value === undefined) return 'undefined'
          return `value: ${value}`
        },
        
        processEdgeCases(data: {
          nullValue: null
          undefinedValue: undefined
          emptyString: string
          zeroNumber: number
          falseBoolean: boolean
          emptyArray: any[]
          emptyObject: {}
        }): Record<string, string> {
          return {
            nullValue: String(data.nullValue),
            undefinedValue: String(data.undefinedValue),
            emptyString: `"${data.emptyString}"`,
            zeroNumber: String(data.zeroNumber),
            falseBoolean: String(data.falseBoolean),
            emptyArray: `[${data.emptyArray.length}]`,
            emptyObject: JSON.stringify(data.emptyObject)
          }
        }
      }
      
      provide(edgeService, providerEndpoint)
      const remote = consume<typeof edgeService>(consumerEndpoint)
      
      expect(await remote.handleNullable(null)).toBe('null')
      expect(await remote.handleNullable(undefined)).toBe('undefined')
      expect(await remote.handleNullable('test')).toBe('value: test')
      
      const edgeData = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroNumber: 0,
        falseBoolean: false,
        emptyArray: [],
        emptyObject: {}
      }
      
      const result = await remote.processEdgeCases(edgeData)
      expect(result.nullValue).toBe('null')
      expect(result.undefinedValue).toBe('undefined')
      expect(result.emptyString).toBe('""')
      expect(result.zeroNumber).toBe('0')
      expect(result.falseBoolean).toBe('false')
      expect(result.emptyArray).toBe('[0]')
      expect(result.emptyObject).toBe('{}')
    })
  })

  describe('Async Operations and Promises', () => {
    it('should handle concurrent async operations', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const asyncService = {
        async delayedOperation(id: number, delay: number): Promise<{ id: number; completed: number }> {
          await new Promise(resolve => setTimeout(resolve, delay))
          return { id, completed: Date.now() }
        }
      }
      
      provide(asyncService, providerEndpoint)
      const remote = consume<typeof asyncService>(consumerEndpoint)
      
      // Test concurrent operations
      const operations = [
        remote.delayedOperation(1, 20),
        remote.delayedOperation(2, 10),
        remote.delayedOperation(3, 5)
      ]
      
      const results = await Promise.all(operations)
      
      expect(results).toHaveLength(3)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(2)
      expect(results[2].id).toBe(3)
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(typeof result.completed).toBe('number')
      })
    })

    it('should handle promise chains and sequential operations', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const chainService = {
        step1(input: string): Promise<string> {
          return Promise.resolve(`step1(${input})`)
        },
        
        step2(input: string): Promise<string> {
          return Promise.resolve(`step2(${input})`)
        },
        
        step3(input: string): Promise<string> {
          return Promise.resolve(`step3(${input})`)
        }
      }
      
      provide(chainService, providerEndpoint)
      const remote = consume<typeof chainService>(consumerEndpoint)
      
      // Test individual steps
      expect(await remote.step1('test')).toBe('step1(test)')
      expect(await remote.step2('test')).toBe('step2(test)')
      expect(await remote.step3('test')).toBe('step3(test)')
      
      // Test manual chain processing (since this context doesn't work in remote objects)
      const result1 = await remote.step1('input')
      const result2 = await remote.step2(result1)
      const result3 = await remote.step3(result2)
      expect(result3).toBe('step3(step2(step1(input)))')
    })

    it('should handle promise rejection scenarios', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const promiseService = {
        async conditionalOperation(shouldFail: boolean, delay: number = 10): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, delay))
          if (shouldFail) {
            throw new Error('Operation failed as requested')
          }
          return 'Operation succeeded'
        },
        
        async deterministicRetryOperation(shouldSucceed: boolean): Promise<string> {
          if (shouldSucceed) {
            return 'Success on first attempt'
          } else {
            throw new Error('Operation failed')
          }
        }
      }
      
      provide(promiseService, providerEndpoint)
      const remote = consume<typeof promiseService>(consumerEndpoint)
      
      // Test successful operation
      const success = await remote.conditionalOperation(false)
      expect(success).toBe('Operation succeeded')
      
      // Test failed operation
      await expect(remote.conditionalOperation(true)).rejects.toThrow('Operation failed as requested')
      
      // Test deterministic retry operation
      const successResult = await remote.deterministicRetryOperation(true)
      expect(successResult).toBe('Success on first attempt')
      
      await expect(remote.deterministicRetryOperation(false)).rejects.toThrow('Operation failed')
    })
  })

  describe('Complex Object Handling', () => {
    it('should handle stateful service operations', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      let counter = 0
      const statefulService = {
        increment(): number {
          return ++counter
        },
        
        decrement(): number {
          return --counter
        },
        
        getValue(): number {
          return counter
        },
        
        reset(): number {
          counter = 0
          return counter
        },
        
        addValue(value: number): number {
          counter += value
          return counter
        }
      }
      
      provide(statefulService, providerEndpoint)
      const remote = consume<typeof statefulService>(consumerEndpoint)
      
      // Test stateful operations
      expect(await remote.getValue()).toBe(0)
      expect(await remote.increment()).toBe(1)
      expect(await remote.increment()).toBe(2)
      expect(await remote.addValue(5)).toBe(7)
      expect(await remote.decrement()).toBe(6)
      expect(await remote.reset()).toBe(0)
    })

    it('should handle factory pattern operations', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const factoryService = {
        createUser(name: string, age: number): { id: number; name: string; age: number; createdAt: number } {
          return {
            id: Math.floor(Math.random() * 1000),
            name,
            age,
            createdAt: Date.now()
          }
        },
        
        createProduct(name: string, price: number, category: string): { 
          id: string; name: string; price: number; category: string; sku: string 
        } {
          return {
            id: `prod_${Math.random().toString(36).substr(2, 9)}`,
            name,
            price,
            category,
            sku: `${category.toUpperCase()}_${name.replace(/\s+/g, '_').toUpperCase()}`
          }
        },
        
        validateUser(user: { name: string; age: number }): { valid: boolean; errors: string[] } {
          const errors: string[] = []
          
          if (!user.name || user.name.length < 2) {
            errors.push('Name must be at least 2 characters long')
          }
          
          if (user.age < 0 || user.age > 120) {
            errors.push('Age must be between 0 and 120')
          }
          
          return { valid: errors.length === 0, errors }
        }
      }
      
      provide(factoryService, providerEndpoint)
      const remote = consume<typeof factoryService>(consumerEndpoint)
      
      // Test user creation
      const user = await remote.createUser('Alice', 30)
      expect(user.name).toBe('Alice')
      expect(user.age).toBe(30)
      expect(typeof user.id).toBe('number')
      expect(typeof user.createdAt).toBe('number')
      
      // Test product creation
      const product = await remote.createProduct('Gaming Laptop', 1299.99, 'Electronics')
      expect(product.name).toBe('Gaming Laptop')
      expect(product.price).toBe(1299.99)
      expect(product.category).toBe('Electronics')
      expect(product.sku).toBe('ELECTRONICS_GAMING_LAPTOP')
      
      // Test validation
      const validResult = await remote.validateUser({ name: 'Bob', age: 25 })
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)
      
      const invalidResult = await remote.validateUser({ name: 'X', age: -5 })
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors).toContain('Name must be at least 2 characters long')
      expect(invalidResult.errors).toContain('Age must be between 0 and 120')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const [providerEndpoint, consumerEndpoint] = createMockEndpointPair()
      
      const dataService = {
        processLargeArray(size: number): number[] {
          return Array.from({ length: size }, (_, i) => i * 2)
        },
        
        aggregateData(data: number[]): { sum: number; count: number; average: number; min: number; max: number } {
          if (data.length === 0) {
            return { sum: 0, count: 0, average: 0, min: 0, max: 0 }
          }
          
          const sum = data.reduce((a, b) => a + b, 0)
          return {
            sum,
            count: data.length,
            average: sum / data.length,
            min: Math.min(...data),
            max: Math.max(...data)
          }
        },
        
        chunkProcess(data: any[], chunkSize: number, processor: (chunk: any[]) => any): any[] {
          const results = []
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize)
            results.push(processor(chunk))
          }
          return results
        }
      }
      
      provide(dataService, providerEndpoint)
      const remote = consume<typeof dataService>(consumerEndpoint)
      
      // Test with moderately large dataset
      const startTime = Date.now()
      const largeArray = await remote.processLargeArray(10000)
      const processTime = Date.now() - startTime
      
      expect(largeArray).toHaveLength(10000)
      expect(largeArray[0]).toBe(0)
      expect(largeArray[9999]).toBe(19998)
      expect(processTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Test aggregation of large dataset
      const aggregateStart = Date.now()
      const stats = await remote.aggregateData(largeArray)
      const aggregateTime = Date.now() - aggregateStart
      
      expect(stats.count).toBe(10000)
      expect(stats.sum).toBe(99990000) // Sum of 0 + 2 + 4 + ... + 19998
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(19998)
      expect(aggregateTime).toBeLessThan(500)
    })

    it('should handle multiple concurrent remote objects', async () => {
      const endpoints = Array.from({ length: 5 }, () => createMockEndpointPair())
      
      const services = endpoints.map(([providerEndpoint, consumerEndpoint], index) => {
        const service = {
          id: index,
          multiply: (a: number, b: number) => a * b * (index + 1),
          getInfo: () => ({ serviceId: index, timestamp: Date.now() })
        }
        
        provide(service, providerEndpoint)
        return consume<typeof service>(consumerEndpoint)
      })
      
      // Test concurrent operations across multiple services
      const operations = services.map(async (service, index) => {
        const result = await service.multiply(2, 3)
        const info = await service.getInfo()
        return { serviceId: info.serviceId, result, expectedResult: 6 * (index + 1) }
      })
      
      const results = await Promise.all(operations)
      
      results.forEach(({ serviceId, result, expectedResult }) => {
        expect(serviceId).toBeGreaterThanOrEqual(0)
        expect(serviceId).toBeLessThan(5)
        expect(result).toBe(expectedResult)
      })
    })
  })
})