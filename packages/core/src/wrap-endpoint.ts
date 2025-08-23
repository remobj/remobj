import { onGarbageCollected } from "@remobj/shared"
import { WeakBiMap } from "@remobj/weakbimap"
import { devtools, getTraceID } from "./devtools.js"
import type { Listener, PostMessageEndpoint, PostMessageEndpointBase } from "./types.js"

/**
 * Creates a wrapped PostMessageEndpoint that transforms data using provided functions
 * 
 * @template TInput - The input data type for postMessage
 * @template TOutput - The output data type from MessageEvent
 * @param endpoint - The base endpoint to wrap
 * @param serializeOutgoing - Function to transform outgoing postMessage data
 * @param deserializeIncoming - Function to transform incoming MessageEvent data
 * @returns A wrapped endpoint with transformed data flow
 * 
 * @__NO_SIDE_EFFECTS__
 * 
 * @example
 * ```typescript
 * const wrappedEndpoint = wrapPostMessageEndpoint(
 *   originalEndpoint,
 *   (data) => JSON.stringify(data),           // Serialize outgoing data
 *   (event) => JSON.parse(event.data)        // Parse incoming data
 * )
 * 
 * wrappedEndpoint.postMessage({ hello: 'world' }) // Sends '{"hello":"world"}'
 * wrappedEndpoint.addEventListener('message', (ev) => {
 *   console.log(ev.data) // Already parsed object: { hello: 'world' }
 * })
 * ```
 */
export const wrapPostMessageEndpoint = <TThisRealm, TThatRealm>(
  endpoint: PostMessageEndpointBase<TThatRealm>,
  serializeOutgoing: (data: TThisRealm) => TThatRealm = (data: any) => data,
  deserializeIncoming: (data: TThatRealm) => TThisRealm = (data: any) => data,
  type: string = '',
  name: string = ''
): PostMessageEndpointBase<TThisRealm> => {
  const activeListeners = new WeakBiMap<Listener<TThisRealm>, true>()
  const wrapperID = /*#__PURE__*/ crypto.randomUUID();


  const incomingMessageHandler = (event: MessageEvent) => {
    const data = deserializeIncoming(event.data)
    const transformedEvent = new MessageEvent('message', { data })
    
    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      const traceID = getTraceID(event.data, data)
      devtools(traceID, "event", wrapperID, type, name, "predeserialize", event.data)
      devtools(traceID, "event", wrapperID, type, name, "deserialized", data)
    }

    activeListeners.forEach((_: true, listener: Listener<TThisRealm>) => listener(transformedEvent))
  }

  endpoint.addEventListener('message', incomingMessageHandler)


  const wrappedEndpoint = {
    postMessage: (data: TThisRealm): void => {
      const serializedData = serializeOutgoing(data)
      
      if ((__DEV__ || __PROD_DEVTOOLS__)) {
        const traceID = getTraceID(data, serializedData)
        devtools(traceID, "postMessage", wrapperID, type, name, "preserialised", data)
        devtools(traceID, "postMessage", wrapperID, type, name, "serialised", serializedData) 
      }

      return endpoint.postMessage(serializedData)
    },

    addEventListener: (type: 'message', listener: Listener<TThisRealm>): void => activeListeners.set(listener, true) as any,
    removeEventListener: (type: 'message', listener: Listener<TThisRealm>): void => activeListeners.delete(listener) as any
  } as const

  if (__DEV__) {
    Object.freeze(wrappedEndpoint)
  }

  onGarbageCollected(wrappedEndpoint, () => endpoint.removeEventListener('message', incomingMessageHandler))

  return wrappedEndpoint
}

/**
 * Converts a PostMessageEndpointString to a PostMessageEndpoint by using JSON serialization/deserialization
 * 
 * @param stringEndpoint - The string-based endpoint to convert
 * @returns A PostMessageEndpoint that accepts any data and converts it to/from JSON strings
 * 
 * @__NO_SIDE_EFFECTS__
 * 
 * @example
 * ```typescript
 * const stringEndpoint: PostMessageEndpointString = getStringEndpoint()
 * const jsonEndpoint = createJsonEndpoint(stringEndpoint)
 * 
 * // Send any data - it will be JSON.stringify'd automatically
 * jsonEndpoint.postMessage({ hello: 'world', count: 42 })
 * 
 * // Receive parsed objects automatically
 * jsonEndpoint.addEventListener('message', (event) => {
 *   console.log(event.data) // Already parsed: { hello: 'world', count: 42 }
 * })
 * ```
 */
export const createJsonEndpoint = (
  stringEndpoint: PostMessageEndpointBase<string>,
  name: string = ''
): PostMessageEndpointBase<any> => {
  return /*#__PURE__*/ wrapPostMessageEndpoint(
    stringEndpoint,
    JSON.stringify,
    JSON.parse,
    'JSON-ENDPOINT',
    name
  )
}

export const connectEndpoints = (ep1: PostMessageEndpoint, ep2: PostMessageEndpoint): void => {
  ep1.addEventListener('message', ev => ep2.postMessage(ev.data))
  return ep2.addEventListener('message', ev => ep1.postMessage(ev.data))
}


export const createWebsocketEndpoint = (ws: WebSocket, name: string = ''): PostMessageEndpoint => {
  const webSocketEpID = /*#__PURE__*/ crypto.randomUUID()
  const listenerMap = /*#__PURE__*/ new WeakBiMap<Listener<any>, true>()

  const mainListener = (ev: MessageEvent) => {
    const data = /*#__PURE__*/ JSON.parse(ev.data)

    if(__DEV__ || __PROD_DEVTOOLS__) {
      const traceID = getTraceID(data)
      devtools(traceID, 'event', webSocketEpID, 'WEBSOCKET', name, '', data)
    }

    const ev2 = /*#__PURE__*/ new MessageEvent('message', {data})
    listenerMap.forEach((_, l) => l(ev2))
  }

  ws.addEventListener('message', mainListener)

  const ep: PostMessageEndpoint = {
    addEventListener: (_type, listener) => listenerMap.set(listener, true),
    removeEventListener: (_type, listener) => listenerMap.delete(listener),
    postMessage: (data) => {
      if(__DEV__ || __PROD_DEVTOOLS__) {
        const traceID = getTraceID(data)
        devtools(traceID, 'postMessage', webSocketEpID, 'WEBSOCKET', name, '', data)
      }
      return ws.send(JSON.stringify(data))
    }
  }

  onGarbageCollected(ep, () => ws.removeEventListener('message', mainListener))

  return ep
}
