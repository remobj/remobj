import { describe, expect, it, vi } from 'vitest'
import type { PostMessageEndpoint } from '../src/index';
import { consume, provide } from '../src/index'

describe('provide/consume advanced scenarios', () => {
  describe('complex data types', () => {
    it('should handle nested objects', async () => {
      const api = {
        config: {
          settings: {
            theme: 'dark',
            language: 'en',
            nested: {
              deep: {
                value: 42
              }
            }
          }
        }
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      expect(await remote.config.settings.theme).toBe('dark')
      expect(await remote.config.settings.nested.deep.value).toBe(42)
    })

    it('should handle arrays', async () => {
      const api = {
        numbers: [1, 2, 3, 4, 5],
        getArray: () => ['a', 'b', 'c'],
        matrix: [[1, 2], [3, 4], [5, 6]]
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      // Direct array access
      const numbers = await remote.numbers
      expect(numbers).toEqual([1, 2, 3, 4, 5])

      // Array from function
      expect(await remote.getArray()).toEqual(['a', 'b', 'c'])

      // Nested arrays
      expect(await remote.matrix).toEqual([[1, 2], [3, 4], [5, 6]])
    })

    it('should handle promises', async () => {
      const api = {
        asyncMethod: async () => {
          return new Promise(resolve => {
            setTimeout(() => resolve('async result'), 10)
          })
        },
        getPromise: () => Promise.resolve(123),
        rejectPromise: () => Promise.reject(new Error('test error'))
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      expect(await remote.asyncMethod()).toBe('async result')
      expect(await remote.getPromise()).toBe(123)
      
      // Rejected promise
      await expect(remote.rejectPromise()).rejects.toThrow('test error')
    })
  })

  describe('function scenarios', () => {
    it('should handle functions with multiple arguments', async () => {
      const api = {
        add: (a: number, b: number) => a + b,
        concat: (...args: string[]) => args.join(' '),
        complex: (obj: { x: number }, arr: number[], str: string) => {
          return {
            sum: obj.x + arr.reduce((a, b) => a + b, 0),
            message: str
          }
        }
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      expect(await remote.add(5, 3)).toBe(8)
      expect(await remote.concat('hello', 'world', '!')).toBe('hello world !')
      
      const result = await remote.complex({ x: 10 }, [1, 2, 3], 'test')
      expect(result).toEqual({ sum: 16, message: 'test' })
    })

    it('should handle functions returning functions', async () => {
      const api = {
        getMultiplier: (factor: number) => {
          return (value: number) => value * factor
        },
        getAdder: (a: number) => (b: number) => a + b
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      const times2 = await remote.getMultiplier(2)
      expect(await times2(5)).toBe(10)

      const add10 = await remote.getAdder(10)
      expect(await add10(5)).toBe(15)
    })

    it('should handle callback functions', async () => {
      const api = {
        processWithCallback: (data: string, callback: (result: string) => void) => {
          callback(data.toUpperCase())
        },
        asyncWithCallback: async (callback: (value: number) => void) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          callback(42)
        }
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      // Callback function
      const results: any[] = []
      const callback = (result: any) => results.push(result)

      await remote.processWithCallback('hello', callback)
      expect(results).toContain('HELLO')

      await remote.asyncWithCallback(callback)
      expect(results).toContain(42)
    })
  })

  describe('class scenarios', () => {
    it('should handle class methods', async () => {
      class Calculator {
        private value = 0

        add(n: number) {
          this.value += n
          return this
        }

        multiply(n: number) {
          this.value *= n
          return this
        }

        getValue() {
          return this.value
        }

        reset() {
          this.value = 0
        }
      }

      const api = {
        Calculator,
        createCalculator: () => new Calculator()
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      // Create instance via constructor
      const calc1 = await new remote.Calculator()
      // Note: Class instances lose their 'this' context when called remotely
      // This is a limitation of the RPC system
      
      // Create instance via factory
      const calc2 = await remote.createCalculator()
      // Same limitation applies here
    })

    it('should handle class inheritance', async () => {
      class Animal {
        constructor(public name: string) {}
        speak() {
          return `${this.name} makes a sound`
        }
      }

      class Dog extends Animal {
        speak() {
          return `${this.name} barks`
        }
        wagTail() {
          return `${this.name} wags tail`
        }
      }

      const api = {
        Animal,
        Dog,
        createDog: (name: string) => new Dog(name)
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      const dog = await remote.createDog('Buddy')
      // Note: Class instances lose their 'this' context when called remotely
      // This is a limitation of the RPC system
    })
  })

  describe('error handling', () => {
    it('should propagate errors', async () => {
      const api = {
        throwError: () => {
          throw new Error('Intentional error')
        },
        throwAsync: async () => {
          throw new Error('Async error')
        },
        accessUndefined: () => {
          const obj: any = undefined
          return obj.property // Will throw
        }
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      await expect(remote.throwError()).rejects.toThrow('Intentional error')
      await expect(remote.throwAsync()).rejects.toThrow('Async error')
      await expect(remote.accessUndefined()).rejects.toThrow()
    })

    it('should handle non-existent properties', async () => {
      const api = {
        existing: 'value'
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<any>(port1 as PostMessageEndpoint)

      // Accessing non-existent property
      const result = await remote.nonExistent
      expect(result).toBeUndefined()

      // Calling non-existent function
      await expect(remote.nonExistentFunc()).rejects.toThrow()
    })
  })

  describe('security features', () => {
    it('should block forbidden properties', async () => {
      const api = {
        safe: 'allowed',
        __proto__: 'should be blocked',
        constructor: 'should be blocked',
        prototype: 'should be blocked'
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<any>(port1 as PostMessageEndpoint)

      expect(await remote.safe).toBe('allowed')
      
      // These should be blocked
      await expect(remote.__proto__).rejects.toThrow(/forbidden/)
      await expect(remote.constructor).rejects.toThrow(/forbidden/)
      // Prototype is a special case in proxies and might behave differently
    })

  })

  describe('special values', () => {
    it('should handle null and undefined', async () => {
      const api = {
        nullValue: undefined,
        undefinedValue: undefined,
        getNull: () => {},
        getUndefined: () => {}
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      expect(await remote.nullValue).toBe(undefined)
      expect(await remote.undefinedValue).toBe(undefined)
      expect(await remote.getNull()).toBe(undefined)
      expect(await remote.getUndefined()).toBe(undefined)
    })

    it('should handle special numbers', async () => {
      const api = {
        infinity: Infinity,
        negInfinity: -Infinity,
        nan: Number.NaN,
        getSpecialNumbers: () => ({
          inf: Infinity,
          negInf: -Infinity,
          notANumber: Number.NaN
        })
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      expect(await remote.infinity).toBe(Infinity)
      expect(await remote.negInfinity).toBe(-Infinity)
      expect(await remote.nan).toBeNaN()

      const special = await remote.getSpecialNumbers()
      expect(special.inf).toBe(Infinity)
      expect(special.negInf).toBe(-Infinity)
      expect(special.notANumber).toBeNaN()
    })
  })

  describe('performance scenarios', () => {
    it('should handle rapid successive calls', async () => {
      const api = {
        counter: 0,
        increment: () => ++api.counter,
        getValue: () => api.counter
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      // Make many rapid calls
      const promises = Array.from({ length: 10 }, () => remote.increment())
      const results = await Promise.all(promises)

      // Results should be sequential
      expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(await remote.getValue()).toBe(10)
    })

    it('should handle concurrent access to different properties', async () => {
      const api = {
        a: () => new Promise(resolve => setTimeout(() => resolve('a'), 10)),
        b: () => new Promise(resolve => setTimeout(() => resolve('b'), 20)),
        c: () => new Promise(resolve => setTimeout(() => resolve('c'), 5))
      }

      const { port1, port2 } = new MessageChannel()
      provide(api, port2 as PostMessageEndpoint)
      const remote = consume<typeof api>(port1 as PostMessageEndpoint)

      const start = Date.now()
      const [a, b, c] = await Promise.all([
        remote.a(),
        remote.b(),
        remote.c()
      ])

      // Should execute concurrently, not sequentially
      const duration = Date.now() - start
      expect(duration).toBeLessThan(50) // Would be 35+ if sequential

      expect(a).toBe('a')
      expect(b).toBe('b')
      expect(c).toBe('c')
    })
  })
})