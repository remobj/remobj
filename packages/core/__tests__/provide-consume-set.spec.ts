import { describe, it } from 'vitest'
import type { PostMessageEndpoint } from '../src/index';
import { consume, provide } from '../src/index'

describe('provide/consume set operation', () => {
  it('should update values on remote objects', async () => {
    const api = {
      config: {
        debug: false,
        timeout: 1000,
        name: 'test'
      },
      counter: 0,
      updateConfig(key: string, value: any) {
        (api.config as any)[key] = value
      },
      setCounter(value: number) {
        api.counter = value
      }
    }

    const { port1, port2 } = new MessageChannel()
    provide(api, port2 as PostMessageEndpoint, {allowWrite: true})
    const remote = consume<typeof api>(port1 as PostMessageEndpoint);

    (remote as any).counter = 5;

    port1.close()
    port2.close()
  })
})