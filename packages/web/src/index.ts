/// <reference lib="dom" />
/// <reference lib="webworker" />
import type { PostMessageEndpoint } from '@remobj/core'
import { wrapEndpointDevtools } from '@remobj/core'


export const windowEndpoint = (
  w: Window
): PostMessageEndpoint => wrapEndpointDevtools({
  postMessage: (msg: any) => w.postMessage(msg, "*"),
  addEventListener: (type, listener) => w.addEventListener(type, listener),
  removeEventListener: (type, listener) => w.removeEventListener(type, listener),
}, 'WINDOW')

export const getServiceWorkerEndpoint = (): PostMessageEndpoint => wrapEndpointDevtools({
  postMessage: async (data) => (await navigator.serviceWorker.ready).active?.postMessage(data),
  addEventListener: (type, listener) => navigator.serviceWorker.addEventListener(type, listener),
  removeEventListener: (type, listener) => navigator.serviceWorker.removeEventListener(type, listener)
}, 'SW-OUTSIDE')

export const getServiceWorkerEndpoint2 = (self: ServiceWorkerGlobalScope, options?: ClientQueryOptions): PostMessageEndpoint => wrapEndpointDevtools({
  postMessage: async (data: any) => (await self.clients.matchAll(options)).forEach((client: Client) => client.postMessage(data)),
  addEventListener: (type, listener) => self.addEventListener(type, listener as any),
  removeEventListener: (type, listener) => self.removeEventListener(type, listener as any)
}, 'SW-INSIDE')