import { isArray, isClonable, isObject, isString, onGarbageCollected } from "@remobj/shared"
import { WeakBiMap } from "@remobj/weakbimap"
import type { Channel } from "./multiplex"
import { wrapPostMessageEndpoint } from "./wrap-endpoint"
import type { Plugins, RemoteCallRequest, RemoteCallResponse, WrappedArgument } from "./rpc-types"
import { provide } from "./rpc-provider"
import { consume } from "./rpc-consumer"
import type { PostMessageEndpoint } from "./types"

const plugins = new Map<keyof Plugins, { check: (v: unknown) => boolean, wrap: (v: any, wrap: (data: any) => WrappedArgument, unwrap: (data: WrappedArgument) => any) => any, unwrap: (v: any, wrap: (data: any) => WrappedArgument, unwrap: (data: WrappedArgument) => any) => any }>()

export const registerPlugin = <K extends keyof Plugins>(key: K, check: (v: unknown) => v is Plugins[K]['typeOriginal'], wrap: (v: Plugins[K]['typeOriginal'], wrap: (data: any) => WrappedArgument, unwrap: (data: WrappedArgument) => any) => Plugins[K]['transferType'], unwrap: (v: Plugins[K]['transferType'], wrap: (data: any) => WrappedArgument, unwrap: (data: WrappedArgument) => any) => Plugins[K]['returnType']): void => {
  return plugins.set(key, { check, wrap, unwrap }) as any as void
}

registerPlugin('Date', d => d instanceof Date, d => d.getTime(), d => new Date(d))

export function createArgumentWrappingEndpoint(endpoint: Channel<any>, name: string = ''): PostMessageEndpoint {
  const objectToIdMap = new WeakMap<any, string>()
  const idToProxyMap = new WeakBiMap<string, any>()
  const idToObjectMap = new WeakBiMap<string, any>()
  const proxyToIdMap = new WeakMap<any, string>()

  function wrapArgument(data: any): WrappedArgument {
    if (isClonable(data)) {
      return {
        type: 'raw',
        value: data
      }
    }
      for (const [name, h] of plugins) {
        if (h.check(data)) {
          const e = h.wrap(data, wrapArgument, unwrapArgument)
          return {
            type: name,
            value: e
          }
        }
      }

      let id = objectToIdMap.get(data)
      if (!id) {
        id = proxyToIdMap.get(data)
      }
      if (!id) {
        id = /*#__PURE__*/ crypto.randomUUID()
      }
      objectToIdMap.set(data, id)
      idToObjectMap.set(id, data)

      const channel = endpoint.createSubChannel(id)
      provide(data, channel, { name: id })

      return {
        type: 'wrapped',
        value: id
      }
    
  }

  function unwrapArgument(data: WrappedArgument): any {
    if (data.type === 'raw') {
      return data.value
    }
      const h = plugins.get(data.type as keyof Plugins)
      if (h) {
        const d = h.unwrap(data.value, wrapArgument, unwrapArgument)
        if (d) {return d}
      }

      // Handle wrapped type
      if (data.type === 'wrapped') {
        const channelId = data.value

        if (!isString(channelId)) {
          throw new Error(__DEV__ ? `Invalid channel ID: expected string, got ${typeof channelId}` : `E001`)
        }

        const cacheData = idToObjectMap.get(channelId)
        if (cacheData) {return cacheData}

        const cachedProxy = idToProxyMap.get(channelId)
        if (cachedProxy) {return cachedProxy}

        const channel = endpoint.createSubChannel(channelId)
        const proxy = consume(channel)

        if (proxy) {
          onGarbageCollected(proxy, channel.close)
          idToProxyMap.set(channelId, proxy)
          proxyToIdMap.set(proxy, channelId)
        }

        return proxy
      }

      // Return undefined for unknown types
      return undefined
    
  }

  function handleData(data: RemoteCallRequest | RemoteCallResponse, isOutgoing: boolean) {
    
    if ('type' in data && data.type === 'response' && data.resultType === 'result') {
      // Only process non-error results
      // If we're wrapping (provider side), wrap the result
      if (isOutgoing) {
        data.result = wrapArgument(data.result)
      }

      // If we're unwrapping (consumer side), check if result is wrapped
      else if (!isOutgoing && data.result && isObject(data.result) && 'type' in data.result && 'value' in data.result) {
        data.result = unwrapArgument(data.result as any as WrappedArgument)
      }
    }

    if ('args' in data && isArray(data.args)) {
      data.args = data.args.map(v => {
        if (isOutgoing) {
          // When sending, wrap all arguments
          return wrapArgument(v)
        }
          // When receiving, unwrap only if it's a wrapped argument
          if (isObject(v) && 'type' in v && 'value' in v) {
            return unwrapArgument(v as any as WrappedArgument)
          }
          return v;
        
      })
    }

    return data
  }

  return wrapPostMessageEndpoint(endpoint, data => handleData(data, true), data => handleData(data, false), 'ARGUMENTWRAPPING', name)
}