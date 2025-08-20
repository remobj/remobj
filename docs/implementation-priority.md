# Priorisierte Implementierungsliste

## Sofort umzusetzen (KRITISCH)

### 1. Message-Validierung mit Limits
```typescript
// rpc-provider.ts
const LIMITS = {
  MAX_ARG_COUNT: 100,
  MAX_PATH_DEPTH: 20,
  MAX_ARG_SIZE: 1024 * 1024, // 1MB
  MAX_PROPERTY_LENGTH: 256
}

function validateRequest(data: RemoteCallRequest): void {
  if (data.args.length > LIMITS.MAX_ARG_COUNT) {
    throw new Error('Too many arguments')
  }
  if (data.propertyPath.split('/').length > LIMITS.MAX_PATH_DEPTH) {
    throw new Error('Property path too deep')
  }
  // Weitere Validierungen...
}
```

### 2. Explizite Cleanup-API
```typescript
// rpc-consumer.ts
export interface ConsumerHandle<T> {
  proxy: Remote<T>
  cleanup(): void
}

export function consumeWithHandle<T>(endpoint: PostMessageEndpoint, config?: ConsumeConfig): ConsumerHandle<T> {
  const proxy = consume<T>(endpoint, config)
  return {
    proxy,
    cleanup: () => {
      // Explizites Cleanup ohne GC
      multiplexedEndpoint.removeEventListener('message', responseListener)
      pendingPromises.clear()
      proxyCache.clear()
      timeoutHandles.forEach(clearTimeout)
    }
  }
}
```

### 3. Channel-ID Validierung
```typescript
// rpc-wrapper.ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateChannelId(channelId: string): void {
  if (!UUID_REGEX.test(channelId)) {
    throw new Error('Invalid channel ID format')
  }
}
```

## Mittelfristig umzusetzen (WICHTIG)

### 4. Resource Limits
```typescript
// multiplex.ts
const MAX_CHANNELS = 10000

function createChannel(channelId: string): Channel<any> {
  if (channelRegistry.size >= MAX_CHANNELS) {
    throw new Error('Channel limit exceeded')
  }
  // ...
}
```

### 5. Timeout-Handle Fehlerbehandlung
```typescript
// rpc-consumer.ts
const cleanup = () => {
  try {
    pendingPromises.delete(requestID)
    const timeoutHandle = timeoutHandles.get(requestID)
    if (timeoutHandle) clearTimeout(timeoutHandle)
  } finally {
    timeoutHandles.delete(requestID)
  }
}
```

### 6. Property-Sicherheitsvalidierung
```typescript
// rpc-provider.ts
const UNSAFE_PROPERTY_CHARS = /[<>'"&\x00-\x1f\x7f-\x9f]/

function isPropertySafe(prop: string): boolean {
  return prop.length <= LIMITS.MAX_PROPERTY_LENGTH && 
         !UNSAFE_PROPERTY_CHARS.test(prop) &&
         !FORBIDDEN_PROPERTIES.includes(prop as ForbiddenProperty)
}
```

## Langfristig/Optional

### 7. Path-Cache für Performance
```typescript
// rpc-consumer.ts
const pathCache = new Map<string, string>()
const MAX_CACHE_SIZE = 1000

function joinPath(base: string, segment: string): string {
  if (pathCache.size > MAX_CACHE_SIZE) {
    pathCache.clear() // Simple reset
  }
  const key = `${base}|${segment}`
  let cached = pathCache.get(key)
  if (!cached) {
    cached = base ? `${base}/${segment}` : segment
    pathCache.set(key, cached)
  }
  return cached
}
```

### 8. IterableWeakSet Cleanup
```typescript
// iterable-weak-set.ts
class IterableWeakSet<T extends object> {
  private cleanupCounter = 0
  
  add(item: T): void {
    // Periodisches Cleanup
    if (++this.cleanupCounter % 1000 === 0) {
      this.cleanup()
    }
    // ... rest
  }
  
  private cleanup(): void {
    this.#weakRefs.forEach(ref => {
      if (!ref.deref()) this.#weakRefs.delete(ref)
    })
  }
}
```

### 9. Argument Fast Path
```typescript
// rpc-wrapper.ts
function handleData(data: RemoteCallRequest | RemoteCallResponse, fn: typeof unwrapArgument | typeof wrapArgument) {
  if ('args' in data && Array.isArray(data.args)) {
    // Fast path für primitive args
    if (data.args.every(arg => isClonable(arg))) {
      return data // Keine Transformation nötig
    }
    // ... normale Verarbeitung
  }
}
```

## NICHT empfohlen

- ❌ WeakMap Batch-Cleanup (unnötige Komplexität)
- ❌ MessageEvent Object Pool (Browser optimiert bereits)
- ❌ UUID Fallback (würde Sicherheit reduzieren)
- ❌ Verbot von then/catch/finally (bricht Promise-Funktionalität)

## Zusammenfassung

**Priorität 1 (Sicherheit)**: Message-Validierung, Cleanup-API, Channel-ID Validierung
**Priorität 2 (Stabilität)**: Resource Limits, Fehlerbehandlung, Property-Validierung  
**Priorität 3 (Performance)**: Path-Cache, Cleanup-Optimierungen, Fast Paths

Die wichtigsten Verbesserungen betreffen Sicherheit und Memory-Management. Performance-Optimierungen sind sekundär, da die aktuelle Implementierung bereits effizient ist.