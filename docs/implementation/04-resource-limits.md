# Resource Limits

## Übersicht

Resource Limits verhindern unbegrenztes Wachstum von Channels, Caches und anderen Datenstrukturen. Sie schützen vor DoS-Angriffen und Memory-Exhaustion durch kontrollierte Ressourcenbegrenzung.

## Problem

Die aktuelle Implementierung hat keine Limits für:
- Anzahl der Channels im Multiplex-System
- Größe der Proxy-Caches
- Anzahl der Event Listener
- Größe der Channel-Registry

Dies führt zu:
```typescript
// Angreifer kann unbegrenzt Channels erstellen
for (let i = 0; i < 1000000; i++) {
  endpoint.createSubChannel(`channel-${i}`)
}

// Proxy-Cache wächst unbegrenzt
for (let i = 0; i < 1000000; i++) {
  consumer.proxy[`prop${i}`] // Erstellt neuen Proxy
}
```

## Lösung

### 1. Resource Limit Definitionen

```typescript
// packages/core/src/resource-limits.ts
export interface ResourceLimits {
  /** Maximum number of channels per multiplexer */
  maxChannels: number
  /** Maximum number of sub-channels per channel */
  maxSubChannels: number
  /** Maximum number of listeners per channel */
  maxListenersPerChannel: number
  /** Maximum proxy cache size */
  maxProxyCacheSize: number
  /** Maximum pending promises */
  maxPendingPromises: number
  /** Maximum channel registry size */
  maxChannelRegistrySize: number
  /** Enable automatic cleanup when limits are reached */
  autoCleanup: boolean
  /** Cleanup strategy when limits are reached */
  cleanupStrategy: 'lru' | 'fifo' | 'random' | 'error'
}

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxChannels: 10000,
  maxSubChannels: 1000,
  maxListenersPerChannel: 100,
  maxProxyCacheSize: 50000,
  maxPendingPromises: 1000,
  maxChannelRegistrySize: 100000,
  autoCleanup: true,
  cleanupStrategy: 'lru'
}

export class ResourceLimitExceededError extends Error {
  constructor(
    public readonly resourceType: keyof ResourceLimits,
    public readonly limit: number,
    public readonly current: number,
    public readonly attempted: number = current + 1
  ) {
    super(
      `Resource limit exceeded for ${resourceType}: ` +
      `limit=${limit}, current=${current}, attempted=${attempted}`
    )
    this.name = 'ResourceLimitExceededError'
  }
}
```

### 2. LRU Cache Implementation

```typescript
// packages/core/src/lru-cache.ts
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private accessOrder: K[] = []
  
  constructor(
    private readonly maxSize: number,
    private readonly onEvict?: (key: K, value: V) => void
  ) {}

  get size(): number {
    return this.cache.size
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.updateAccessOrder(key)
    }
    return value
  }

  set(key: K, value: V): void {
    const existing = this.cache.has(key)
    
    if (!existing && this.cache.size >= this.maxSize) {
      // Evict least recently used
      const lru = this.accessOrder[0]
      if (lru !== undefined) {
        this.delete(lru)
      }
    }

    this.cache.set(key, value)
    this.updateAccessOrder(key)
  }

  delete(key: K): boolean {
    const value = this.cache.get(key)
    const deleted = this.cache.delete(key)
    
    if (deleted) {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      
      if (this.onEvict && value !== undefined) {
        this.onEvict(key, value)
      }
    }
    
    return deleted
  }

  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.cache) {
        this.onEvict(key, value)
      }
    }
    this.cache.clear()
    this.accessOrder = []
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  // Get least recently used keys
  getLRU(count: number = 1): K[] {
    return this.accessOrder.slice(0, count)
  }

  // Get most recently used keys
  getMRU(count: number = 1): K[] {
    return this.accessOrder.slice(-count).reverse()
  }

  // Iterator support
  *entries(): IterableIterator<[K, V]> {
    // Iterate in access order (LRU to MRU)
    for (const key of this.accessOrder) {
      const value = this.cache.get(key)
      if (value !== undefined) {
        yield [key, value]
      }
    }
  }

  *keys(): IterableIterator<K> {
    yield* this.accessOrder
  }

  *values(): IterableIterator<V> {
    for (const key of this.accessOrder) {
      const value = this.cache.get(key)
      if (value !== undefined) {
        yield value
      }
    }
  }
}
```

### 3. Resource Manager

```typescript
// packages/core/src/resource-manager.ts
import { ResourceLimits, DEFAULT_RESOURCE_LIMITS, ResourceLimitExceededError } from './resource-limits'
import { LRUCache } from './lru-cache'

export interface ResourceStats {
  channels: number
  subChannels: Map<string, number>
  listeners: Map<string, number>
  proxies: number
  pendingPromises: number
  registrySize: number
}

export class ResourceManager {
  private limits: ResourceLimits
  private stats: ResourceStats = {
    channels: 0,
    subChannels: new Map(),
    listeners: new Map(),
    proxies: 0,
    pendingPromises: 0,
    registrySize: 0
  }

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = { ...DEFAULT_RESOURCE_LIMITS, ...limits }
  }

  checkChannelLimit(): void {
    if (this.stats.channels >= this.limits.maxChannels) {
      this.handleLimitExceeded('maxChannels', this.limits.maxChannels, this.stats.channels)
    }
  }

  checkSubChannelLimit(parentChannelId: string): void {
    const current = this.stats.subChannels.get(parentChannelId) || 0
    if (current >= this.limits.maxSubChannels) {
      this.handleLimitExceeded('maxSubChannels', this.limits.maxSubChannels, current)
    }
  }

  checkListenerLimit(channelId: string): void {
    const current = this.stats.listeners.get(channelId) || 0
    if (current >= this.limits.maxListenersPerChannel) {
      this.handleLimitExceeded('maxListenersPerChannel', this.limits.maxListenersPerChannel, current)
    }
  }

  checkProxyLimit(): void {
    if (this.stats.proxies >= this.limits.maxProxyCacheSize) {
      this.handleLimitExceeded('maxProxyCacheSize', this.limits.maxProxyCacheSize, this.stats.proxies)
    }
  }

  checkPendingPromiseLimit(): void {
    if (this.stats.pendingPromises >= this.limits.maxPendingPromises) {
      this.handleLimitExceeded('maxPendingPromises', this.limits.maxPendingPromises, this.stats.pendingPromises)
    }
  }

  incrementChannel(): void {
    this.checkChannelLimit()
    this.stats.channels++
  }

  decrementChannel(): void {
    this.stats.channels = Math.max(0, this.stats.channels - 1)
  }

  incrementSubChannel(parentChannelId: string): void {
    this.checkSubChannelLimit(parentChannelId)
    const current = this.stats.subChannels.get(parentChannelId) || 0
    this.stats.subChannels.set(parentChannelId, current + 1)
  }

  decrementSubChannel(parentChannelId: string): void {
    const current = this.stats.subChannels.get(parentChannelId) || 0
    if (current <= 1) {
      this.stats.subChannels.delete(parentChannelId)
    } else {
      this.stats.subChannels.set(parentChannelId, current - 1)
    }
  }

  incrementListener(channelId: string): void {
    this.checkListenerLimit(channelId)
    const current = this.stats.listeners.get(channelId) || 0
    this.stats.listeners.set(channelId, current + 1)
  }

  decrementListener(channelId: string): void {
    const current = this.stats.listeners.get(channelId) || 0
    if (current <= 1) {
      this.stats.listeners.delete(channelId)
    } else {
      this.stats.listeners.set(channelId, current - 1)
    }
  }

  getStats(): Readonly<ResourceStats> {
    return {
      ...this.stats,
      subChannels: new Map(this.stats.subChannels),
      listeners: new Map(this.stats.listeners)
    }
  }

  private handleLimitExceeded(
    resourceType: keyof ResourceLimits,
    limit: number,
    current: number
  ): void {
    if (!this.limits.autoCleanup || this.limits.cleanupStrategy === 'error') {
      throw new ResourceLimitExceededError(resourceType, limit, current)
    }
    
    // Auto cleanup strategies would be implemented here
    // For now, just throw the error
    throw new ResourceLimitExceededError(resourceType, limit, current)
  }
}
```

### 4. Limited Multiplex Implementation

```typescript
// packages/core/src/multiplex-limited.ts
import { ResourceManager } from './resource-manager'
import { LRUCache } from './lru-cache'
import { ResourceLimits } from './resource-limits'

export interface LimitedMultiplexOptions extends MultiplexOptions {
  resourceLimits?: Partial<ResourceLimits>
}

export const createLimitedMultiplexedEndpoint = <T = unknown>(
  baseEndpoint: PostMessageEndpointBase<MultiplexedMessage<T>>,
  name: string = '',
  options: LimitedMultiplexOptions = {}
): Channel<T> => {
  const {
    resourceLimits = {},
    ...multiplexOptions
  } = options

  const resourceManager = new ResourceManager(resourceLimits)
  const effectiveLimits = { ...DEFAULT_RESOURCE_LIMITS, ...resourceLimits }

  // Use LRU cache for channel registry
  const channelRegistry = new LRUCache<string, Channel<any>>(
    effectiveLimits.maxChannelRegistrySize,
    (channelId, channel) => {
      // Cleanup evicted channel
      channel.close()
      resourceManager.decrementChannel()
    }
  )

  // Track listeners per channel with limit
  const channelListeners = new Map<string, IterableWeakSet<Listener<any>>>()

  const messageHandler = (event: MessageEvent<MultiplexedMessage>) => {
    const { channelId, data } = event.data

    try {
      validateChannelId(channelId)
    } catch (error) {
      return // Ignore invalid channel IDs
    }

    const listeners = channelListeners.get(channelId)
    if (listeners) {
      const channelEvent = new MessageEvent('message', { data })
      listeners.forEach(listener => listener(channelEvent))
    }
  }

  baseEndpoint.addEventListener('message', messageHandler)

  const createChannel = (channelId: string, parentId?: string): Channel<any> => {
    validateChannelId(channelId)

    const existingRef = channelRegistry.get(channelId)
    if (existingRef) {
      return existingRef
    }

    // Check resource limits
    if (parentId) {
      resourceManager.incrementSubChannel(parentId)
    } else {
      resourceManager.incrementChannel()
    }

    const listeners = new IterableWeakSet<Listener<any>>()
    channelListeners.set(channelId, listeners)

    const channel: Channel<any> = {
      id: channelId,
      
      createSubChannel: <U>(subId: string, name?: string) => {
        const fullChannelId = `${channelId}/${crypto.randomUUID()}`
        return createChannel(fullChannelId, channelId) as Channel<U>
      },
      
      postMessage: (data: T) => {
        return baseEndpoint.postMessage({ channelId, data })
      },
      
      addEventListener: (type: 'message', listener: Listener<T>) => {
        resourceManager.incrementListener(channelId)
        listeners.add(listener as Listener<any>)
      },
      
      removeEventListener: (type: 'message', listener: Listener<T>) => {
        listeners.remove(listener as Listener<any>)
        resourceManager.decrementListener(channelId)
      },
      
      close: () => {
        channelListeners.delete(channelId)
        channelRegistry.delete(channelId)
        
        if (parentId) {
          resourceManager.decrementSubChannel(parentId)
        } else {
          resourceManager.decrementChannel()
        }
      }
    }

    channelRegistry.set(channelId, channel)
    return channel
  }

  // Add resource stats method
  const getRootChannel = () => {
    const rootChannel = createChannel('')
    
    // Extend with stats
    Object.defineProperty(rootChannel, 'resourceStats', {
      get: () => resourceManager.getStats(),
      enumerable: true,
      configurable: false
    })
    
    return rootChannel
  }

  return getRootChannel()
}
```

### 5. Limited Consumer Implementation

```typescript
// packages/core/src/rpc-consumer-limited.ts
import { LRUCache } from './lru-cache'
import { ResourceManager } from './resource-manager'
import { ResourceLimits } from './resource-limits'

export interface LimitedConsumeConfig extends ConsumeConfig {
  resourceLimits?: Partial<ResourceLimits>
}

export function consumeWithLimits<T = any>(
  endpoint: PostMessageEndpoint,
  config: LimitedConsumeConfig = {}
): Remote<T> {
  const {
    resourceLimits = {},
    ...consumeConfig
  } = config

  const resourceManager = new ResourceManager(resourceLimits)
  const effectiveLimits = { ...DEFAULT_RESOURCE_LIMITS, ...resourceLimits }

  // Use LRU cache for proxies
  const proxyCache = new LRUCache<string, any>(
    effectiveLimits.maxProxyCacheSize,
    (path, proxy) => {
      // Cleanup evicted proxy
      resourceManager.stats.proxies--
    }
  )

  // Track pending promises with limit
  const pendingPromises = new Map<string, {
    resolve: (data: any) => void
    reject: (data: any) => void
    timestamp: number
  }>()

  const createProxy = (propertyPath: string): any => {
    const cachedProxy = proxyCache.get(propertyPath)
    if (cachedProxy) {
      return cachedProxy
    }

    // Check proxy limit
    resourceManager.checkProxyLimit()

    const remoteProxy = new Proxy(class { }, {
      get(target, property, receiver) {
        if (isSymbol(property)) return null

        if (property === 'then') {
          return remoteCall('await', propertyPath, []).then
        } else {
          return createProxy(propertyPath + '/' + property)
        }
      },
      // ... other handlers
    })

    proxyCache.set(propertyPath, remoteProxy)
    resourceManager.stats.proxies++
    
    return remoteProxy
  }

  const remoteCall = (
    operationType: "call" | "construct" | "set" | "await",
    propertyPath: string,
    args: any[]
  ): Promise<any> => {
    // Check pending promise limit
    resourceManager.checkPendingPromiseLimit()

    const requestID = crypto.randomUUID()
    
    // Track promise
    resourceManager.stats.pendingPromises++
    
    const promise = createPromise(requestID)
    
    // Cleanup on settlement
    promise.finally(() => {
      resourceManager.stats.pendingPromises--
    })
    
    // ... rest of implementation
    
    return promise
  }

  // ... rest of consumer implementation
}
```

### 6. Monitoring und Alerting

```typescript
// packages/core/src/resource-monitor.ts
export interface ResourceAlert {
  type: 'warning' | 'critical'
  resourceType: keyof ResourceLimits
  usage: number
  limit: number
  percentage: number
  timestamp: Date
}

export class ResourceMonitor {
  private alerts: ResourceAlert[] = []
  private alertHandlers: ((alert: ResourceAlert) => void)[] = []

  constructor(
    private resourceManager: ResourceManager,
    private thresholds = {
      warning: 0.8,  // 80%
      critical: 0.95 // 95%
    }
  ) {}

  check(): void {
    const stats = this.resourceManager.getStats()
    const limits = this.resourceManager.limits

    // Check each resource
    this.checkResource('channels', stats.channels, limits.maxChannels)
    this.checkResource('proxies', stats.proxies, limits.maxProxyCacheSize)
    this.checkResource('pendingPromises', stats.pendingPromises, limits.maxPendingPromises)
  }

  private checkResource(
    resourceType: keyof ResourceLimits,
    current: number,
    limit: number
  ): void {
    const percentage = current / limit

    if (percentage >= this.thresholds.critical) {
      this.emitAlert({
        type: 'critical',
        resourceType,
        usage: current,
        limit,
        percentage,
        timestamp: new Date()
      })
    } else if (percentage >= this.thresholds.warning) {
      this.emitAlert({
        type: 'warning',
        resourceType,
        usage: current,
        limit,
        percentage,
        timestamp: new Date()
      })
    }
  }

  private emitAlert(alert: ResourceAlert): void {
    this.alerts.push(alert)
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000)
    }

    // Notify handlers
    for (const handler of this.alertHandlers) {
      try {
        handler(alert)
      } catch (error) {
        console.error('Alert handler error:', error)
      }
    }
  }

  onAlert(handler: (alert: ResourceAlert) => void): () => void {
    this.alertHandlers.push(handler)
    
    // Return unsubscribe function
    return () => {
      const index = this.alertHandlers.indexOf(handler)
      if (index > -1) {
        this.alertHandlers.splice(index, 1)
      }
    }
  }

  getAlerts(type?: 'warning' | 'critical'): ResourceAlert[] {
    if (type) {
      return this.alerts.filter(alert => alert.type === type)
    }
    return [...this.alerts]
  }

  clearAlerts(): void {
    this.alerts = []
  }
}
```

## Verwendungsbeispiele

### Basis-Verwendung mit Limits

```typescript
// Multiplex mit Resource Limits
const endpoint = createLimitedMultiplexedEndpoint(baseEndpoint, 'api', {
  resourceLimits: {
    maxChannels: 1000,
    maxSubChannels: 100,
    maxListenersPerChannel: 10
  }
})

// Consumer mit Limits
const api = consumeWithLimits<MyAPI>(endpoint, {
  resourceLimits: {
    maxProxyCacheSize: 10000,
    maxPendingPromises: 500
  }
})
```

### Monitoring einrichten

```typescript
const resourceManager = new ResourceManager()
const monitor = new ResourceMonitor(resourceManager)

// Alert Handler
monitor.onAlert((alert) => {
  console.warn(`Resource Alert: ${alert.resourceType} at ${alert.percentage * 100}%`)
  
  if (alert.type === 'critical') {
    // Send to monitoring service
    telemetry.sendAlert({
      severity: 'critical',
      resource: alert.resourceType,
      usage: alert.usage,
      limit: alert.limit
    })
  }
})

// Periodisches Monitoring
setInterval(() => {
  monitor.check()
}, 5000)
```

### LRU Cache Verwendung

```typescript
// Standalone LRU Cache
const cache = new LRUCache<string, ExpensiveObject>(1000, (key, value) => {
  console.log(`Evicting ${key}`)
  value.cleanup()
})

// Mit Statistiken
setInterval(() => {
  const lru = cache.getLRU(10)
  console.log('Least recently used:', lru)
  
  const mru = cache.getMRU(10)
  console.log('Most recently used:', mru)
}, 60000)
```

### Fehlerbehandlung

```typescript
try {
  const channel = endpoint.createSubChannel('test')
} catch (error) {
  if (error instanceof ResourceLimitExceededError) {
    console.error(`Limit exceeded: ${error.resourceType}`)
    
    // Cleanup alte Channels
    if (error.resourceType === 'maxChannels') {
      cleanupOldChannels()
    }
  }
}
```

## Tests

```typescript
// packages/core/__tests__/resource-limits.spec.ts
import { describe, it, expect } from 'vitest'
import { createLimitedMultiplexedEndpoint } from '../src/multiplex-limited'
import { ResourceLimitExceededError } from '../src/resource-limits'

describe('Resource Limits', () => {
  it('should enforce channel limits', () => {
    const { port1 } = new MessageChannel()
    const endpoint = createLimitedMultiplexedEndpoint(port1, '', {
      resourceLimits: {
        maxChannels: 5
      }
    })

    // Create 5 channels (including root)
    for (let i = 0; i < 4; i++) {
      endpoint.createSubChannel(`channel-${i}`)
    }

    // 6th channel should fail
    expect(() => {
      endpoint.createSubChannel('channel-5')
    }).toThrow(ResourceLimitExceededError)
  })

  it('should enforce listener limits', () => {
    const { port1 } = new MessageChannel()
    const endpoint = createLimitedMultiplexedEndpoint(port1, '', {
      resourceLimits: {
        maxListenersPerChannel: 3
      }
    })

    const channel = endpoint.createSubChannel('test')
    
    // Add 3 listeners
    const listeners = Array(3).fill(0).map(() => () => {})
    listeners.forEach(l => channel.addEventListener('message', l))

    // 4th listener should fail
    expect(() => {
      channel.addEventListener('message', () => {})
    }).toThrow(ResourceLimitExceededError)
  })

  it('should cleanup with LRU strategy', () => {
    const cache = new LRUCache<string, string>(3)
    
    cache.set('a', 'valueA')
    cache.set('b', 'valueB')
    cache.set('c', 'valueC')
    
    // Access 'a' to make it recently used
    cache.get('a')
    
    // Add 'd' should evict 'b' (least recently used)
    cache.set('d', 'valueD')
    
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('valueA')
    expect(cache.get('c')).toBe('valueC')
    expect(cache.get('d')).toBe('valueD')
  })
})
```

## Migration Guide

### Schritt 1: Limits festlegen

```typescript
// Analysiere aktuelle Nutzung
const stats = endpoint.resourceStats
console.log('Current usage:', stats)

// Setze Limits basierend auf Analyse
const limits = {
  maxChannels: stats.channels * 2,
  maxProxyCacheSize: stats.proxies * 2
}
```

### Schritt 2: Schrittweise Migration

```typescript
// Phase 1: Nur Monitoring
const monitor = new ResourceMonitor(resourceManager, {
  warning: 0.9,  // Warne bei 90%
  critical: 0.99 // Kritisch bei 99%
})

// Phase 2: Soft Limits mit Warnings
monitor.onAlert((alert) => {
  logger.warn('Approaching resource limit', alert)
})

// Phase 3: Hard Limits
const endpoint = createLimitedMultiplexedEndpoint(baseEndpoint, '', {
  resourceLimits: limits
})
```

## Performance-Überlegungen

1. **LRU Overhead**: Access-Order-Tracking hat O(n) Komplexität
2. **Cache-Size**: Größere Caches = bessere Hit-Rate aber mehr Memory
3. **Cleanup-Frequenz**: Balance zwischen Resource-Nutzung und Overhead

## Best Practices

1. **Konservative Limits**: Starte mit großzügigen Limits
2. **Monitoring first**: Überwache bevor du begrenzt
3. **Graceful Degradation**: Plane für Limit-Überschreitungen
4. **Alert Fatigue**: Vermeide zu viele Warnings
5. **Testing**: Teste Limit-Verhalten unter Last