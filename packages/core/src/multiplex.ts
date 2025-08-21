import { onGarbageCollected } from "@remobj/shared"
import { WeakBiMap } from "@remobj/weakbimap"
import { devtools, getTraceID } from "./devtools.js"
import type { Listener, PostMessageEndpointBase } from "./types.js"

interface MultiplexedMessage<T = unknown> {
  channelId: string
  data: T
}

export interface Channel<T> extends PostMessageEndpointBase<T> {
  id: string
  createSubChannel: <U>(subId: string, name?: string) => Channel<U>
  close: () => void
}

const endpointToRootChannel = new WeakBiMap<PostMessageEndpointBase<any>, Channel<any>>()

/**
 * Creates a multiplexed endpoint that allows multiple channels over a single PostMessageEndpoint
 * 
 * @param baseEndpoint - The base endpoint to multiplex
 * @param name - Optional name for debugging
 * @returns The root channel for creating sub-channels
 * 
 * @__NO_SIDE_EFFECTS__
 * 
 * @example
 * ```typescript
 * const mux = createMultiplexedEndpoint(endpoint, 'MyApp')
 * 
 * // Create main channel
 * const mainChannel = mux.createSubChannel<MainData>('main')
 * 
 * // Create sub-channel
 * const configChannel = mainChannel.createSubChannel<ConfigData>('config')
 * 
 * // Send and receive messages
 * configChannel.postMessage({ setting: 'value' })
 * configChannel.addEventListener('message', (event) => {
 *   console.log('Config:', event.data)
 * })
 * ```
 */
export const createMultiplexedEndpoint = (
  baseEndpoint: PostMessageEndpointBase<any>,
  name: string = ''
): Channel<any> => {
  const existingChannelRef = endpointToRootChannel.get(baseEndpoint);
  if (existingChannelRef) {
    return existingChannelRef
  }
  const channelRegistry = new WeakBiMap<string, Channel<any>>()
  const channelListeners = new Map<string, Set<Listener<any>>>()

  const multiplexerID = (__DEV__ || __PROD_DEVTOOLS__) ? /*#__PURE__*/ crypto.randomUUID() : ''


  const mainListener = (event: MessageEvent): void => {
    const { channelId, data } = event.data as MultiplexedMessage
    
    if (__DEV__ || __PROD_DEVTOOLS__) {
      const traceID = getTraceID(data, event.data)
      devtools(traceID, 'event', multiplexerID, 'CHANNEL', name, `${channelId} -> pre`, event.data)
      devtools(traceID, 'event', multiplexerID, 'CHANNEL', name, channelId, data)
    }

    const channelEvent = new MessageEvent('message', { data })
    channelListeners.get(channelId)?.forEach(listener => listener(channelEvent))
  }

  // Register demultiplexer
  baseEndpoint.addEventListener('message', mainListener)

  // Channel Factory
  const createChannel = <T>(channelId: string): Channel<T> => {
    const existingRef = channelRegistry.get(channelId)
    if (existingRef) {
      return existingRef;
    }

    channelListeners.set(channelId, new Set())

    const channel: Channel<T> = {
      id: channelId,

      createSubChannel: <U>(subId: string) => createChannel<U>(`${channelId}/${subId}`),

      postMessage: (data: T) => {
        const channelData = { channelId, data }
        
        if (__DEV__ || __PROD_DEVTOOLS__) {
          const traceID = getTraceID(data, channelData)
          devtools(traceID, "postMessage", multiplexerID, 'CHANNEL', name, `${channelId} -> pre`, data)
          devtools(traceID, "postMessage", multiplexerID, 'CHANNEL', name, channelId, data)
        }

        return baseEndpoint.postMessage(channelData)
      },

      addEventListener: (type: 'message', listener: Listener<T>) => channelListeners.get(channelId)?.add(listener as Listener<any>),
      removeEventListener: (type: 'message', listener: Listener<T>) => channelListeners.get(channelId)?.delete(listener as Listener<any>),
      // Sub-channels are intentionally not deleted as they may still be needed
      close: () => channelListeners.delete(channelId)
    }

    channelRegistry.set(channelId, channel)
    endpointToRootChannel.set(channel, channel)

    return channel
  }

  onGarbageCollected(createChannel, () => {
    baseEndpoint.removeEventListener('message', mainListener)
    channelRegistry.clear()
    channelListeners.clear()
    endpointToRootChannel.delete(baseEndpoint)
  })

  const rootChannel = createChannel('')
  endpointToRootChannel.set(baseEndpoint, rootChannel)


  return rootChannel
}