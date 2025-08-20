# Timeout-Handle Fehlerbehandlung

## Übersicht

Die robuste Timeout-Handle Fehlerbehandlung stellt sicher, dass Timeouts auch bei Exceptions korrekt bereinigt werden. Dies verhindert Memory Leaks durch nicht gelöschte Timer und CPU-Verschwendung durch weiter laufende Timeouts.

## Problem

Die aktuelle Implementierung kann Timeout-Handles verlieren:

```typescript
// Aktuell - fehleranfällig
const cleanup = () => {
  pendingPromises.delete(requestID)
  const timeoutHandle = timeoutHandles.get(requestID)
  timeoutHandles.delete(requestID) // Wenn diese Zeile fehlschlägt...
  if (timeoutHandle) clearTimeout(timeoutHandle) // ...wird das nie ausgeführt!
}
```

Probleme:
1. **Exception in Map-Operationen**: Map.delete() könnte theoretisch fehlschlagen
2. **Race Conditions**: Timeout könnte während Cleanup feuern
3. **Doppeltes Cleanup**: Mehrfache Cleanup-Aufrufe könnten Fehler verursachen
4. **Fehlende Fehlerbehandlung**: Keine Recovery-Strategie

### Reale Szenarien:

```typescript
// Szenario 1: Exception während Cleanup
pendingPromises.set(requestId, {
  resolve: (data) => {
    cleanup() // Exception hier...
    return resolve(data) // ...verhindert resolve!
  }
})

// Szenario 2: Timeout feuert während Cleanup
const cleanup = () => {
  // Timeout feuert GENAU HIER
  const handle = timeoutHandles.get(requestID) 
  // Handle ist schon undefined, aber Timer läuft noch!
}

// Szenario 3: Memory Pressure
// Bei niedrigem Speicher könnten Map-Operationen fehlschlagen
```

## Lösung

### 1. Robuste Cleanup-Implementierung

```typescript
// packages/core/src/robust-cleanup.ts
export interface CleanupOperation {
  name: string
  execute: () => void | Promise<void>
  critical?: boolean // If true, failure stops cleanup chain
}

export class RobustCleanup {
  private operations: CleanupOperation[] = []
  private executed = false
  private errors: Array<{ operation: string; error: Error }> = []

  add(operation: CleanupOperation): void {
    if (this.executed) {
      throw new Error('Cannot add operations after cleanup execution')
    }
    this.operations.push(operation)
  }

  async execute(): Promise<void> {
    if (this.executed) {
      return // Idempotent
    }
    
    this.executed = true
    
    for (const operation of this.operations) {
      try {
        await operation.execute()
      } catch (error) {
        this.errors.push({
          operation: operation.name,
          error: error as Error
        })
        
        if (operation.critical) {
          // Stop execution for critical operations
          throw new AggregateError(
            this.errors.map(e => e.error),
            `Critical cleanup operation '${operation.name}' failed`
          )
        }
      }
    }
    
    if (this.errors.length > 0) {
      // Log all errors but don't throw for non-critical
      console.error('Cleanup errors:', this.errors)
    }
  }

  getErrors(): ReadonlyArray<{ operation: string; error: Error }> {
    return [...this.errors]
  }

  reset(): void {
    this.operations = []
    this.executed = false
    this.errors = []
  }
}
```

### 2. Timeout-Manager mit Fehlerbehandlung

```typescript
// packages/core/src/timeout-manager.ts
export interface TimeoutHandle {
  id: string
  timeoutId: NodeJS.Timeout | number
  createdAt: number
  duration: number
  callback: () => void
  cleared: boolean
}

export class TimeoutManager {
  private handles = new Map<string, TimeoutHandle>()
  private cleanupInterval?: NodeJS.Timeout | number
  
  constructor(
    private options: {
      maxTimeouts?: number
      cleanupIntervalMs?: number
      onError?: (error: Error, handle?: TimeoutHandle) => void
    } = {}
  ) {
    if (options.cleanupIntervalMs) {
      this.startPeriodicCleanup()
    }
  }

  set(
    id: string,
    callback: () => void,
    duration: number
  ): void {
    // Check limit
    if (this.options.maxTimeouts && this.handles.size >= this.options.maxTimeouts) {
      throw new Error(`Maximum timeouts (${this.options.maxTimeouts}) exceeded`)
    }

    // Clear existing if any
    this.clearSafely(id)

    // Wrapped callback with error handling
    const wrappedCallback = () => {
      try {
        callback()
      } catch (error) {
        this.handleError(error as Error, this.handles.get(id))
      } finally {
        // Mark as cleared even if callback fails
        const handle = this.handles.get(id)
        if (handle) {
          handle.cleared = true
        }
      }
    }

    // Create new timeout
    const timeoutId = setTimeout(wrappedCallback, duration)
    
    this.handles.set(id, {
      id,
      timeoutId,
      createdAt: Date.now(),
      duration,
      callback,
      cleared: false
    })
  }

  clear(id: string): boolean {
    return this.clearSafely(id)
  }

  private clearSafely(id: string): boolean {
    const handle = this.handles.get(id)
    if (!handle) {
      return false
    }

    try {
      if (!handle.cleared) {
        clearTimeout(handle.timeoutId)
        handle.cleared = true
      }
    } catch (error) {
      this.handleError(error as Error, handle)
      // Continue with cleanup even if clearTimeout fails
    } finally {
      // Always remove from map
      this.handles.delete(id)
    }
    
    return true
  }

  clearAll(): void {
    const errors: Error[] = []
    
    // Collect all IDs first to avoid iterator invalidation
    const ids = Array.from(this.handles.keys())
    
    for (const id of ids) {
      try {
        this.clearSafely(id)
      } catch (error) {
        errors.push(error as Error)
      }
    }
    
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to clear all timeouts')
    }
  }

  private handleError(error: Error, handle?: TimeoutHandle): void {
    if (this.options.onError) {
      try {
        this.options.onError(error, handle)
      } catch (handlerError) {
        // Prevent error handler from breaking cleanup
        console.error('Error in timeout error handler:', handlerError)
      }
    } else {
      console.error('Timeout error:', error, handle)
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired()
    }, this.options.cleanupIntervalMs!)
  }

  private cleanupExpired(): void {
    const now = Date.now()
    const expired: string[] = []
    
    for (const [id, handle] of this.handles) {
      if (handle.cleared && now - handle.createdAt > handle.duration + 1000) {
        // Safety cleanup for cleared timeouts
        expired.push(id)
      }
    }
    
    for (const id of expired) {
      this.handles.delete(id)
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    
    this.clearAll()
  }

  getStats(): {
    active: number
    cleared: number
    total: number
  } {
    let cleared = 0
    for (const handle of this.handles.values()) {
      if (handle.cleared) cleared++
    }
    
    return {
      active: this.handles.size - cleared,
      cleared,
      total: this.handles.size
    }
  }
}
```

### 3. Integration in RPC Consumer

```typescript
// packages/core/src/rpc-consumer-robust.ts
import { TimeoutManager } from './timeout-manager'
import { RobustCleanup } from './robust-cleanup'

export function consumeWithRobustTimeout<T = any>(
  endpoint: PostMessageEndpoint,
  config: ConsumeConfig = {}
): ConsumerHandle<T> {
  const { timeout = 0, name = '' } = config
  
  const pendingPromises = new Map<string, {
    resolve: (data: any) => void
    reject: (data: any) => void
    cleanup: RobustCleanup
  }>()
  
  const timeoutManager = new TimeoutManager({
    maxTimeouts: 10000,
    cleanupIntervalMs: 60000, // Cleanup every minute
    onError: (error, handle) => {
      console.error(`Timeout error for request ${handle?.id}:`, error)
    }
  })

  const createPromise = (requestID: string) => new Promise((resolve, reject) => {
    const cleanup = new RobustCleanup()
    
    // Add cleanup operations in order
    cleanup.add({
      name: 'remove-from-pending',
      execute: () => pendingPromises.delete(requestID),
      critical: false
    })
    
    cleanup.add({
      name: 'clear-timeout',
      execute: () => timeoutManager.clear(requestID),
      critical: false
    })
    
    // Wrapped resolve/reject with cleanup
    const safeResolve = async (data: any) => {
      try {
        await cleanup.execute()
      } finally {
        resolve(data) // Always resolve, even if cleanup fails
      }
    }
    
    const safeReject = async (error: any) => {
      try {
        await cleanup.execute()
      } finally {
        reject(error) // Always reject, even if cleanup fails
      }
    }
    
    pendingPromises.set(requestID, {
      resolve: safeResolve,
      reject: safeReject,
      cleanup
    })

    if (timeout > 0) {
      timeoutManager.set(
        requestID,
        () => {
          const pending = pendingPromises.get(requestID)
          if (pending) {
            pending.reject(new Error(`Request timeout after ${timeout}s`))
          }
        },
        timeout * 1000
      )
    }
  })

  // Handle cleanup
  const handle: ConsumerHandle<T> = {
    proxy: createProxy(''),
    disposed: false,
    
    dispose: async () => {
      if (handle.disposed) return
      handle.disposed = true
      
      const mainCleanup = new RobustCleanup()
      
      // Critical operations first
      mainCleanup.add({
        name: 'remove-event-listener',
        execute: () => {
          multiplexedEndpoint.removeEventListener('message', responseListener)
        },
        critical: true
      })
      
      // Then pending promises
      mainCleanup.add({
        name: 'reject-pending-promises',
        execute: async () => {
          const errors: Error[] = []
          
          for (const [id, pending] of pendingPromises) {
            try {
              await pending.reject(new Error('Consumer disposed'))
            } catch (error) {
              errors.push(error as Error)
            }
          }
          
          if (errors.length > 0) {
            throw new AggregateError(errors, 'Failed to reject pending promises')
          }
        },
        critical: false
      })
      
      // Then timeouts
      mainCleanup.add({
        name: 'clear-all-timeouts',
        execute: () => timeoutManager.dispose(),
        critical: false
      })
      
      // Finally caches
      mainCleanup.add({
        name: 'clear-proxy-cache',
        execute: () => proxyCache.clear(),
        critical: false
      })
      
      await mainCleanup.execute()
    }
  }
  
  return handle
}
```

### 4. Retry-Mechanismus für kritische Operationen

```typescript
// packages/core/src/retry-cleanup.ts
export interface RetryOptions {
  maxAttempts: number
  delayMs: number
  backoff?: 'linear' | 'exponential'
  onRetry?: (attempt: number, error: Error) => void
}

export async function retryCleanup(
  operation: () => void | Promise<void>,
  options: RetryOptions
): Promise<void> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      await operation()
      return // Success
    } catch (error) {
      lastError = error as Error
      
      if (options.onRetry) {
        options.onRetry(attempt, lastError)
      }
      
      if (attempt < options.maxAttempts) {
        const delay = options.backoff === 'exponential'
          ? options.delayMs * Math.pow(2, attempt - 1)
          : options.delayMs * attempt
          
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Verwendung in Cleanup
cleanup.add({
  name: 'clear-critical-resource',
  execute: async () => {
    await retryCleanup(
      () => clearTimeout(handle),
      {
        maxAttempts: 3,
        delayMs: 100,
        backoff: 'exponential',
        onRetry: (attempt, error) => {
          console.warn(`Retry ${attempt} for timeout clear:`, error)
        }
      }
    )
  },
  critical: true
})
```

### 5. Timeout-Monitoring

```typescript
// packages/core/src/timeout-monitor.ts
export class TimeoutMonitor {
  private stats = {
    created: 0,
    cleared: 0,
    expired: 0,
    failed: 0,
    active: new Map<string, { created: Date; duration: number }>()
  }

  onTimeoutCreated(id: string, duration: number): void {
    this.stats.created++
    this.stats.active.set(id, {
      created: new Date(),
      duration
    })
  }

  onTimeoutCleared(id: string, expired: boolean): void {
    if (expired) {
      this.stats.expired++
    } else {
      this.stats.cleared++
    }
    this.stats.active.delete(id)
  }

  onTimeoutFailed(id: string, error: Error): void {
    this.stats.failed++
    console.error(`Timeout ${id} failed:`, error)
  }

  getReport(): TimeoutReport {
    const now = Date.now()
    const overdue: string[] = []
    
    for (const [id, info] of this.stats.active) {
      const elapsed = now - info.created.getTime()
      if (elapsed > info.duration + 5000) { // 5s grace period
        overdue.push(id)
      }
    }
    
    return {
      created: this.stats.created,
      cleared: this.stats.cleared,
      expired: this.stats.expired,
      failed: this.stats.failed,
      active: this.stats.active.size,
      overdue: overdue.length,
      overdueIds: overdue
    }
  }

  reset(): void {
    this.stats = {
      created: 0,
      cleared: 0,
      expired: 0,
      failed: 0,
      active: new Map()
    }
  }
}

interface TimeoutReport {
  created: number
  cleared: number
  expired: number
  failed: number
  active: number
  overdue: number
  overdueIds: string[]
}
```

## Verwendungsbeispiele

### Basis-Verwendung mit robustem Timeout

```typescript
const handle = consumeWithRobustTimeout(endpoint, {
  timeout: 30, // 30 Sekunden
  name: 'api-consumer'
})

try {
  const result = await handle.proxy.someMethod()
} finally {
  // Cleanup wird auch bei Fehler ausgeführt
  await handle.dispose()
}
```

### Mit Monitoring

```typescript
const monitor = new TimeoutMonitor()
const manager = new TimeoutManager({
  onError: (error, handle) => {
    monitor.onTimeoutFailed(handle?.id || 'unknown', error)
  }
})

// Periodisches Reporting
setInterval(() => {
  const report = monitor.getReport()
  if (report.overdue > 0) {
    console.warn(`${report.overdue} timeouts are overdue:`, report.overdueIds)
  }
}, 10000)
```

### Fehlerbehandlung

```typescript
const cleanup = new RobustCleanup()

cleanup.add({
  name: 'database-disconnect',
  execute: async () => {
    await db.disconnect()
  },
  critical: true // Stoppt weitere Cleanup-Operationen bei Fehler
})

cleanup.add({
  name: 'cache-clear',
  execute: () => {
    cache.clear()
  },
  critical: false // Fehler wird geloggt, Cleanup geht weiter
})

try {
  await cleanup.execute()
} catch (error) {
  if (error instanceof AggregateError) {
    console.error('Critical cleanup failed:', error.errors)
  }
}
```

## Tests

```typescript
// packages/core/__tests__/timeout-robust.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { TimeoutManager } from '../src/timeout-manager'
import { RobustCleanup } from '../src/robust-cleanup'

describe('Robust Timeout Handling', () => {
  it('should handle clearTimeout failures', () => {
    const manager = new TimeoutManager()
    const mockError = new Error('clearTimeout failed')
    
    // Mock clearTimeout to throw
    vi.spyOn(global, 'clearTimeout').mockImplementationOnce(() => {
      throw mockError
    })
    
    const onError = vi.fn()
    manager.options.onError = onError
    
    manager.set('test', () => {}, 1000)
    
    // Should not throw
    expect(() => manager.clear('test')).not.toThrow()
    expect(onError).toHaveBeenCalledWith(mockError, expect.any(Object))
  })

  it('should execute cleanup operations in order', async () => {
    const cleanup = new RobustCleanup()
    const order: string[] = []
    
    cleanup.add({
      name: 'first',
      execute: () => { order.push('first') }
    })
    
    cleanup.add({
      name: 'second',
      execute: async () => {
        await new Promise(r => setTimeout(r, 10))
        order.push('second')
      }
    })
    
    cleanup.add({
      name: 'third',
      execute: () => { order.push('third') }
    })
    
    await cleanup.execute()
    expect(order).toEqual(['first', 'second', 'third'])
  })

  it('should continue non-critical cleanup after error', async () => {
    const cleanup = new RobustCleanup()
    const executed: string[] = []
    
    cleanup.add({
      name: 'first',
      execute: () => { executed.push('first') }
    })
    
    cleanup.add({
      name: 'failing',
      execute: () => {
        throw new Error('Cleanup failed')
      },
      critical: false
    })
    
    cleanup.add({
      name: 'third',
      execute: () => { executed.push('third') }
    })
    
    await cleanup.execute()
    expect(executed).toEqual(['first', 'third'])
    expect(cleanup.getErrors()).toHaveLength(1)
  })

  it('should stop on critical failure', async () => {
    const cleanup = new RobustCleanup()
    const executed: string[] = []
    
    cleanup.add({
      name: 'first',
      execute: () => { executed.push('first') }
    })
    
    cleanup.add({
      name: 'critical-failing',
      execute: () => {
        throw new Error('Critical failure')
      },
      critical: true
    })
    
    cleanup.add({
      name: 'never-executed',
      execute: () => { executed.push('never') }
    })
    
    await expect(cleanup.execute()).rejects.toThrow(AggregateError)
    expect(executed).toEqual(['first'])
  })

  it('should be idempotent', async () => {
    const cleanup = new RobustCleanup()
    let count = 0
    
    cleanup.add({
      name: 'increment',
      execute: () => { count++ }
    })
    
    await cleanup.execute()
    await cleanup.execute() // Second call should do nothing
    
    expect(count).toBe(1)
  })
})
```

## Migration Guide

### Von einfachem Cleanup zu robustem Cleanup

```typescript
// Alt - fehleranfällig
const cleanup = () => {
  pendingPromises.delete(requestID)
  timeoutHandles.delete(requestID)
  if (timeoutHandle) clearTimeout(timeoutHandle)
}

// Neu - robust
const cleanup = new RobustCleanup()
cleanup.add({
  name: 'remove-promise',
  execute: () => pendingPromises.delete(requestID)
})
cleanup.add({
  name: 'clear-timeout',
  execute: () => {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
})
cleanup.add({
  name: 'remove-handle',
  execute: () => timeoutHandles.delete(requestID)
})

await cleanup.execute()
```

## Best Practices

1. **Immer try-finally verwenden** für Cleanup-Operationen
2. **Kritische vs. nicht-kritische** Operationen unterscheiden
3. **Idempotenz sicherstellen** - Mehrfaches Cleanup sollte sicher sein
4. **Monitoring einbauen** für Produktionsumgebungen
5. **Graceful Degradation** - Teilweise erfolgreicher Cleanup ist besser als keiner

## Performance-Überlegungen

1. **Cleanup-Overhead**: RobustCleanup hat minimalen Overhead
2. **Periodic Cleanup**: Reduziert Memory-Footprint für lang laufende Apps
3. **Error Handler**: Sollten schnell sein, um Cleanup nicht zu blockieren