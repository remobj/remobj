/// <reference lib="dom" />
/// <reference lib="webworker" />
import { createSendingEndpoint, type PostMessageEndpoint, wrapEndpointDevtools } from '@remobj/core'

function defineEndpoint<T extends EventTarget, O = undefined>(type: string, postMessage: (ep: T, data: any, options?: O) => void): (base: T, name?: string, options?: O) => PostMessageEndpoint {
  return (ep, name = '', options) => {
    return wrapEndpointDevtools({
      postMessage: (msg: any) => postMessage(ep, msg, options),
      addEventListener: (type, listener) => ep.addEventListener(type, listener as any),
      removeEventListener: (type, listener) => ep.removeEventListener(type, listener as any),
    }, type, name)
  }
}

export const windowEndpoint: (ep: Window, name: string) => PostMessageEndpoint = defineEndpoint<Window>('WINDOW', (ep, data) => ep.postMessage(data, '*'))
const _getServiceWorkerEndpoint: (ep: undefined, name: string) => PostMessageEndpoint = defineEndpoint<never>('SW-OUTSIDE', async (_, data) => {
  const serviceWorker = await navigator.serviceWorker.ready
  return serviceWorker.active?.postMessage(data)
}) as any


export const getServiceWorkerEndpoint = (name = ''): PostMessageEndpoint => _getServiceWorkerEndpoint(undefined, name)

export const getServiceWorkerInternalEndpoint: (self: ServiceWorkerGlobalScope, name?: string, options?: ClientQueryOptions) => PostMessageEndpoint = defineEndpoint<ServiceWorkerGlobalScope, ClientQueryOptions>('SW-INSIDE', async (ep, data, options) => {
  const clients = await ep.clients.matchAll(options)
  clients.forEach((client: Client) => client.postMessage(data))
})
export const createRTCEndpoint = (ws: RTCDataChannel, name = ''): PostMessageEndpoint => createSendingEndpoint(ws, 'RTCDataChannel', name)
