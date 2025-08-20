# Explizite Cleanup-API

## Übersicht

Die explizite Cleanup-API bietet eine zuverlässige Alternative zur FinalizationRegistry-basierten Garbage Collection. Sie gibt Entwicklern die volle Kontrolle über die Ressourcenverwaltung und verhindert Memory Leaks durch nicht entfernte Event Listener.

## Problem

Die aktuelle Implementierung verlässt sich auf FinalizationRegistry:

```typescript
// Aktuell - unzuverlässig
onGarbageCollected(remoteCall, () => {
  multiplexedEndpoint.removeEventListener('message', responseListener)
  pendingPromises.clear()
  proxyCache.clear()
  timeoutHandles.forEach((handle) => clearTimeout(handle))
  timeoutHandles.clear()
})
```

### Warum ist FinalizationRegistry unzuverlässig?

1. **Keine Ausführungsgarantie**: 
   - Die Spezifikation garantiert NICHT, dass Finalizer jemals ausgeführt werden
   - Bei Programmbeendigung werden Finalizer übersprungen
   - Bei hohem Memory-Druck kann die Ausführung beliebig verzögert werden

2. **Nicht-deterministisches Timing**:
   - Finalizer laufen erst NACH der Garbage Collection
   - GC-Zeitpunkt ist nicht vorhersagbar und plattformabhängig
   - Kann Sekunden, Minuten oder nie erfolgen

3. **Platform-Unterschiede**:
   - Verschiedene JavaScript-Engines haben unterschiedliche GC-Strategien
   - V8 (Chrome/Node.js) vs SpiderMonkey (Firefox) vs JavaScriptCore (Safari)
   - Mobile Browser haben aggressivere Memory-Limits

4. **Zirkuläre Referenzen**:
   - Objekte mit zirkulären Referenzen werden möglicherweise nie collected
   - Event Listener erzeugen oft unbeabsichtigte Referenzen
   - Closures können versteckte Referenzen halten

5. **Testing-Probleme**:
   - Tests können GC nicht zuverlässig triggern
   - `global.gc()` ist nicht standardisiert
   - Memory Leaks werden in Tests oft nicht erkannt

### Konkrete Probleme in der RPC-Implementierung:

```typescript
// Problem 1: Event Listener Leak
multiplexedEndpoint.addEventListener('message', responseListener)
// responseListener wird NIE entfernt wenn FinalizationRegistry nicht läuft

// Problem 2: Pending Promises
pendingPromises.set(requestID, { resolve, reject })
// Promises bleiben forever pending, blockieren potenziell andere Code-Pfade

// Problem 3: Timeout Handles  
timeoutHandles.set(requestID, setTimeout(...))
// Timer laufen weiter und verbrauchen CPU/Memory

// Problem 4: Proxy Cache
proxyCache.set(propertyPath, remoteProxy)
// Proxies akkumulieren und verhindern GC von referenzierten Objekten
```

### Reale Konsequenzen:

1. **Memory Leaks in Long-Running Applications**:
   - Server-Anwendungen die wochenlang laufen
   - Single-Page Applications mit vielen Navigationen
   - Electron-Apps mit begrenztem Memory

2. **Performance-Degradation**:
   - Immer mehr Event Listener verlangsamen Message-Processing
   - Wachsende Maps/Sets erhöhen Lookup-Zeiten
   - Nicht gecleanupte Timer verbrauchen CPU

3. **Schwer zu debuggende Fehler**:
   - "Maximum call stack exceeded" durch zu viele Listener
   - "Out of Memory" Errors nach Stunden/Tagen
   - Sporadische Test-Failures

## Lösung

### 1. Handle-Interface

```typescript
// packages/core/src/rpc-handle.ts
export interface Disposable {
  /** Cleanup all resources */
  dispose(): void
  /** Check if already disposed */
  readonly disposed: boolean
}

export interface ConsumerHandle<T> extends Disposable {
  /** The remote proxy object */
  readonly proxy: Remote<T>
  /** Dispose and cleanup all resources */
  dispose(): void
  /** Check if handle is disposed */
  readonly disposed: boolean
  /** Event emitter for handle events */
  readonly events: HandleEventEmitter
}

export interface ProviderHandle extends Disposable {
  /** Unique provider ID */
  readonly id: string
  /** Dispose and cleanup all resources */
  dispose(): void
  /** Check if handle is disposed */
  readonly disposed: boolean
  /** Statistics about provided calls */
  readonly stats: ProviderStats
}

export interface HandleEventEmitter {
  on(event: 'dispose', listener: () => void): void
  on(event: 'error', listener: (error: Error) => void): void
  on(event: 'timeout', listener: (requestId: string) => void): void
  off(event: string, listener: Function): void
  once(event: string, listener: Function): void
}

export interface ProviderStats {
  /** Total number of requests received */
  requestsReceived: number
  /** Total number of successful responses */
  responsesSuccessful: number
  /** Total number of error responses */
  responsesError: number
  /** Average response time in ms */
  avgResponseTime: number
}
```

### 2. Consumer mit Handle

```typescript
// packages/core/src/rpc-consumer-handle.ts
import { Remote, ConsumeConfig } from './rpc-types'
import { ConsumerHandle, HandleEventEmitter } from './rpc-handle'
import { createArgumentWrappingEndpoint } from './rpc-wrapper'
import { createMultiplexedEndpoint } from './multiplex'
import { PostMessageEndpoint } from './types'

class ConsumerHandleImpl<T> implements ConsumerHandle<T> {
  private _disposed = false
  private _proxy: Remote<T>
  private _cleanup: () => void
  private _eventEmitter: HandleEventEmitter

  constructor(proxy: Remote<T>, cleanup: () => void) {
    this._proxy = proxy
    this._cleanup = cleanup
    this._eventEmitter = new EventEmitter()
  }

  get proxy(): Remote<T> {
    if (this._disposed) {
      throw new Error('ConsumerHandle has been disposed')
    }
    return this._proxy
  }

  get disposed(): boolean {
    return this._disposed
  }

  get events(): HandleEventEmitter {
    return this._eventEmitter
  }

  dispose(): void {
    if (this._disposed) return
    
    this._disposed = true
    try {
      this._cleanup()
      this._eventEmitter.emit('dispose')
    } catch (error) {
      this._eventEmitter.emit('error', error)
      throw error
    } finally {
      // Clear all event listeners
      this._eventEmitter.removeAllListeners()
    }
  }
}

export function consumeWithHandle<T = any>(
  endpoint: PostMessageEndpoint,
  config: ConsumeConfig = {}
): ConsumerHandle<T> {
  const { 
    timeout = 0, 
    name = (__DEV__ || __PROD_DEVTOOLS__) ? getCaller() : '' 
  } = config
  
  const pendingPromises = new Map<string, {
    resolve: (data: any) => void
    reject: (data: any) => void
  }>()
  const proxyCache = new StringKeyWeakMap<any>()
  const consumerID = crypto.randomUUID()
  const multiplexedEndpoint = createArgumentWrappingEndpoint(
    createMultiplexedEndpoint(endpoint)
  )
  const timeoutHandles = new Map<string, any>()
  const eventEmitter = new EventEmitter()

  // Response listener
  const responseListener = (event: MessageEvent) => {
    const message: RemoteCallResponse = event.data
    
    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      devtools("in", consumerID, 'CONSUMER', name, message)
    }
    
    const dataWithStack = (__DEV__ || __PROD_DEVTOOLS__) ? 
      addStack('CONSUMER', name, consumerID, message) : 
      message

    if (dataWithStack.type === 'response') {
      const pendingPromise = pendingPromises.get(dataWithStack.requestID)
      
      if (pendingPromise) {
        if (dataWithStack.resultType === 'error') {
          pendingPromise.reject(dataWithStack.result)
        } else if (dataWithStack.resultType === 'result') {
          pendingPromise.resolve(dataWithStack.result)
        }
      }
    }
  }

  multiplexedEndpoint.addEventListener('message', responseListener)

  // Create promise with timeout
  const createPromise = (requestID: string) => new Promise((resolve, reject) => {
    const cleanup = () => {
      pendingPromises.delete(requestID)
      const timeoutHandle = timeoutHandles.get(requestID)
      timeoutHandles.delete(requestID)
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
    
    pendingPromises.set(requestID, {
      resolve: (data) => {
        cleanup()
        return resolve(data)
      },
      reject: (error) => {
        cleanup()
        return reject(error)
      }
    })

    if (timeout) {
      const timeoutHandle = setTimeout(() => {
        const pending = pendingPromises.get(requestID)
        if (pending) {
          eventEmitter.emit('timeout', requestID)
          pending.reject(new Error('TimeOut'))
        }
      }, timeout * 1000)
      timeoutHandles.set(requestID, timeoutHandle)
    }
  })

  // Remote call function
  const remoteCall = (
    operationType: "call" | "construct" | "set" | "await",
    propertyPath: string,
    args: any[]
  ): Promise<any> => {
    if (handle.disposed) {
      return Promise.reject(new Error('ConsumerHandle has been disposed'))
    }
    
    const requestID = crypto.randomUUID()
    const messageData: RemoteCallRequest = {
      requestID,
      operationType,
      propertyPath,
      args,
      consumerID,
      realmID
    }

    const dataWithStack = (__DEV__ || __PROD_DEVTOOLS__) ?
      addStack('CONSUMER', operationType, consumerID, messageData) :
      messageData

    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      devtools("out", consumerID, 'CONSUMER', operationType, dataWithStack)
    }

    multiplexedEndpoint.postMessage(dataWithStack)
    return createPromise(requestID)
  }

  // Create proxy factory
  const createProxy = (propertyPath: string): any => {
    if (handle.disposed) {
      throw new Error('ConsumerHandle has been disposed')
    }
    
    const cachedProxy = proxyCache.get(propertyPath)
    if (cachedProxy) {
      return cachedProxy
    }

    const remoteProxy = new Proxy(class { }, {
      get(target, property, receiver) {
        if (isSymbol(property)) return null
        if (property === 'then') {
          return remoteCall('await', propertyPath, []).then
        } else {
          return createProxy(propertyPath + '/' + property)
        }
      },
      construct(target, argumentsList, newTarget) {
        return remoteCall('construct', propertyPath, argumentsList)
      },
      apply(target, thisArg, argumentsList) {
        return remoteCall('call', propertyPath, argumentsList)
      },
      set(target, property, newValue, receiver) {
        if (isSymbol(property)) return false
        remoteCall('set', propertyPath + '/' + property, [newValue])
        return false
      }
    })

    proxyCache.set(propertyPath, remoteProxy)
    return remoteProxy
  }

  // Cleanup function
  const cleanup = () => {
    // Remove event listener
    multiplexedEndpoint.removeEventListener('message', responseListener)
    
    // Reject all pending promises
    for (const [requestId, promise] of pendingPromises) {
      promise.reject(new Error('ConsumerHandle disposed'))
    }
    pendingPromises.clear()
    
    // Clear proxy cache
    proxyCache.clear()
    
    // Clear all timeouts
    for (const handle of timeoutHandles.values()) {
      clearTimeout(handle)
    }
    timeoutHandles.clear()
  }

  // Create proxy and handle
  const proxy = createProxy('')
  const handle = new ConsumerHandleImpl<T>(proxy, cleanup)
  
  // Attach event emitter
  Object.defineProperty(handle, 'events', {
    value: eventEmitter,
    writable: false,
    configurable: false
  })
  
  return handle
}
```

### 3. Provider mit Handle

```typescript
// packages/core/src/rpc-provider-handle.ts
import { ProvideConfig } from './rpc-types'
import { ProviderHandle, ProviderStats } from './rpc-handle'
import { PostMessageEndpoint } from './types'

class ProviderHandleImpl implements ProviderHandle {
  private _disposed = false
  private _cleanup: () => void
  private _stats: ProviderStats = {
    requestsReceived: 0,
    responsesSuccessful: 0,
    responsesError: 0,
    avgResponseTime: 0
  }

  constructor(
    public readonly id: string,
    cleanup: () => void
  ) {
    this._cleanup = cleanup
  }

  get disposed(): boolean {
    return this._disposed
  }

  get stats(): ProviderStats {
    return { ...this._stats }
  }

  updateStats(success: boolean, responseTime: number): void {
    this._stats.requestsReceived++
    if (success) {
      this._stats.responsesSuccessful++
    } else {
      this._stats.responsesError++
    }
    
    // Update average response time
    const total = this._stats.responsesSuccessful + this._stats.responsesError
    this._stats.avgResponseTime = 
      (this._stats.avgResponseTime * (total - 1) + responseTime) / total
  }

  dispose(): void {
    if (this._disposed) return
    
    this._disposed = true
    this._cleanup()
  }
}

export function provideWithHandle(
  data: any,
  endpoint: PostMessageEndpoint,
  config: ProvideConfig = {}
): ProviderHandle {
  const { 
    allowWrite = false, 
    name = (__DEV__ || __PROD_DEVTOOLS__) ? getCaller() : '' 
  } = config
  
  const providerID = crypto.randomUUID()
  const multiplexedEndpoint = createArgumentWrappingEndpoint(
    createMultiplexedEndpoint(endpoint)
  )
  const handle = new ProviderHandleImpl(providerID, () => {
    multiplexedEndpoint.removeEventListener('message', messageListener)
  })

  const messageListener = async (event: MessageEvent) => {
    if (handle.disposed) return
    
    const startTime = performance.now()
    const messageData: RemoteCallRequest = event.data
    
    if ((__DEV__ || __PROD_DEVTOOLS__)) {
      devtools("in", providerID, 'PROVIDER', name, messageData)
    }

    const dataWithStack = (__DEV__ || __PROD_DEVTOOLS__) ?
      addStack('PROVIDER', name, providerID, messageData) :
      messageData

    const sendResponse = (data: any, err: any) => {
      if (handle.disposed) return
      
      const responseTime = performance.now() - startTime
      handle.updateStats(!err, responseTime)
      
      const returnData: RemoteCallResponse = {
        type: 'response',
        requestID: dataWithStack.requestID,
        resultType: err ? 'error' : 'result',
        result: err ? err : data,
        providerID
      }

      if ((__DEV__ || __PROD_DEVTOOLS__)) {
        devtools("out", providerID, 'PROVIDER', name, returnData)
      }

      multiplexedEndpoint.postMessage(returnData)
    }

    // ... rest of message handling logic
  }

  multiplexedEndpoint.addEventListener('message', messageListener)
  return handle
}
```

### 4. Auto-Dispose Pattern

```typescript
// packages/core/src/rpc-auto-dispose.ts
export interface AutoDisposeOptions {
  /** Timeout in ms after which to auto-dispose (0 = disabled) */
  timeout?: number
  /** Dispose on window unload */
  disposeOnUnload?: boolean
  /** Dispose on process exit (Node.js) */
  disposeOnExit?: boolean
}

export function withAutoDispose<T extends Disposable>(
  handle: T,
  options: AutoDisposeOptions = {}
): T {
  const {
    timeout = 0,
    disposeOnUnload = true,
    disposeOnExit = true
  } = options

  // Auto-dispose after timeout
  if (timeout > 0) {
    setTimeout(() => {
      if (!handle.disposed) {
        handle.dispose()
      }
    }, timeout)
  }

  // Browser: dispose on unload
  if (disposeOnUnload && typeof window !== 'undefined') {
    const unloadHandler = () => {
      if (!handle.disposed) {
        handle.dispose()
      }
    }
    window.addEventListener('beforeunload', unloadHandler)
    
    // Remove listener when disposed
    if ('events' in handle && handle.events) {
      (handle as any).events.once('dispose', () => {
        window.removeEventListener('beforeunload', unloadHandler)
      })
    }
  }

  // Node.js: dispose on exit
  if (disposeOnExit && typeof process !== 'undefined') {
    const exitHandler = () => {
      if (!handle.disposed) {
        handle.dispose()
      }
    }
    process.once('exit', exitHandler)
    process.once('SIGINT', exitHandler)
    process.once('SIGTERM', exitHandler)
    
    // Remove listeners when disposed
    if ('events' in handle && handle.events) {
      (handle as any).events.once('dispose', () => {
        process.removeListener('exit', exitHandler)
        process.removeListener('SIGINT', exitHandler)
        process.removeListener('SIGTERM', exitHandler)
      })
    }
  }

  return handle
}
```

### 5. Using Pattern

```typescript
// packages/core/src/rpc-using.ts
export interface UsingScope {
  <T extends Disposable>(resource: T): T
}

export async function using<T>(
  scope: (use: UsingScope) => Promise<T> | T
): Promise<T> {
  const resources: Disposable[] = []
  
  const use: UsingScope = <T extends Disposable>(resource: T): T => {
    resources.push(resource)
    return resource
  }
  
  try {
    return await scope(use)
  } finally {
    // Dispose in reverse order
    for (let i = resources.length - 1; i >= 0; i--) {
      try {
        if (!resources[i].disposed) {
          resources[i].dispose()
        }
      } catch (error) {
        console.error('Error disposing resource:', error)
      }
    }
  }
}
```

## Verwendungsbeispiele

### Basis-Verwendung

```typescript
// Manuelles Cleanup
const handle = consumeWithHandle<MyAPI>(endpoint)
try {
  const result = await handle.proxy.someMethod()
  console.log(result)
} finally {
  handle.dispose()
}

// Mit using pattern
await using(async (use) => {
  const handle = use(consumeWithHandle<MyAPI>(endpoint))
  const result = await handle.proxy.someMethod()
  return result
}) // Automatisches dispose
```

### Auto-Dispose

```typescript
// Dispose nach 5 Minuten
const handle = withAutoDispose(
  consumeWithHandle<MyAPI>(endpoint),
  { timeout: 5 * 60 * 1000 }
)

// Dispose bei Window-Unload
const handle = withAutoDispose(
  consumeWithHandle<MyAPI>(endpoint),
  { disposeOnUnload: true }
)
```

### Event Handling

```typescript
const handle = consumeWithHandle<MyAPI>(endpoint)

// Listen for events
handle.events.on('timeout', (requestId) => {
  console.warn(`Request ${requestId} timed out`)
})

handle.events.on('error', (error) => {
  console.error('Handle error:', error)
})

handle.events.once('dispose', () => {
  console.log('Handle was disposed')
})
```

### Provider mit Stats

```typescript
const provider = provideWithHandle(myAPI, endpoint)

// Check stats
setInterval(() => {
  const stats = provider.stats
  console.log(`Requests: ${stats.requestsReceived}`)
  console.log(`Success rate: ${stats.responsesSuccessful / stats.requestsReceived * 100}%`)
  console.log(`Avg response time: ${stats.avgResponseTime}ms`)
}, 60000)

// Cleanup
provider.dispose()
```

## Migration Guide

### Von consume zu consumeWithHandle

```typescript
// Alt
const api = consume<MyAPI>(endpoint)
await api.method()
// Memory leak möglich!

// Neu
const handle = consumeWithHandle<MyAPI>(endpoint)
try {
  await handle.proxy.method()
} finally {
  handle.dispose()
}

// Oder mit using
await using(async (use) => {
  const handle = use(consumeWithHandle<MyAPI>(endpoint))
  await handle.proxy.method()
})
```

### Von provide zu provideWithHandle

```typescript
// Alt
provide(myAPI, endpoint)
// Keine Möglichkeit zum Cleanup!

// Neu
const handle = provideWithHandle(myAPI, endpoint)
// ... später
handle.dispose()
```

## Tests

```typescript
// packages/core/__tests__/rpc-handle.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { consumeWithHandle, provideWithHandle, using } from '../src'

describe('Explicit Cleanup API', () => {
  it('should cleanup resources on dispose', () => {
    const endpoint = new MessageChannel().port1
    const handle = consumeWithHandle(endpoint)
    
    expect(handle.disposed).toBe(false)
    
    handle.dispose()
    
    expect(handle.disposed).toBe(true)
    expect(() => handle.proxy).toThrow('disposed')
  })
  
  it('should emit dispose event', () => {
    const endpoint = new MessageChannel().port1
    const handle = consumeWithHandle(endpoint)
    const disposeSpy = vi.fn()
    
    handle.events.on('dispose', disposeSpy)
    handle.dispose()
    
    expect(disposeSpy).toHaveBeenCalledOnce()
  })
  
  it('should work with using pattern', async () => {
    const endpoint = new MessageChannel().port1
    let handleRef: any
    
    await using(async (use) => {
      handleRef = use(consumeWithHandle(endpoint))
      expect(handleRef.disposed).toBe(false)
    })
    
    expect(handleRef.disposed).toBe(true)
  })
  
  it('should track provider statistics', async () => {
    const { port1, port2 } = new MessageChannel()
    const api = { test: () => 'result' }
    
    const provider = provideWithHandle(api, port1)
    const consumer = consumeWithHandle<typeof api>(port2)
    
    await consumer.proxy.test()
    
    const stats = provider.stats
    expect(stats.requestsReceived).toBe(1)
    expect(stats.responsesSuccessful).toBe(1)
    expect(stats.avgResponseTime).toBeGreaterThan(0)
    
    provider.dispose()
    consumer.dispose()
  })
})
```

## Vorteile

1. **Deterministisch**: Cleanup erfolgt genau wenn gewünscht
2. **Zuverlässig**: Keine Abhängigkeit von GC-Timing
3. **Debuggbar**: Klare Lifecycle-Events
4. **Flexibel**: Multiple Dispose-Patterns (manual, auto, using)
5. **Monitoring**: Provider-Statistiken für Observability

## Best Practices

1. **Immer dispose() aufrufen** - Verwenden Sie try/finally oder using pattern
2. **Auto-Dispose für langlebige Handles** - Setzen Sie Timeouts
3. **Event Handling** - Nutzen Sie Events für Logging/Monitoring
4. **Fehlerbehandlung** - Dispose auch bei Fehlern
5. **Testing** - Verifizieren Sie Cleanup in Tests