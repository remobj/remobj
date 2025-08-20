# Channel-ID Validierung

## Übersicht

Die Channel-ID Validierung stellt sicher, dass nur gültige UUID-formatierte Channel-IDs verwendet werden. Dies verhindert Injection-Angriffe und gewährleistet konsistente Identifikatoren im gesamten System.

## Problem

Die aktuelle Implementierung validiert Channel-IDs nur oberflächlich:

```typescript
// Aktuell - nur Typ-Check
if (!isString(channelId)) {
  throw new Error(`Invalid channel ID: expected string, got ${typeof channelId}`)
}
```

Sicherheitsprobleme:
1. **Injection-Angriffe**: Beliebige Strings könnten als Channel-IDs verwendet werden
2. **Kollisionen**: Nicht-UUID Strings könnten zu ID-Kollisionen führen
3. **Inkonsistenz**: Verschiedene ID-Formate im System
4. **Memory Leaks**: Sehr lange IDs könnten Speicher verschwenden

## Lösung

### 1. Channel-ID Validator

```typescript
// packages/core/src/channel-validator.ts
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ChannelIdValidationOptions {
  /** Allow custom prefixes before UUID (e.g., "channel:uuid") */
  allowPrefix?: boolean
  /** Allowed prefixes if allowPrefix is true */
  allowedPrefixes?: string[]
  /** Maximum total length including prefix */
  maxLength?: number
  /** Strict mode - only UUID v4 allowed */
  strict?: boolean
}

export const DEFAULT_CHANNEL_VALIDATION: ChannelIdValidationOptions = {
  allowPrefix: false,
  allowedPrefixes: [],
  maxLength: 36, // Standard UUID length
  strict: true
}

export class ChannelValidationError extends Error {
  constructor(
    message: string,
    public readonly channelId: string,
    public readonly reason: 'format' | 'length' | 'prefix'
  ) {
    super(message)
    this.name = 'ChannelValidationError'
  }
}

export function validateChannelId(
  channelId: unknown,
  options: ChannelIdValidationOptions = DEFAULT_CHANNEL_VALIDATION
): string {
  // Type validation
  if (typeof channelId !== 'string') {
    throw new ChannelValidationError(
      `Channel ID must be a string, got ${typeof channelId}`,
      String(channelId),
      'format'
    )
  }

  // Length validation
  if (channelId.length > (options.maxLength || DEFAULT_CHANNEL_VALIDATION.maxLength!)) {
    throw new ChannelValidationError(
      `Channel ID too long (max ${options.maxLength} chars)`,
      channelId,
      'length'
    )
  }

  // Empty string check
  if (channelId.length === 0) {
    throw new ChannelValidationError(
      'Channel ID cannot be empty',
      channelId,
      'format'
    )
  }

  let uuidPart = channelId

  // Prefix handling
  if (options.allowPrefix) {
    const colonIndex = channelId.indexOf(':')
    if (colonIndex > 0) {
      const prefix = channelId.substring(0, colonIndex)
      uuidPart = channelId.substring(colonIndex + 1)

      if (options.allowedPrefixes && options.allowedPrefixes.length > 0) {
        if (!options.allowedPrefixes.includes(prefix)) {
          throw new ChannelValidationError(
            `Invalid channel prefix: ${prefix}`,
            channelId,
            'prefix'
          )
        }
      }
    }
  }

  // UUID format validation
  if (options.strict !== false) {
    if (!UUID_V4_REGEX.test(uuidPart)) {
      throw new ChannelValidationError(
        'Channel ID must be a valid UUID v4',
        channelId,
        'format'
      )
    }
  }

  return channelId
}

export function isValidChannelId(
  channelId: unknown,
  options?: ChannelIdValidationOptions
): boolean {
  try {
    validateChannelId(channelId, options)
    return true
  } catch {
    return false
  }
}
```

### 2. Sichere Channel-ID Generierung

```typescript
// packages/core/src/channel-id-generator.ts
export interface ChannelIdGenerator {
  generate(): string
  validate(id: string): boolean
}

export class UuidChannelIdGenerator implements ChannelIdGenerator {
  constructor(
    private readonly prefix?: string,
    private readonly options?: ChannelIdValidationOptions
  ) {}

  generate(): string {
    const uuid = crypto.randomUUID()
    return this.prefix ? `${this.prefix}:${uuid}` : uuid
  }

  validate(id: string): boolean {
    return isValidChannelId(id, this.options)
  }
}

export class SequentialChannelIdGenerator implements ChannelIdGenerator {
  private counter = 0
  private readonly nodeId: string

  constructor(nodeId?: string) {
    this.nodeId = nodeId || crypto.randomUUID().split('-')[0]
  }

  generate(): string {
    const timestamp = Date.now().toString(36)
    const count = (this.counter++).toString(36).padStart(6, '0')
    const random = Math.random().toString(36).substring(2, 6)
    
    // Format: aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee (UUID v4 compatible)
    const parts = [
      timestamp.padEnd(8, '0').substring(0, 8),
      this.nodeId.substring(0, 4),
      '4' + count.substring(0, 3),
      '8' + random.substring(0, 3),
      (timestamp + count + random).padEnd(12, '0').substring(0, 12)
    ]
    
    return parts.join('-')
  }

  validate(id: string): boolean {
    return UUID_V4_REGEX.test(id)
  }
}

// Factory for creating generators
export function createChannelIdGenerator(
  type: 'uuid' | 'sequential' = 'uuid',
  options?: {
    prefix?: string
    validationOptions?: ChannelIdValidationOptions
    nodeId?: string
  }
): ChannelIdGenerator {
  switch (type) {
    case 'uuid':
      return new UuidChannelIdGenerator(
        options?.prefix,
        options?.validationOptions
      )
    case 'sequential':
      return new SequentialChannelIdGenerator(options?.nodeId)
    default:
      throw new Error(`Unknown generator type: ${type}`)
  }
}
```

### 3. Integration in Multiplex

```typescript
// packages/core/src/multiplex.ts - Erweiterte Version
import { validateChannelId, ChannelIdValidationOptions } from './channel-validator'
import { createChannelIdGenerator, ChannelIdGenerator } from './channel-id-generator'

export interface MultiplexOptions {
  /** Channel ID validation options */
  channelValidation?: ChannelIdValidationOptions
  /** Custom channel ID generator */
  channelIdGenerator?: ChannelIdGenerator
  /** Enable debug mode */
  debug?: boolean
}

export const createMultiplexedEndpoint = <T = unknown>(
  baseEndpoint: PostMessageEndpointBase<MultiplexedMessage<T>>,
  name: string = '',
  options: MultiplexOptions = {}
): Channel<T> => {
  const existingChannelRef = endpointToRootChannel.get(baseEndpoint)
  if (existingChannelRef) {
    return existingChannelRef
  }

  const {
    channelValidation = DEFAULT_CHANNEL_VALIDATION,
    channelIdGenerator = createChannelIdGenerator('uuid'),
    debug = false
  } = options

  const channelRegistry = new StringKeyWeakMap<Channel<any>>()
  const channelListeners = new Map<string, IterableWeakSet<Listener<any>>>()

  // Message handler with validation
  const messageHandler = (event: MessageEvent<MultiplexedMessage>) => {
    const { channelId, data } = event.data

    try {
      // Validate incoming channel ID
      validateChannelId(channelId, channelValidation)
    } catch (error) {
      if (debug) {
        console.error('Invalid channel ID received:', error)
      }
      return // Ignore messages with invalid channel IDs
    }

    const listeners = channelListeners.get(channelId)
    if (listeners) {
      const channelEvent = new MessageEvent('message', { data })
      listeners.forEach(listener => listener(channelEvent))
    }
  }

  baseEndpoint.addEventListener('message', messageHandler)

  // Create channel with validation
  const createChannel = (channelId: string): Channel<any> => {
    // Validate channel ID
    try {
      validateChannelId(channelId, channelValidation)
    } catch (error) {
      throw new Error(`Cannot create channel: ${error.message}`)
    }

    const existingRef = channelRegistry.get(channelId)
    if (existingRef) {
      return existingRef
    }

    channelListeners.set(channelId, new IterableWeakSet())

    const channel: Channel<any> = {
      id: channelId,
      
      createSubChannel: <U>(subId: string, name?: string) => {
        // Generate sub-channel ID
        const fullChannelId = channelIdGenerator.generate()
        const subChannelId = `${channelId}/${fullChannelId}`
        
        return createChannel(subChannelId) as Channel<U>
      },
      
      postMessage: (data: T) => {
        // Channel ID is already validated
        return baseEndpoint.postMessage({ channelId, data })
      },
      
      addEventListener: (type: 'message', listener: Listener<T>) => {
        channelListeners.get(channelId)?.add(listener as Listener<any>)
      },
      
      removeEventListener: (type: 'message', listener: Listener<T>) => {
        channelListeners.get(channelId)?.remove(listener as Listener<any>)
      },
      
      close: () => {
        channelListeners.delete(channelId)
      }
    }

    channelRegistry.set(channelId, channel)
    return channel
  }

  // Cleanup on garbage collection
  onGarbageCollected(createChannel, () => {
    baseEndpoint.removeEventListener('message', messageHandler)
    channelRegistry.clear()
    channelListeners.clear()
  })

  const rootChannel = createChannel('')
  endpointToRootChannel.set(baseEndpoint, rootChannel)
  return rootChannel
}
```

### 4. Integration in RPC Wrapper

```typescript
// packages/core/src/rpc-wrapper.ts - Erweiterte Version
import { validateChannelId } from './channel-validator'

export function createArgumentWrappingEndpoint(
  endpoint: Channel<any>,
  options?: { strictChannelValidation?: boolean }
): Channel<any> {
  const objectToIdMap = new WeakMap<any, string>()
  const idToProxyMap = new StringKeyWeakMap<any>()
  const strictValidation = options?.strictChannelValidation ?? true

  function wrapArgument(data: any): WrappedArgument {
    if (isClonable(data)) {
      return {
        type: 'raw',
        value: data
      }
    } else {
      let id = objectToIdMap.get(data)
      if (!id) {
        id = crypto.randomUUID()
        // Validate generated ID
        if (strictValidation) {
          validateChannelId(id)
        }
      }
      objectToIdMap.set(data, id)

      const channel = endpoint.createSubChannel(id)
      if (provideFunction) {
        provideFunction(data, channel, { name: id })
      }

      return {
        type: 'wrapped',
        value: id
      }
    }
  }

  function unwrapArgument(data: WrappedArgument): any {
    if (data.type === 'raw') {
      return data.value
    } else {
      const channelId = data.value

      // Enhanced validation with specific error
      try {
        validateChannelId(channelId)
      } catch (error) {
        throw new Error(
          `Invalid wrapped channel ID: ${error.message}`
        )
      }

      const cachedProxy = idToProxyMap.get(channelId)
      if (cachedProxy) return cachedProxy

      const channel = endpoint.createSubChannel(channelId)
      const proxy = consumeFunction ? consumeFunction(channel) : null

      if (proxy) {
        onGarbageCollected(proxy, () => channel.close())
        idToProxyMap.set(channelId, proxy)
      }

      return proxy
    }
  }

  // ... rest of implementation
}
```

### 5. Monitoring und Logging

```typescript
// packages/core/src/channel-monitor.ts
export interface ChannelMetrics {
  totalChannels: number
  activeChannels: number
  invalidAttempts: number
  validationErrors: Map<string, number>
}

export class ChannelMonitor {
  private metrics: ChannelMetrics = {
    totalChannels: 0,
    activeChannels: 0,
    invalidAttempts: 0,
    validationErrors: new Map()
  }

  onChannelCreated(channelId: string): void {
    this.metrics.totalChannels++
    this.metrics.activeChannels++
  }

  onChannelClosed(channelId: string): void {
    this.metrics.activeChannels--
  }

  onValidationError(error: ChannelValidationError): void {
    this.metrics.invalidAttempts++
    const count = this.metrics.validationErrors.get(error.reason) || 0
    this.metrics.validationErrors.set(error.reason, count + 1)
  }

  getMetrics(): Readonly<ChannelMetrics> {
    return {
      ...this.metrics,
      validationErrors: new Map(this.metrics.validationErrors)
    }
  }

  reset(): void {
    this.metrics = {
      totalChannels: 0,
      activeChannels: 0,
      invalidAttempts: 0,
      validationErrors: new Map()
    }
  }
}

// Global monitor instance
export const channelMonitor = new ChannelMonitor()
```

## Verwendungsbeispiele

### Basis-Verwendung

```typescript
// Standard UUID validation
const endpoint = createMultiplexedEndpoint(baseEndpoint)

// Mit benutzerdefinierten Optionen
const endpoint = createMultiplexedEndpoint(baseEndpoint, 'myEndpoint', {
  channelValidation: {
    allowPrefix: true,
    allowedPrefixes: ['channel', 'subchannel'],
    maxLength: 50
  }
})
```

### Benutzerdefinierter Generator

```typescript
// Sequential IDs für bessere Sortierbarkeit
const endpoint = createMultiplexedEndpoint(baseEndpoint, 'myEndpoint', {
  channelIdGenerator: createChannelIdGenerator('sequential', {
    nodeId: 'node1'
  })
})

// Mit Prefix
const endpoint = createMultiplexedEndpoint(baseEndpoint, 'myEndpoint', {
  channelIdGenerator: createChannelIdGenerator('uuid', {
    prefix: 'api'
  }),
  channelValidation: {
    allowPrefix: true,
    allowedPrefixes: ['api'],
    maxLength: 50
  }
})
```

### Monitoring

```typescript
import { channelMonitor } from '@remobj/core'

// Periodisches Logging
setInterval(() => {
  const metrics = channelMonitor.getMetrics()
  console.log('Channel Metrics:', {
    active: metrics.activeChannels,
    total: metrics.totalChannels,
    errors: metrics.invalidAttempts
  })
}, 60000)
```

## Tests

```typescript
// packages/core/__tests__/channel-validator.spec.ts
import { describe, it, expect } from 'vitest'
import { 
  validateChannelId, 
  isValidChannelId,
  ChannelValidationError 
} from '../src/channel-validator'

describe('Channel ID Validation', () => {
  describe('validateChannelId', () => {
    it('should accept valid UUID v4', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(() => validateChannelId(validUuid)).not.toThrow()
    })

    it('should reject invalid UUID format', () => {
      const invalid = [
        'not-a-uuid',
        '550e8400-e29b-11d4-a716-446655440000', // v1
        '550e8400e29b41d4a716446655440000', // no dashes
        '550e8400-e29b-41d4-a716', // too short
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' // invalid chars
      ]

      for (const id of invalid) {
        expect(() => validateChannelId(id))
          .toThrow(ChannelValidationError)
      }
    })

    it('should handle prefix validation', () => {
      const prefixed = 'channel:550e8400-e29b-41d4-a716-446655440000'
      
      // Should fail without allowPrefix
      expect(() => validateChannelId(prefixed))
        .toThrow()

      // Should pass with allowPrefix
      expect(() => validateChannelId(prefixed, {
        allowPrefix: true
      })).not.toThrow()

      // Should fail with wrong prefix
      expect(() => validateChannelId(prefixed, {
        allowPrefix: true,
        allowedPrefixes: ['api']
      })).toThrow()
    })

    it('should enforce length limits', () => {
      const longId = 'a'.repeat(100)
      
      expect(() => validateChannelId(longId))
        .toThrow('Channel ID too long')
    })
  })

  describe('isValidChannelId', () => {
    it('should return boolean without throwing', () => {
      expect(isValidChannelId('valid-id')).toBe(false)
      expect(isValidChannelId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })
  })
})

describe('Channel ID Generator', () => {
  it('should generate valid UUIDs', () => {
    const generator = createChannelIdGenerator('uuid')
    
    for (let i = 0; i < 100; i++) {
      const id = generator.generate()
      expect(generator.validate(id)).toBe(true)
      expect(isValidChannelId(id)).toBe(true)
    }
  })

  it('should generate unique IDs', () => {
    const generator = createChannelIdGenerator('uuid')
    const ids = new Set<string>()
    
    for (let i = 0; i < 1000; i++) {
      ids.add(generator.generate())
    }
    
    expect(ids.size).toBe(1000)
  })

  it('should support prefixes', () => {
    const generator = createChannelIdGenerator('uuid', {
      prefix: 'test'
    })
    
    const id = generator.generate()
    expect(id).toMatch(/^test:[0-9a-f-]+$/)
  })
})
```

## Migration Guide

### Schritt 1: Validierung aktivieren

```typescript
// Alt - keine Validierung
const endpoint = createMultiplexedEndpoint(baseEndpoint)

// Neu - mit Standard-Validierung
const endpoint = createMultiplexedEndpoint(baseEndpoint, '', {
  channelValidation: DEFAULT_CHANNEL_VALIDATION
})
```

### Schritt 2: Bestehende IDs migrieren

```typescript
// Migrations-Helper für nicht-UUID IDs
function migrateChannelId(oldId: string): string {
  // Wenn bereits UUID, keine Änderung
  if (isValidChannelId(oldId)) {
    return oldId
  }
  
  // Generiere neue UUID und mappe alte ID
  const newId = crypto.randomUUID()
  channelIdMap.set(oldId, newId)
  return newId
}
```

### Schritt 3: Monitoring einrichten

```typescript
// Überwache Validierungsfehler während Migration
channelMonitor.onValidationError = (error) => {
  console.warn('Legacy channel ID detected:', error.channelId)
  // Log für spätere Analyse
  legacyIds.add(error.channelId)
}
```

## Performance-Überlegungen

1. **Regex-Caching**: UUID-Regex wird als Konstante gespeichert
2. **Frühe Validierung**: Fehler werden früh erkannt
3. **Generator-Performance**: Sequential Generator vermeidet crypto.randomUUID() Overhead

## Sicherheitsvorteile

1. **Injection-Schutz**: Nur validierte IDs werden akzeptiert
2. **Konsistenz**: Einheitliches ID-Format im gesamten System
3. **Längen-Limits**: Verhindert Memory-Exhaustion durch lange IDs
4. **Audit-Trail**: Monitoring ermöglicht Sicherheitsanalysen