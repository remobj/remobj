import { isSymbol, WeakBiMap, onGarbageCollected } from "@remobj/shared"
import { realmId } from "./constants"
import { createMultiplexedEndpoint } from "./multiplex"
import { PostMessageEndpoint } from "./types"
import { devtools, getTraceID } from "./devtools"
import { createArgumentWrappingEndpoint } from "./rpc-wrapper"
import {
  Remote,
  RemoteCallRequest,
  RemoteCallResponse,
  ConsumeConfig
} from "./rpc-types"

// Constants for connection management
const PING_INTERVAL_MS = 60 * 1000 // 60 seconds

/**
 * Creates a proxy object that forwards all operations to a remote endpoint
 * @param endpoint - The PostMessage endpoint to communicate with
 * @param config - Configuration options for the consumer
 * @returns A proxied object that converts all operations to async RPC calls
 */
export function consume<T = any>(endpoint: PostMessageEndpoint, config: ConsumeConfig = {}): Remote<T> {
  const { timeout = 0, name = '' } = config
  const pendingPromises = new Map<string, { resolve: (data: any) => void, reject: (data: any) => void }>()
  const proxyCache = new WeakBiMap<string, any>()
  const consumerID: string = /*#__PURE__*/ crypto.randomUUID()
  const multiplexedEndpoint = /*#__PURE__*/ createArgumentWrappingEndpoint(createMultiplexedEndpoint(endpoint), name + ' -> ArgumentWrapper')
  const timeoutHandles = new Map<string, any>()

  const createPromise = (requestID: string, traceID: string) => {
    const p = new Promise((resolve, reject) => {
      let isSettled = false
      
      const cleanup = (): undefined => {
        if (isSettled) return
        isSettled = true
        
        const timeoutHandle = timeoutHandles.get(requestID)
        if (timeoutHandle) clearTimeout(timeoutHandle)
        pendingPromises.delete(requestID)
        timeoutHandles.delete(requestID)
      }

      pendingPromises.set(requestID, {
        resolve: (data) => {
          if (isSettled) return
          if ((__DEV__ || __PROD_DEVTOOLS__)) devtools(traceID, 'event', traceID, 'PROMISE', requestID, 'resolve', data)
          cleanup()
          resolve(data)
        },
        reject: (error) => {
          if (isSettled) return
          if ((__DEV__ || __PROD_DEVTOOLS__)) devtools(traceID, 'event', traceID, 'PROMISE', requestID, 'reject', error)
          cleanup()
          reject(error)
        }
      })

      if (timeout) {
        timeoutHandles.set(requestID, /*#__PURE__*/ setTimeout(
          () => {
            const pending = pendingPromises.get(requestID)
            if (pending && !isSettled) {
              pending.reject(/*#__PURE__*/ new Error(__DEV__ ? `Promise not resolved after timout of ${timeout} seconds. RequestID: ${requestID}` : `E002`))
            }
          },
          timeout * 1000
        ))
      }
    })
    p.then = p.then.bind(p)
    return p
  }

  const responseListener = (event: MessageEvent) => {
    const message: RemoteCallResponse = event.data
    
    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      const traceID = getTraceID(event.data)
      devtools(traceID, "event",  consumerID, 'CONSUMER', name, '' , message)
    }

    if (message.type === 'response') {
      const pendingPromise = pendingPromises.get(message.requestID)

      if (message.resultType === 'error') {
        return pendingPromise?.reject(message.result)
      } else if (message.resultType === 'result') {
        return pendingPromise?.resolve(message.result)
      }
    }
    return
  }

  multiplexedEndpoint.addEventListener('message', responseListener)

  const remoteCall = (
    operationType: RemoteCallRequest["operationType"],
    propertyPath: string,
    args: any[]
  ): Promise<any> => {
    const requestID = /*#__PURE__*/ crypto.randomUUID()

    const messageData: RemoteCallRequest = {
      requestID,
      operationType,
      propertyPath,
      args,
      consumerID,
      realmId
    }

    const traceID = getTraceID(messageData)
    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      devtools(traceID, "postMessage",  consumerID, 'CONSUMER', name, '' , messageData)
    }

    multiplexedEndpoint.postMessage(messageData)

    return createPromise(requestID, traceID)
  }

  const createProxy = (propertyPath: string): any => {
    const cachedProxy = proxyCache.get(propertyPath)
    if (cachedProxy) {
      return cachedProxy
    }

    const remoteProxy = /*#__PURE__*/ new Proxy(class { }, {
      get: (target, property, receiver) => {
        if (property === 'then') {
          if (!propertyPath) {
            return undefined;
          }
          // Return a thenable that performs the await operation
          return remoteCall('await', propertyPath, []).then
        } else {
          if (isSymbol(property)) {
            // Return undefined for symbols to prevent conversion errors
            return undefined
          }

          return createProxy(propertyPath + '/' + property)
        }
      },

      construct: (target, argumentsList, newTarget) => {
        return remoteCall('construct', propertyPath, argumentsList)
      },

      apply: (target, thisArg, argumentsList) => {
        return remoteCall('call', propertyPath, argumentsList)
      },

      set: (target, property, newValue, receiver) => {
        if (isSymbol(property)) return false

        remoteCall('set', propertyPath + '/' + property, [newValue])
        return true
      }
    })

    remoteCall('gc-register', '', [consumerID])

    proxyCache.set(propertyPath, /*#__PURE__*/ remoteProxy)
    onGarbageCollected(remoteProxy, () => { proxyCache.delete(propertyPath); return remoteCall('gc-collect', '', [consumerID]) })

    return remoteProxy
  }

  const pingInterval = setInterval(() => {
    return remoteCall('ping', '', []).catch(() => {
      // Connection lost, cleanup will happen via garbage collection
      return clearInterval(pingInterval)
    })
  }, PING_INTERVAL_MS)

  // Cleanup on garbage collection
  onGarbageCollected(remoteCall, () => {
    multiplexedEndpoint.removeEventListener('message', responseListener)
    pendingPromises.clear()
    proxyCache.clear()
    timeoutHandles.forEach((handle) => clearTimeout(handle))
    timeoutHandles.clear()
    clearInterval(pingInterval)
  })

  return createProxy('')
}

