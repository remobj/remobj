import { type PostMessageEndpoint, devtools, getTraceID } from '@remobj/core'
import { onGarbageCollected } from '@remobj/shared'

export interface NodeEndpoint {
  postMessage(message: any, transfer?: any[]): void;
  on(
    type: string,
    listener: (data: any) => void
  ): void;
  off(
    type: string,
    listener: (data: any) => void
  ): void;
}

const m = new WeakMap<(data: any) => void, (ev: MessageEvent) => void>()
function mapListener(listener: (data: any) => void): (ev: MessageEvent) => void {
  const ll = m.get(listener);
  if (ll) {return ll}

  const l = (ev: MessageEvent) => listener(ev.data)
  m.set(listener, l)
  return l
}


export const createNodeEndpoint = (worker: NodeEndpoint, name = ''): PostMessageEndpoint => {
  const webSocketEpID = /*#__PURE__*/ crypto.randomUUID()

  const ep: PostMessageEndpoint = {
    addEventListener: (type, listener) => worker.on(type, mapListener(listener)),
    removeEventListener: (type, listener) => worker.off(type, mapListener(listener)),
    postMessage: (data) => {
      if (__DEV__ || __PROD_DEVTOOLS__) {
        const traceID = getTraceID(data)
        devtools(traceID, 'postMessage', webSocketEpID, 'NODE', name, '', data)
      }
      return worker.postMessage(data)
    }
  }

  if (__DEV__ || __PROD_DEVTOOLS__) {
    const mainListener = (data: any) => {
      const traceID = getTraceID(data)
      devtools(traceID, 'event', webSocketEpID, 'NODE', name, '', data)
    }

    worker.on('message', mainListener)
    onGarbageCollected(ep, () => worker.off('message', mainListener))
  }

  return ep
}


