import { describe, it, expect } from 'vitest'
import { 
  version, 
  realmId,
  wrapPostMessageEndpoint, 
  createJsonEndpoint, 
  createMultiplexedEndpoint,
  consume,
  PostMessageEndpoint,
  provide,
  Remote
} from '../src/index'

describe('@remobj/core', () => {
  describe('exports', () => {
    it('should export version information', () => {
      expect(typeof version).toBe('string')
      expect(version).toBe('test') // __VERSION__ is set to "test" in vitest config
    })

    it('should export realmId', () => {
      expect(typeof realmId).toBe('string')
      expect(realmId.length).toBeGreaterThan(0)
    })

    it('should export wrapPostMessageEndpoint function', () => {
      expect(typeof wrapPostMessageEndpoint).toBe('function')
    })

    it('should export createJsonEndpoint function', () => {
      expect(typeof createJsonEndpoint).toBe('function')
    })

    it('should export createMultiplexedEndpoint function', () => {
      expect(typeof createMultiplexedEndpoint).toBe('function')
    })
  })
})

describe('provide / consume', () => {
  describe('base', () => {
    it('base', async () => {
      const a = {
        a: 42,
        b: {c: 55},
        c: class A {
          a() {
            return 42
          }
        },
        d: (a:number, b: number) => a+b,
        e: (cb: () => void) => {
          cb()
        }
      }


      const {port1, port2} = new MessageChannel()
      

      provide(a, port2 as PostMessageEndpoint)

      const api = consume<typeof a>(port1 as PostMessageEndpoint)


      expect(await api.a).toBe(42)
      expect(await api.b.c).toBe(55)
      const b = await api.b
      expect(b.c).toBe(55)
      
      const instance = await new api.c()
      
      if (instance) {
        const result = await instance.a()
        expect(result).toBe(42)
      } else {
        throw new Error('Instance is null!')
      }
      
      expect(await api.d(21,20)).toBe(41)
    })

    it('simple class test', async () => {
      class TestClass {
        getValue() {
          return 123
        }
      }

      const obj = {
        TestClass
      }

      const {port1, port2} = new MessageChannel()
      provide(obj, port2 as PostMessageEndpoint)
      const api = consume<typeof obj>(port1 as PostMessageEndpoint)

      const instance = await new api.TestClass()
      
      // if (instance) {
        const value = await instance.getValue()
        expect(value).toBe(123)
      // }
    })

    
    it('extreme class test', async () => {
      class TestClass {
        getValue() {
          return 123
        }
      }

      const obj = {
        TestClass,
        a: (x: Remote<TestClass>) => {
          return x.getValue().then(v=>(v as any as number)*2)
        }
      }

      const {port1, port2} = new MessageChannel()
      provide(obj, port2 as PostMessageEndpoint)
      const api = consume<typeof obj>(port1 as PostMessageEndpoint)

      const instance = await new api.TestClass()
      
      // if (instance) {
        const value = await instance.getValue()
        expect(value).toBe(123)


        expect(await obj.a(instance)).toBe(246)
      // }
    })
  })
})