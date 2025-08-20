# Property-Sicherheitsvalidierung

## Übersicht

Die Property-Sicherheitsvalidierung schützt vor gefährlichen Property-Zugriffen durch umfassende Validierung von Property-Namen, Pfaden und Zugriffsmustern. Sie verhindert Prototype Pollution, Path Traversal und andere Injektionsangriffe.

## Problem

Die aktuelle Implementierung hat Sicherheitslücken:

```typescript
// Nur einfache Blacklist
const FORBIDDEN_PROPERTIES = ['__proto__', 'prototype', 'constructor']

// Probleme:
// 1. Unicode-Varianten: _\u005F_proto_\u005F_
// 2. Case-Varianten: __PROTO__, ProtoType
// 3. Path Traversal: ../../sensitive
// 4. Null Bytes: property\x00.toString
// 5. Symbol Injection: Symbol.for('__proto__')
```

### Angriffsvektoren:

```typescript
// Prototype Pollution
consumer.proxy.__proto__.isAdmin = true

// Path Traversal
consumer.proxy['../../../etc/passwd']

// Unicode Bypass
consumer.proxy['__pro\u0074o__'].polluted = true

// Null Byte Injection
consumer.proxy['toString\x00.constructor']

// Symbol-basierte Angriffe
consumer.proxy[Symbol.for('__proto__')]
```

## Lösung

### 1. Umfassende Property-Validierung

```typescript
// packages/core/src/property-validator.ts
export interface PropertyValidationOptions {
  /** Allow unicode characters in property names */
  allowUnicode: boolean
  /** Maximum property name length */
  maxLength: number
  /** Allow numeric property names */
  allowNumeric: boolean
  /** Allow symbol properties */
  allowSymbols: boolean
  /** Custom validation function */
  customValidator?: (property: string) => boolean
  /** Security level */
  securityLevel: 'strict' | 'moderate' | 'relaxed'
}

export const DEFAULT_PROPERTY_VALIDATION: PropertyValidationOptions = {
  allowUnicode: false,
  maxLength: 256,
  allowNumeric: true,
  allowSymbols: false,
  securityLevel: 'strict'
}

export class PropertySecurityValidator {
  private static readonly FORBIDDEN_PATTERNS = [
    // Direct matches
    /^__proto__$/i,
    /^prototype$/i,
    /^constructor$/i,
    
    // Variations
    /^_+proto_+$/i,
    /^proto(?:type)?$/i,
    /^const(?:ructor)?$/i,
    
    // Path traversal
    /\.\./,
    /^\//,
    
    // Special characters
    /[\x00-\x1f\x7f]/,  // Control characters
    /[<>'"&]/,          // HTML/XML injection
    
    // Function patterns
    /^(?:eval|function|require|import)$/i,
    /^(?:set|get)[A-Z]/,  // Setter/Getter patterns
    
    // Global access
    /^(?:global|window|self|top|parent)$/i,
    /^(?:process|Buffer|module|exports)$/i
  ]

  private static readonly UNICODE_CONFUSABLES = new Map([
    // Confusable unicode characters
    [/[\u0041\u0391\u0410\u13AA]/g, 'A'], // Various A-like chars
    [/[\u006F\u03BF\u043E\u0D20]/g, 'o'], // Various o-like chars
    [/[\u0065\u0435\u04BD]/g, 'e'],       // Various e-like chars
    [/[\u0070\u0440\u03C1]/g, 'p'],       // Various p-like chars
    [/[\u0074\u03C4\u0442]/g, 't'],       // Various t-like chars
    [/[\u0072\u0433\u1D26]/g, 'r'],       // Various r-like chars
    [/[\u006E\u043F\u0578]/g, 'n'],       // Various n-like chars
    [/[\u0063\u0441\u03F2]/g, 'c'],       // Various c-like chars
    [/[\u0075\u03C5\u057D]/g, 'u'],       // Various u-like chars
    [/[\u005F\u02CD\uFF3F]/g, '_'],       // Various underscore-like
  ])

  constructor(
    private options: PropertyValidationOptions = DEFAULT_PROPERTY_VALIDATION
  ) {}

  validate(property: string | symbol): ValidationResult {
    // Symbol validation
    if (typeof property === 'symbol') {
      return this.validateSymbol(property)
    }

    // String validation
    if (typeof property !== 'string') {
      return {
        valid: false,
        reason: 'Property must be string or symbol',
        sanitized: null
      }
    }

    // Length check
    if (property.length > this.options.maxLength) {
      return {
        valid: false,
        reason: `Property name too long (max ${this.options.maxLength})`,
        sanitized: null
      }
    }

    // Empty string
    if (property.length === 0) {
      return {
        valid: false,
        reason: 'Property name cannot be empty',
        sanitized: null
      }
    }

    // Normalize unicode if needed
    const normalized = this.normalizeProperty(property)

    // Check against forbidden patterns
    for (const pattern of PropertySecurityValidator.FORBIDDEN_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          valid: false,
          reason: `Property matches forbidden pattern: ${pattern}`,
          sanitized: null
        }
      }
    }

    // Numeric validation
    if (!this.options.allowNumeric && /^\d+$/.test(property)) {
      return {
        valid: false,
        reason: 'Numeric properties not allowed',
        sanitized: null
      }
    }

    // Unicode validation
    if (!this.options.allowUnicode && /[^\x00-\x7F]/.test(property)) {
      return {
        valid: false,
        reason: 'Unicode characters not allowed',
        sanitized: null
      }
    }

    // Custom validation
    if (this.options.customValidator && !this.options.customValidator(property)) {
      return {
        valid: false,
        reason: 'Custom validation failed',
        sanitized: null
      }
    }

    // Security level specific checks
    const levelResult = this.validateBySecurityLevel(normalized)
    if (!levelResult.valid) {
      return levelResult
    }

    return {
      valid: true,
      reason: null,
      sanitized: normalized !== property ? normalized : property
    }
  }

  private validateSymbol(symbol: symbol): ValidationResult {
    if (!this.options.allowSymbols) {
      return {
        valid: false,
        reason: 'Symbol properties not allowed',
        sanitized: null
      }
    }

    const description = symbol.description || ''
    
    // Check if it's a well-known symbol
    const wellKnownSymbols = [
      Symbol.iterator,
      Symbol.toStringTag,
      Symbol.hasInstance,
      Symbol.toPrimitive,
      Symbol.species
    ]

    if (wellKnownSymbols.includes(symbol)) {
      return {
        valid: true,
        reason: null,
        sanitized: symbol
      }
    }

    // Validate symbol description
    const descResult = this.validate(description)
    if (!descResult.valid) {
      return {
        valid: false,
        reason: `Symbol description invalid: ${descResult.reason}`,
        sanitized: null
      }
    }

    return {
      valid: true,
      reason: null,
      sanitized: symbol
    }
  }

  private normalizeProperty(property: string): string {
    let normalized = property

    // Replace confusable unicode
    for (const [pattern, replacement] of PropertySecurityValidator.UNICODE_CONFUSABLES) {
      normalized = normalized.replace(pattern, replacement)
    }

    // Normalize unicode
    normalized = normalized.normalize('NFC')

    // Convert to lowercase for comparison
    normalized = normalized.toLowerCase()

    return normalized
  }

  private validateBySecurityLevel(property: string): ValidationResult {
    switch (this.options.securityLevel) {
      case 'strict':
        // Only alphanumeric + underscore
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(property)) {
          return {
            valid: false,
            reason: 'Strict mode: Only alphanumeric and underscore allowed',
            sanitized: null
          }
        }
        break

      case 'moderate':
        // Alphanumeric + common special chars
        if (!/^[a-zA-Z0-9_\-\.\$]+$/.test(property)) {
          return {
            valid: false,
            reason: 'Moderate mode: Invalid characters',
            sanitized: null
          }
        }
        break

      case 'relaxed':
        // Just avoid obvious dangerous patterns
        // Already checked by FORBIDDEN_PATTERNS
        break
    }

    return { valid: true, reason: null, sanitized: property }
  }
}

export interface ValidationResult {
  valid: boolean
  reason: string | null
  sanitized: string | symbol | null
}
```

### 2. Path-Validierung

```typescript
// packages/core/src/path-validator.ts
export class PathSecurityValidator {
  private static readonly MAX_PATH_DEPTH = 20
  private static readonly MAX_PATH_LENGTH = 1024

  static validatePath(path: string): PathValidationResult {
    // Basic validation
    if (!path || typeof path !== 'string') {
      return {
        valid: false,
        reason: 'Invalid path type',
        segments: [],
        depth: 0
      }
    }

    // Length check
    if (path.length > this.MAX_PATH_LENGTH) {
      return {
        valid: false,
        reason: `Path too long (max ${this.MAX_PATH_LENGTH})`,
        segments: [],
        depth: 0
      }
    }

    // Split and filter segments
    const segments = path.split('/').filter(Boolean)

    // Depth check
    if (segments.length > this.MAX_PATH_DEPTH) {
      return {
        valid: false,
        reason: `Path too deep (max ${this.MAX_PATH_DEPTH})`,
        segments,
        depth: segments.length
      }
    }

    // Validate each segment
    const validator = new PropertySecurityValidator()
    const validatedSegments: string[] = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const result = validator.validate(segment)

      if (!result.valid) {
        return {
          valid: false,
          reason: `Invalid segment at position ${i}: ${result.reason}`,
          segments,
          depth: segments.length
        }
      }

      validatedSegments.push(result.sanitized as string || segment)
    }

    // Check for path traversal patterns
    if (this.hasPathTraversal(segments)) {
      return {
        valid: false,
        reason: 'Path traversal detected',
        segments,
        depth: segments.length
      }
    }

    return {
      valid: true,
      reason: null,
      segments: validatedSegments,
      depth: validatedSegments.length,
      sanitizedPath: validatedSegments.join('/')
    }
  }

  private static hasPathTraversal(segments: string[]): boolean {
    let depth = 0

    for (const segment of segments) {
      if (segment === '..') {
        depth--
        if (depth < 0) {
          return true // Attempting to go above root
        }
      } else if (segment !== '.') {
        depth++
      }
    }

    return false
  }
}

export interface PathValidationResult {
  valid: boolean
  reason: string | null
  segments: string[]
  depth: number
  sanitizedPath?: string
}
```

### 3. Integration in RPC Provider

```typescript
// packages/core/src/rpc-provider-secure.ts
import { PropertySecurityValidator } from './property-validator'
import { PathSecurityValidator } from './path-validator'

export interface SecureProvideConfig extends ProvideConfig {
  propertyValidation?: PropertyValidationOptions
  pathValidation?: boolean
  onSecurityViolation?: (violation: SecurityViolation) => void
}

export interface SecurityViolation {
  type: 'property' | 'path' | 'operation'
  property?: string
  path?: string
  operation?: string
  reason: string
  timestamp: Date
  requestId: string
}

export function provideSecure(
  data: any,
  endpoint: PostMessageEndpoint,
  config: SecureProvideConfig = {}
): ProviderHandle {
  const {
    allowWrite = false,
    propertyValidation = DEFAULT_PROPERTY_VALIDATION,
    pathValidation = true,
    onSecurityViolation
  } = config

  const propertyValidator = new PropertySecurityValidator(propertyValidation)
  const securityLog: SecurityViolation[] = []

  const logViolation = (violation: SecurityViolation) => {
    securityLog.push(violation)
    
    // Keep only last 1000 violations
    if (securityLog.length > 1000) {
      securityLog.shift()
    }

    if (onSecurityViolation) {
      try {
        onSecurityViolation(violation)
      } catch (error) {
        console.error('Security violation handler error:', error)
      }
    }
  }

  const messageListener = async (event: MessageEvent) => {
    const messageData: RemoteCallRequest = event.data

    // Validate path
    if (pathValidation) {
      const pathResult = PathSecurityValidator.validatePath(
        messageData.propertyPath
      )

      if (!pathResult.valid) {
        logViolation({
          type: 'path',
          path: messageData.propertyPath,
          reason: pathResult.reason!,
          timestamp: new Date(),
          requestId: messageData.requestID
        })

        return sendResponse(null, new Error(
          `Security violation: ${pathResult.reason}`
        ))
      }

      // Use sanitized path
      messageData.propertyPath = pathResult.sanitizedPath!
    }

    // Parse property chain
    const propertyChain = messageData.propertyPath.split('/').filter(Boolean)

    // Navigate to target with validation
    let target = data
    const navigationLength = propertyChain.length - 
      (messageData.operationType === 'set' ? 1 : 0)

    for (let i = 0; i < navigationLength; i++) {
      const property = propertyChain[i]
      
      // Validate property
      const propResult = propertyValidator.validate(property)
      
      if (!propResult.valid) {
        logViolation({
          type: 'property',
          property,
          reason: propResult.reason!,
          timestamp: new Date(),
          requestId: messageData.requestID
        })

        return sendResponse(null, new Error(
          `Security violation: ${propResult.reason}`
        ))
      }

      // Check if property exists
      if (!isObject(target)) {
        return sendResponse(null, new Error(
          `Cannot access property '${property}' on non-object`
        ))
      }

      // Use sanitized property
      const sanitizedProp = propResult.sanitized || property
      target = target[sanitizedProp]
    }

    // Validate operation-specific security
    switch (messageData.operationType) {
      case 'set':
        if (!allowWrite) {
          logViolation({
            type: 'operation',
            operation: 'set',
            reason: 'Write operations not allowed',
            timestamp: new Date(),
            requestId: messageData.requestID
          })

          return sendResponse(null, new Error('Write not allowed'))
        }

        // Validate property being set
        const setProp = propertyChain[propertyChain.length - 1]
        const setPropResult = propertyValidator.validate(setProp)
        
        if (!setPropResult.valid) {
          logViolation({
            type: 'property',
            property: setProp,
            reason: setPropResult.reason!,
            timestamp: new Date(),
            requestId: messageData.requestID
          })

          return sendResponse(null, new Error(
            `Cannot set property: ${setPropResult.reason}`
          ))
        }
        break

      case 'construct':
        // Additional validation for constructor calls
        if (target === Object || target === Function || target === Array) {
          logViolation({
            type: 'operation',
            operation: 'construct',
            reason: 'Cannot construct built-in types',
            timestamp: new Date(),
            requestId: messageData.requestID
          })

          return sendResponse(null, new Error(
            'Cannot construct built-in types'
          ))
        }
        break
    }

    // ... rest of implementation
  }

  // Return handle with security stats
  const handle = {
    ...baseHandle,
    getSecurityLog: () => [...securityLog],
    clearSecurityLog: () => securityLog.length = 0
  }

  return handle
}
```

### 4. Sandbox-Modus für höchste Sicherheit

```typescript
// packages/core/src/property-sandbox.ts
export class PropertySandbox {
  private allowedProperties = new Set<string>()
  private deniedProperties = new Set<string>()
  private accessLog: PropertyAccess[] = []

  constructor(
    private config: {
      mode: 'whitelist' | 'blacklist'
      logAccess?: boolean
      maxLogSize?: number
    }
  ) {}

  allow(...properties: string[]): void {
    for (const prop of properties) {
      this.allowedProperties.add(prop)
      this.deniedProperties.delete(prop)
    }
  }

  deny(...properties: string[]): void {
    for (const prop of properties) {
      this.deniedProperties.add(prop)
      this.allowedProperties.delete(prop)
    }
  }

  check(property: string, operation: string): boolean {
    const allowed = this.config.mode === 'whitelist'
      ? this.allowedProperties.has(property)
      : !this.deniedProperties.has(property)

    if (this.config.logAccess) {
      this.logAccess({
        property,
        operation,
        allowed,
        timestamp: new Date()
      })
    }

    return allowed
  }

  private logAccess(access: PropertyAccess): void {
    this.accessLog.push(access)
    
    if (this.config.maxLogSize && this.accessLog.length > this.config.maxLogSize) {
      this.accessLog = this.accessLog.slice(-this.config.maxLogSize)
    }
  }

  getAccessLog(): PropertyAccess[] {
    return [...this.accessLog]
  }

  getStatistics(): PropertyAccessStats {
    const stats = {
      totalAccesses: this.accessLog.length,
      allowedAccesses: this.accessLog.filter(a => a.allowed).length,
      deniedAccesses: this.accessLog.filter(a => !a.allowed).length,
      uniqueProperties: new Set(this.accessLog.map(a => a.property)).size,
      byProperty: new Map<string, number>(),
      byOperation: new Map<string, number>()
    }

    for (const access of this.accessLog) {
      stats.byProperty.set(
        access.property,
        (stats.byProperty.get(access.property) || 0) + 1
      )
      stats.byOperation.set(
        access.operation,
        (stats.byOperation.get(access.operation) || 0) + 1
      )
    }

    return stats
  }
}

interface PropertyAccess {
  property: string
  operation: string
  allowed: boolean
  timestamp: Date
}

interface PropertyAccessStats {
  totalAccesses: number
  allowedAccesses: number
  deniedAccesses: number
  uniqueProperties: number
  byProperty: Map<string, number>
  byOperation: Map<string, number>
}
```

## Verwendungsbeispiele

### Basis-Verwendung mit Sicherheitsvalidierung

```typescript
// Strict Mode - nur alphanumerisch
const provider = provideSecure(api, endpoint, {
  propertyValidation: {
    securityLevel: 'strict',
    allowUnicode: false,
    maxLength: 100
  }
})

// Mit Security Violation Handler
const provider = provideSecure(api, endpoint, {
  onSecurityViolation: (violation) => {
    console.error('Security violation:', violation)
    
    // An Monitoring senden
    telemetry.trackSecurityEvent({
      type: 'property_violation',
      details: violation
    })
  }
})
```

### Whitelist-Modus

```typescript
const sandbox = new PropertySandbox({
  mode: 'whitelist',
  logAccess: true
})

// Nur erlaubte Properties
sandbox.allow('getName', 'getAge', 'getEmail')
sandbox.allow('setName', 'setAge') // Selektive Schreibrechte

const provider = provideSecure(api, endpoint, {
  propertyValidation: {
    customValidator: (prop) => sandbox.check(prop, 'access')
  }
})
```

### Unicode-Normalisierung

```typescript
const validator = new PropertySecurityValidator({
  allowUnicode: true,
  securityLevel: 'moderate'
})

// Diese werden alle als '__proto__' erkannt:
validator.validate('__proto__')      // Blocked
validator.validate('__ρroto__')      // Greek rho -> Blocked  
validator.validate('__𝐩roto__')      // Math bold p -> Blocked
validator.validate('_\u005Fproto__') // Unicode underscore -> Blocked
```

### Monitoring und Reporting

```typescript
// Security Dashboard
setInterval(() => {
  const log = provider.getSecurityLog()
  const violations = log.filter(v => v.timestamp > Date.now() - 60000)
  
  if (violations.length > 10) {
    alert('High number of security violations detected!')
  }
  
  // Gruppiere nach Typ
  const byType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('Security violations (last minute):', byType)
}, 60000)
```

## Tests

```typescript
// packages/core/__tests__/property-security.spec.ts
import { describe, it, expect } from 'vitest'
import { PropertySecurityValidator } from '../src/property-validator'
import { PathSecurityValidator } from '../src/path-validator'

describe('Property Security Validation', () => {
  const validator = new PropertySecurityValidator()

  it('should block prototype pollution attempts', () => {
    const dangerous = [
      '__proto__',
      '__PROTO__',
      'ProtoType',
      'conSTRuctor',
      '_' + '_proto_' + '_',
      '__pr' + 'oto__'
    ]

    for (const prop of dangerous) {
      const result = validator.validate(prop)
      expect(result.valid).toBe(false)
    }
  })

  it('should detect unicode confusables', () => {
    const confusables = [
      '__ρroto__',   // Greek rho
      '__рroto__',   // Cyrillic r
      '__prοto__',   // Greek omicron
      '_＿proto＿_'  // Fullwidth underscore
    ]

    for (const prop of confusables) {
      const result = validator.validate(prop)
      expect(result.valid).toBe(false)
    }
  })

  it('should validate paths correctly', () => {
    const validPaths = [
      'api/users/get',
      'data/items/123',
      'methods/calculate'
    ]

    for (const path of validPaths) {
      const result = PathSecurityValidator.validatePath(path)
      expect(result.valid).toBe(true)
    }
  })

  it('should detect path traversal', () => {
    const traversals = [
      '../../../etc/passwd',
      'api/../../../admin',
      './../../sensitive',
      'data/../../config'
    ]

    for (const path of traversals) {
      const result = PathSecurityValidator.validatePath(path)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('traversal')
    }
  })

  it('should handle different security levels', () => {
    const strict = new PropertySecurityValidator({
      securityLevel: 'strict'
    })

    const moderate = new PropertySecurityValidator({
      securityLevel: 'moderate'
    })

    const relaxed = new PropertySecurityValidator({
      securityLevel: 'relaxed'
    })

    // Property with special chars
    const prop = 'get-user-name'

    expect(strict.validate(prop).valid).toBe(false)
    expect(moderate.validate(prop).valid).toBe(true)
    expect(relaxed.validate(prop).valid).toBe(true)
  })
})
```

## Migration Guide

### Von einfacher Blacklist zu Security Validator

```typescript
// Alt - unsicher
const FORBIDDEN = ['__proto__', 'prototype', 'constructor']
if (FORBIDDEN.includes(property)) {
  throw new Error('Forbidden property')
}

// Neu - sicher
const validator = new PropertySecurityValidator()
const result = validator.validate(property)
if (!result.valid) {
  throw new Error(`Security violation: ${result.reason}`)
}
```

### Schrittweise Migration

```typescript
// Phase 1: Logging only
const provider = provideSecure(api, endpoint, {
  propertyValidation: {
    securityLevel: 'relaxed'
  },
  onSecurityViolation: (v) => {
    console.warn('Would block:', v)
    // Aber noch nicht blockieren
  }
})

// Phase 2: Moderate security
propertyValidation: {
  securityLevel: 'moderate'
}

// Phase 3: Strict security
propertyValidation: {
  securityLevel: 'strict'
}
```

## Best Practices

1. **Start relaxed**: Beginne mit 'relaxed' Mode und verschärfe schrittweise
2. **Monitor violations**: Logge alle Violations für Analyse
3. **Whitelist für kritische APIs**: Nutze Whitelist-Mode für sensitive Bereiche
4. **Regular Updates**: Aktualisiere Forbidden Patterns regelmäßig
5. **Defense in Depth**: Kombiniere mit anderen Sicherheitsmaßnahmen

## Performance-Überlegungen

1. **Regex Caching**: Patterns werden als static members gecacht
2. **Early Exit**: Validierung stoppt beim ersten Fehler
3. **Normalisierung**: Nur wenn Unicode erlaubt ist
4. **Logging Overhead**: Optional und mit Größenlimit