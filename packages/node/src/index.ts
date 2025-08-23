import { type Listener, type PostMessageEndpoint, devtools, getTraceID } from '@remobj/core'
import { onGarbageCollected } from '@remobj/shared'
import { WeakBiMap } from '@remobj/weakbimap'

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


export const createNodeWorkerEndpoint = (worker: NodeEndpoint, name = ''): PostMessageEndpoint => {
const webSocketEpID = /*#__PURE__*/ crypto.randomUUID()
  const listenerMap = /*#__PURE__*/ new WeakBiMap<Listener<any>, true>()

  const mainListener = (data: any) => {
    if(__DEV__ || __PROD_DEVTOOLS__) {
      const traceID = getTraceID(data)
      devtools(traceID, 'event', webSocketEpID, 'NODE', name, '', data)
    }

    const ev2 = /*#__PURE__*/ new MessageEvent('message', {data})
    listenerMap.forEach((_, l) => l(ev2))
  }

  worker.on('message', mainListener)

  const ep: PostMessageEndpoint = {
    addEventListener: (_type, listener) => listenerMap.set(listener, true),
    removeEventListener: (_type, listener) => listenerMap.delete(listener),
    postMessage: (data) => {
      if(__DEV__ || __PROD_DEVTOOLS__) {
        const traceID = getTraceID(data)
        devtools(traceID, 'postMessage', webSocketEpID, 'NODE', name, '', data)
      }
      return worker.postMessage(data)
    }
  }

  onGarbageCollected(ep, () => worker.off('message', mainListener))

  return ep
}


