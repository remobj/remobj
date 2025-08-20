import { describe, expect, it } from 'vitest'
import { consume,  provide } from '../src/index'

describe('object Reemit', () => {
  it('should JSON stringify outgoing messages', async () => {
    const {port1, port2} = new MessageChannel()
    class A {
      a() {
        return 42
      }
      c = 55
    }
    const api = {
      a: A,
      b(a: A) {
        expect(a.a()).toBe(42)
        return 55
      }
    }
    provide(api, port1 as any)
    const remote = consume<typeof api>(port2 as any)

    const instance = await (new remote.a())
    expect(await instance.c).toBe(55)
    console.log('=================')
    expect(await remote.b(instance)).toBe(55)
    
    port1.close()
    port2.close()
  })
})