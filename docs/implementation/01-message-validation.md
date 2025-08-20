# Message-Validierung mit Limits

## Übersicht

Die Message-Validierung ist eine kritische Sicherheitsmaßnahme, die DoS-Angriffe und Memory-Exhaustion durch übermäßig große oder tiefe Datenstrukturen verhindert.

## Problem

Die aktuelle Implementierung validiert nur oberflächlich:
- Keine Limits für Argument-Anzahl
- Keine Limits für Property-Path-Tiefe
- Keine Größenbeschränkungen für Payloads
- Keine Validierung der Request-ID

Dies ermöglicht potenzielle Angriffe:
```typescript
// DoS durch viele Argumente
consume(endpoint).someMethod(...Array(1000000).fill(null))

// Stack Overflow durch tiefen Pfad
consume(endpoint).a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z

// Memory Exhaustion durch große Strings
consume(endpoint).process('x'.repeat(100_000_000))
```

## Lösung

### 1. Limits Definition

```typescript
// packages/core/src/rpc-limits.ts
export interface RpcLimits {
  /** Maximum number of arguments in a single call */
  maxArgCount: number
  /** Maximum depth of property path */
  maxPathDepth: number
  /** Maximum size of a single argument in bytes */
  maxArgSize: number
  /** Maximum total size of all arguments in bytes */
  maxTotalArgSize: number
  /** Maximum length of a single property name */
  maxPropertyLength: number
  /** Maximum length of request ID */
  maxRequestIdLength: number
  /** Maximum number of pending requests */
  maxPendingRequests: number
}

export const DEFAULT_LIMITS: RpcLimits = {
  maxArgCount: 100,
  maxPathDepth: 20,
  maxArgSize: 1024 * 1024,      // 1MB per argument
  maxTotalArgSize: 10 * 1024 * 1024, // 10MB total
  maxPropertyLength: 256,
  maxRequestIdLength: 128,
  maxPendingRequests: 1000
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly limit: number,
    public readonly actual: number
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### 2. Größenberechnung

```typescript
// packages/core/src/rpc-size-calculator.ts
export function calculateSize(obj: unknown): number {
  const seen = new WeakSet<object>()
  
  function calculate(val: unknown): number {
    if (val === null || val === undefined) return 8
    
    switch (typeof val) {
      case 'boolean': return 4
      case 'number': return 8
      case 'string': return val.length * 2 // UTF-16
      case 'bigint': return val.toString().length
      case 'symbol': return 32
      case 'function': return 0 // Functions are not serialized
      case 'object':
        if (seen.has(val)) return 0 // Circular reference
        seen.add(val)
        
        if (val instanceof Date) return 8
        if (val instanceof RegExp) return val.source.length * 2
        if (val instanceof ArrayBuffer) return val.byteLength
        if (val instanceof DataView) return val.byteLength
        if (ArrayBuffer.isView(val)) return val.byteLength
        
        if (Array.isArray(val)) {
          return val.reduce((sum, item) => sum + calculate(item), 24)
        }
        
        // Plain object
        let size = 24 // Object overhead
        for (const key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key)) {
            size += key.length * 2 + calculate((val as any)[key])
          }
        }
        return size
        
      default:
        return 0
    }
  }
  
  return calculate(obj)
}
```

### 3. Validierungsfunktion

```typescript
// packages/core/src/rpc-validator.ts
import { RemoteCallRequest } from './rpc-types'
import { RpcLimits, DEFAULT_LIMITS, ValidationError } from './rpc-limits'
import { calculateSize } from './rpc-size-calculator'

export function validateRequest(
  request: RemoteCallRequest,
  limits: RpcLimits = DEFAULT_LIMITS
): void {
  // 1. Request ID validation
  if (!request.requestID || typeof request.requestID !== 'string') {
    throw new ValidationError(
      'Invalid request ID',
      'INVALID_REQUEST_ID',
      0,
      0
    )
  }
  
  if (request.requestID.length > limits.maxRequestIdLength) {
    throw new ValidationError(
      `Request ID too long (max ${limits.maxRequestIdLength} chars)`,
      'REQUEST_ID_TOO_LONG',
      limits.maxRequestIdLength,
      request.requestID.length
    )
  }
  
  // 2. Property path validation
  const pathSegments = request.propertyPath.split('/').filter(Boolean)
  
  if (pathSegments.length > limits.maxPathDepth) {
    throw new ValidationError(
      `Property path too deep (max ${limits.maxPathDepth} levels)`,
      'PATH_TOO_DEEP',
      limits.maxPathDepth,
      pathSegments.length
    )
  }
  
  for (const segment of pathSegments) {
    if (segment.length > limits.maxPropertyLength) {
      throw new ValidationError(
        `Property name too long (max ${limits.maxPropertyLength} chars)`,
        'PROPERTY_TOO_LONG',
        limits.maxPropertyLength,
        segment.length
      )
    }
  }
  
  // 3. Arguments validation
  if (!Array.isArray(request.args)) {
    throw new ValidationError(
      'Arguments must be an array',
      'INVALID_ARGS',
      0,
      0
    )
  }
  
  if (request.args.length > limits.maxArgCount) {
    throw new ValidationError(
      `Too many arguments (max ${limits.maxArgCount})`,
      'TOO_MANY_ARGS',
      limits.maxArgCount,
      request.args.length
    )
  }
  
  // 4. Size validation
  let totalSize = 0
  for (let i = 0; i < request.args.length; i++) {
    const argSize = calculateSize(request.args[i])
    
    if (argSize > limits.maxArgSize) {
      throw new ValidationError(
        `Argument ${i} too large (max ${limits.maxArgSize} bytes)`,
        'ARG_TOO_LARGE',
        limits.maxArgSize,
        argSize
      )
    }
    
    totalSize += argSize
    
    if (totalSize > limits.maxTotalArgSize) {
      throw new ValidationError(
        `Total arguments size too large (max ${limits.maxTotalArgSize} bytes)`,
        'TOTAL_ARGS_TOO_LARGE',
        limits.maxTotalArgSize,
        totalSize
      )
    }
  }
  
  // 5. Operation type validation
  const validOperations = ['call', 'construct', 'set', 'await']
  if (!validOperations.includes(request.operationType)) {
    throw new ValidationError(
      `Invalid operation type: ${request.operationType}`,
      'INVALID_OPERATION',
      0,
      0
    )
  }
}
```

### 4. Integration in Provider

```typescript
// packages/core/src/rpc-provider.ts - Erweiterte Version
import { validateRequest } from './rpc-validator'
import { RpcLimits, DEFAULT_LIMITS } from './rpc-limits'

export interface ProvideConfig {
  allowWrite?: boolean
  name?: string
  limits?: Partial<RpcLimits>
}

export function provide(
  data: any, 
  endpoint: PostMessageEndpoint, 
  config: ProvideConfig = {}
): void {
  const { 
    allowWrite = false, 
    name = (__DEV__ || __PROD_DEVTOOLS__) ? getCaller() : '',
    limits = {}
  } = config
  
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits }
  
  const messageListener = async (event: MessageEvent) => {
    const messageData: RemoteCallRequest = event.data
    
    try {
      // Validate request before processing
      validateRequest(messageData, effectiveLimits)
    } catch (error) {
      if (error instanceof ValidationError) {
        return sendResponse(null, {
          message: error.message,
          code: error.code,
          limit: error.limit,
          actual: error.actual
        })
      }
      throw error
    }
    
    // ... rest of the implementation
  }
}
```

### 5. Integration in Consumer

```typescript
// packages/core/src/rpc-consumer.ts - Erweiterte Version
export interface ConsumeConfig {
  timeout?: number
  name?: string
  limits?: Partial<RpcLimits>
  maxPendingRequests?: number
}

export function consume<T = any>(
  endpoint: PostMessageEndpoint, 
  config: ConsumeConfig = {}
): Remote<T> {
  const { 
    timeout = 0, 
    name = (__DEV__ || __PROD_DEVTOOLS__) ? getCaller() : '',
    limits = {},
    maxPendingRequests = DEFAULT_LIMITS.maxPendingRequests
  } = config
  
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits }
  
  const remoteCall = (
    operationType: "call" | "construct" | "set" | "await",
    propertyPath: string,
    args: any[]
  ): Promise<any> => {
    // Check pending requests limit
    if (pendingPromises.size >= maxPendingRequests) {
      return Promise.reject(new Error(
        `Too many pending requests (max ${maxPendingRequests})`
      ))
    }
    
    const messageData: RemoteCallRequest = {
      requestID: crypto.randomUUID(),
      operationType,
      propertyPath,
      args,
      consumerID,
      realmID
    }
    
    // Pre-validate on consumer side
    try {
      validateRequest(messageData, effectiveLimits)
    } catch (error) {
      return Promise.reject(error)
    }
    
    // ... rest of implementation
  }
}
```

## Tests

```typescript
// packages/core/__tests__/rpc-validator.spec.ts
import { describe, it, expect } from 'vitest'
import { validateRequest } from '../src/rpc-validator'
import { ValidationError, DEFAULT_LIMITS } from '../src/rpc-limits'

describe('RPC Request Validation', () => {
  const validRequest = {
    requestID: 'test-123',
    consumerID: 'consumer-456',
    realmID: 'realm-789',
    operationType: 'call' as const,
    propertyPath: 'api/method',
    args: [1, 2, 3]
  }
  
  it('should accept valid requests', () => {
    expect(() => validateRequest(validRequest)).not.toThrow()
  })
  
  it('should reject too many arguments', () => {
    const request = {
      ...validRequest,
      args: new Array(101).fill(0)
    }
    
    expect(() => validateRequest(request)).toThrow(ValidationError)
    expect(() => validateRequest(request)).toThrow('Too many arguments')
  })
  
  it('should reject deep property paths', () => {
    const request = {
      ...validRequest,
      propertyPath: new Array(21).fill('prop').join('/')
    }
    
    expect(() => validateRequest(request)).toThrow('Property path too deep')
  })
  
  it('should reject large arguments', () => {
    const request = {
      ...validRequest,
      args: ['x'.repeat(1024 * 1024 + 1)]
    }
    
    expect(() => validateRequest(request)).toThrow('Argument 0 too large')
  })
  
  it('should calculate object sizes correctly', () => {
    const request = {
      ...validRequest,
      args: [{
        nested: {
          array: [1, 2, 3, 4, 5],
          string: 'Hello World',
          date: new Date()
        }
      }]
    }
    
    expect(() => validateRequest(request)).not.toThrow()
  })
  
  it('should handle circular references', () => {
    const circular: any = { a: 1 }
    circular.self = circular
    
    const request = {
      ...validRequest,
      args: [circular]
    }
    
    expect(() => validateRequest(request)).not.toThrow()
  })
})
```

## Migration Guide

### 1. Provider-Seite

```typescript
// Alt
provide(myApi, endpoint, { allowWrite: true })

// Neu - mit Standard-Limits
provide(myApi, endpoint, { allowWrite: true })

// Neu - mit angepassten Limits
provide(myApi, endpoint, { 
  allowWrite: true,
  limits: {
    maxArgCount: 50,
    maxArgSize: 512 * 1024 // 512KB
  }
})
```

### 2. Consumer-Seite

```typescript
// Alt
const api = consume<MyAPI>(endpoint)

// Neu - mit Standard-Limits
const api = consume<MyAPI>(endpoint)

// Neu - mit angepassten Limits
const api = consume<MyAPI>(endpoint, {
  limits: {
    maxPathDepth: 10,
    maxPendingRequests: 500
  }
})
```

## Performance-Überlegungen

1. **Pre-Validation**: Validierung auf Consumer-Seite verhindert unnötige Netzwerk-Kommunikation
2. **Size Calculation**: Caching für wiederholte Größenberechnungen möglich
3. **WeakSet für Circular References**: Verhindert Endlosschleifen effizient

## Sicherheitsaspekte

1. **DoS-Schutz**: Limits verhindern Resource-Exhaustion
2. **Stack-Overflow-Schutz**: Path-Depth-Limit verhindert zu tiefe Rekursion
3. **Memory-Schutz**: Size-Limits verhindern Out-of-Memory-Fehler
4. **Konfigurierbar**: Limits können je nach Use-Case angepasst werden

## Kompatibilität

Die Implementierung ist vollständig rückwärtskompatibel:
- Ohne explizite Limits werden sinnvolle Defaults verwendet
- Bestehender Code funktioniert unverändert
- Neue Limits können schrittweise eingeführt werden