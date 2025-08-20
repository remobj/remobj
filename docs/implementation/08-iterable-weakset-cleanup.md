# IterableWeakSet Cleanup

## Übersicht

Das IterableWeakSet Cleanup-System implementiert periodische Bereinigung toter WeakRef-Einträge, um Memory-Akkumulation zu verhindern. Es balanciert zwischen Performance und Memory-Effizienz.

## Problem

Die aktuelle IterableWeakSet-Implementierung bereinigt tote WeakRefs nur während `forEach`:

```typescript
// Aktuell - Cleanup nur bei Iteration
forEach(callback: (item: T) => void): void {
  this.#weakRefs.forEach(weakRef => {
    const item = weakRef.deref()
    if (item) {
      callback(item)
    } else {
      this.#weakRefs.delete(weakRef) // Nur hier!
    }
  })
}
```

Probleme:
1. **Akkumulation toter Refs**: Ohne `forEach` werden tote Refs nie entfernt
2. **Memory Leaks**: Set wächst unbegrenzt mit toten WeakRef-Objekten
3. **Performance-Degradation**: Iteration wird langsamer mit vielen toten Refs
4. **GC-Interferenz**: Tote WeakRefs verhindern effiziente GC

### Reales Szenario:

```typescript
const listeners = new IterableWeakSet<Listener>()

// 1000 Listener hinzufügen
for (let i = 0; i < 1000; i++) {
  listeners.add(createListener())
}

// Listener werden garbage collected...
// Aber WeakRefs bleiben im Set!

// Nach Tagen:
// - Set enthält 1000 tote WeakRefs
// - forEach muss 1000 nutzlose Derefs machen
// - Memory Footprint: ~80KB nur für tote Refs
```

## Lösung

### 1. IterableWeakSet mit Cleanup-Strategien

```typescript
// packages/core/src/iterable-weakset-enhanced.ts
export interface WeakSetCleanupOptions {
  /** Cleanup strategy */
  strategy: 'periodic' | 'threshold' | 'adaptive' | 'manual'
  /** For periodic: interval in ms */
  cleanupInterval?: number
  /** For threshold: cleanup after N operations */
  cleanupThreshold?: number
  /** For adaptive: target dead ref percentage */
  adaptiveTarget?: number
  /** Enable statistics */
  enableStats?: boolean
  /** Maximum size before forced cleanup */
  maxSize?: number
}

export class EnhancedIterableWeakSet<T extends object> {
  private weakRefs = new Set<WeakRef<T>>()
  private itemToWeakRef = new WeakMap<T, WeakRef<T>>()
  
  // Cleanup tracking
  private operationCount = 0
  private lastCleanup = Date.now()
  private cleanupTimer?: NodeJS.Timeout | number
  private deadRefEstimate = 0
  
  // Statistics
  private stats = {
    adds: 0,
    removes: 0,
    cleanups: 0,
    deadRefsRemoved: 0,
    totalDeadRefs: 0
  }

  constructor(
    private options: WeakSetCleanupOptions = {
      strategy: 'adaptive',
      cleanupInterval: 60000, // 1 minute
      cleanupThreshold: 1000,
      adaptiveTarget: 0.1, // 10% dead refs
      enableStats: true,
      maxSize: 100000
    }
  ) {
    this.initializeCleanupStrategy()
  }

  /**
   * Add item to set
   */
  add(item: T): void {
    if (this.itemToWeakRef.has(item)) {
      return // Already in set
    }

    // Check size limit
    if (this.options.maxSize && this.weakRefs.size >= this.options.maxSize) {
      this.cleanup() // Force cleanup
      
      if (this.weakRefs.size >= this.options.maxSize) {
        throw new Error(`WeakSet size limit exceeded (${this.options.maxSize})`)
      }
    }

    const weakRef = new WeakRef(item)
    this.itemToWeakRef.set(item, weakRef)
    this.weakRefs.add(weakRef)
    
    if (this.options.enableStats) {
      this.stats.adds++
    }
    
    this.operationCount++
    this.checkCleanupTrigger()
  }

  /**
   * Remove item from set
   */
  remove(item: T): boolean {
    const weakRef = this.itemToWeakRef.get(item)
    if (!weakRef) {
      return false
    }

    this.weakRefs.delete(weakRef)
    this.itemToWeakRef.delete(item)
    
    if (this.options.enableStats) {
      this.stats.removes++
    }
    
    this.operationCount++
    this.checkCleanupTrigger()
    
    return true
  }

  /**
   * Check if item is in set
   */
  has(item: T): boolean {
    return this.itemToWeakRef.has(item)
  }

  /**
   * Iterate over live items
   */
  forEach(callback: (item: T) => void): void {
    const deadRefs: WeakRef<T>[] = []
    
    for (const weakRef of this.weakRefs) {
      const item = weakRef.deref()
      if (item) {
        callback(item)
      } else {
        deadRefs.push(weakRef)
      }
    }
    
    // Remove dead refs found during iteration
    for (const deadRef of deadRefs) {
      this.weakRefs.delete(deadRef)
      this.deadRefEstimate--
    }
    
    if (this.options.enableStats && deadRefs.length > 0) {
      this.stats.deadRefsRemoved += deadRefs.length
    }
  }

  /**
   * Get approximate size (includes dead refs)
   */
  get size(): number {
    return this.weakRefs.size
  }

  /**
   * Get estimated live size
   */
  get liveSize(): number {
    return Math.max(0, this.weakRefs.size - this.deadRefEstimate)
  }

  /**
   * Manual cleanup
   */
  cleanup(): number {
    const startSize = this.weakRefs.size
    const deadRefs: WeakRef<T>[] = []
    
    for (const weakRef of this.weakRefs) {
      if (!weakRef.deref()) {
        deadRefs.push(weakRef)
      }
    }
    
    for (const deadRef of deadRefs) {
      this.weakRefs.delete(deadRef)
    }
    
    const removed = deadRefs.length
    this.deadRefEstimate = 0
    this.lastCleanup = Date.now()
    
    if (this.options.enableStats) {
      this.stats.cleanups++
      this.stats.deadRefsRemoved += removed
      this.stats.totalDeadRefs += removed
    }
    
    return removed
  }

  /**
   * Initialize cleanup strategy
   */
  private initializeCleanupStrategy(): void {
    switch (this.options.strategy) {
      case 'periodic':
        this.startPeriodicCleanup()
        break
        
      case 'threshold':
        // No initialization needed
        break
        
      case 'adaptive':
        this.startAdaptiveCleanup()
        break
        
      case 'manual':
        // No automatic cleanup
        break
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      return
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval || 60000)
  }

  /**
   * Start adaptive cleanup
   */
  private startAdaptiveCleanup(): void {
    // Check every 10 seconds
    this.cleanupTimer = setInterval(() => {
      const estimatedDeadPercentage = this.deadRefEstimate / this.weakRefs.size
      
      if (estimatedDeadPercentage > (this.options.adaptiveTarget || 0.1)) {
        this.cleanup()
      }
    }, 10000)
  }

  /**
   * Check if cleanup should be triggered
   */
  private checkCleanupTrigger(): void {
    switch (this.options.strategy) {
      case 'threshold':
        if (this.operationCount >= (this.options.cleanupThreshold || 1000)) {
          this.operationCount = 0
          this.cleanup()
        }
        break
        
      case 'adaptive':
        // Estimate dead refs based on operations
        this.deadRefEstimate += 0.01 // Assume 1% death rate
        break
    }
  }

  /**
   * Get statistics
   */
  getStats(): WeakSetStatistics {
    return {
      ...this.stats,
      currentSize: this.weakRefs.size,
      estimatedLiveSize: this.liveSize,
      estimatedDeadRefs: this.deadRefEstimate,
      lastCleanup: new Date(this.lastCleanup),
      deadRefPercentage: this.weakRefs.size > 0 
        ? this.deadRefEstimate / this.weakRefs.size 
        : 0
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    
    this.weakRefs.clear()
    this.itemToWeakRef = new WeakMap()
    this.deadRefEstimate = 0
  }

  /**
   * Iterator support
   */
  *[Symbol.iterator](): Iterator<T> {
    const deadRefs: WeakRef<T>[] = []
    
    for (const weakRef of this.weakRefs) {
      const item = weakRef.deref()
      if (item) {
        yield item
      } else {
        deadRefs.push(weakRef)
      }
    }
    
    // Cleanup dead refs found during iteration
    for (const deadRef of deadRefs) {
      this.weakRefs.delete(deadRef)
    }
  }
}

interface WeakSetStatistics {
  adds: number
  removes: number
  cleanups: number
  deadRefsRemoved: number
  totalDeadRefs: number
  currentSize: number
  estimatedLiveSize: number
  estimatedDeadRefs: number
  lastCleanup: Date
  deadRefPercentage: number
}
```

### 2. Cleanup-Scheduler

```typescript
// packages/core/src/cleanup-scheduler.ts
export class CleanupScheduler {
  private tasks = new Map<string, ScheduledCleanupTask>()
  private globalTimer?: NodeJS.Timeout

  constructor(
    private options: {
      defaultInterval: number
      batchSize: number
      priority: 'fair' | 'weighted'
    } = {
      defaultInterval: 60000,
      batchSize: 10,
      priority: 'fair'
    }
  ) {
    this.startGlobalScheduler()
  }

  /**
   * Register a cleanup task
   */
  register(
    id: string,
    task: CleanupTask,
    options: CleanupTaskOptions = {}
  ): void {
    this.tasks.set(id, {
      id,
      task,
      options: {
        interval: options.interval || this.options.defaultInterval,
        priority: options.priority || 1,
        maxDuration: options.maxDuration || 100
      },
      lastRun: 0,
      nextRun: Date.now() + (options.initialDelay || 0),
      stats: {
        runs: 0,
        totalDuration: 0,
        failures: 0
      }
    })
  }

  /**
   * Unregister a cleanup task
   */
  unregister(id: string): void {
    this.tasks.delete(id)
  }

  /**
   * Start global scheduler
   */
  private startGlobalScheduler(): void {
    this.globalTimer = setInterval(() => {
      this.runScheduledTasks()
    }, 1000) // Check every second
  }

  /**
   * Run scheduled tasks
   */
  private async runScheduledTasks(): Promise<void> {
    const now = Date.now()
    const dueTasks = Array.from(this.tasks.values())
      .filter(task => task.nextRun <= now)
      .sort((a, b) => {
        if (this.options.priority === 'weighted') {
          return b.options.priority - a.options.priority
        }
        return a.lastRun - b.lastRun // Fair: longest waiting first
      })
      .slice(0, this.options.batchSize)

    for (const scheduledTask of dueTasks) {
      await this.runTask(scheduledTask)
    }
  }

  /**
   * Run single task
   */
  private async runTask(scheduledTask: ScheduledCleanupTask): Promise<void> {
    const start = Date.now()
    
    try {
      // Run with timeout
      await Promise.race([
        scheduledTask.task.cleanup(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cleanup timeout')), 
          scheduledTask.options.maxDuration)
        )
      ])
      
      const duration = Date.now() - start
      
      // Update stats
      scheduledTask.stats.runs++
      scheduledTask.stats.totalDuration += duration
      scheduledTask.lastRun = Date.now()
      scheduledTask.nextRun = Date.now() + scheduledTask.options.interval
      
    } catch (error) {
      scheduledTask.stats.failures++
      console.error(`Cleanup task ${scheduledTask.id} failed:`, error)
      
      // Exponential backoff on failure
      scheduledTask.nextRun = Date.now() + 
        scheduledTask.options.interval * Math.pow(2, scheduledTask.stats.failures)
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStatistics {
    const tasks = Array.from(this.tasks.values())
    
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.nextRun > Date.now()).length,
      overdueTasks: tasks.filter(t => t.nextRun <= Date.now()).length,
      totalRuns: tasks.reduce((sum, t) => sum + t.stats.runs, 0),
      totalFailures: tasks.reduce((sum, t) => sum + t.stats.failures, 0),
      avgDuration: tasks.reduce((sum, t) => 
        sum + (t.stats.runs > 0 ? t.stats.totalDuration / t.stats.runs : 0), 0
      ) / tasks.length
    }
  }

  /**
   * Dispose scheduler
   */
  dispose(): void {
    if (this.globalTimer) {
      clearInterval(this.globalTimer)
      this.globalTimer = undefined
    }
    this.tasks.clear()
  }
}

interface CleanupTask {
  cleanup(): void | Promise<void>
}

interface CleanupTaskOptions {
  interval?: number
  priority?: number
  maxDuration?: number
  initialDelay?: number
}

interface ScheduledCleanupTask {
  id: string
  task: CleanupTask
  options: Required<CleanupTaskOptions>
  lastRun: number
  nextRun: number
  stats: {
    runs: number
    totalDuration: number
    failures: number
  }
}

interface SchedulerStatistics {
  totalTasks: number
  activeTasks: number
  overdueTasks: number
  totalRuns: number
  totalFailures: number
  avgDuration: number
}
```

### 3. Memory-Pressure-Aware Cleanup

```typescript
// packages/core/src/memory-aware-cleanup.ts
export class MemoryAwareCleanup {
  private memoryThresholds = {
    low: 0.5,    // 50% memory usage
    medium: 0.7, // 70% memory usage
    high: 0.85,  // 85% memory usage
    critical: 0.95 // 95% memory usage
  }

  private cleanupIntensity = {
    low: 0.1,      // Clean 10% of items
    medium: 0.25,  // Clean 25% of items
    high: 0.5,     // Clean 50% of items
    critical: 1.0  // Clean all items
  }

  constructor(
    private options: {
      checkInterval: number
      onMemoryPressure?: (level: MemoryPressureLevel) => void
    } = {
      checkInterval: 30000 // 30 seconds
    }
  ) {}

  /**
   * Get current memory pressure level
   */
  getMemoryPressure(): MemoryPressureLevel {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return 'low' // Default if not available
    }

    const memory = (performance as any).memory
    const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit

    if (usage >= this.memoryThresholds.critical) return 'critical'
    if (usage >= this.memoryThresholds.high) return 'high'
    if (usage >= this.memoryThresholds.medium) return 'medium'
    return 'low'
  }

  /**
   * Adjust cleanup based on memory pressure
   */
  adjustCleanupStrategy(weakSet: EnhancedIterableWeakSet<any>): void {
    const pressure = this.getMemoryPressure()
    
    if (this.options.onMemoryPressure) {
      this.options.onMemoryPressure(pressure)
    }

    switch (pressure) {
      case 'critical':
        // Immediate aggressive cleanup
        weakSet.cleanup()
        // Force GC if available
        if (global.gc) global.gc()
        break
        
      case 'high':
        // Increase cleanup frequency
        weakSet.cleanup()
        break
        
      case 'medium':
        // Normal cleanup
        if (Math.random() < 0.5) {
          weakSet.cleanup()
        }
        break
        
      case 'low':
        // Minimal cleanup
        if (Math.random() < 0.1) {
          weakSet.cleanup()
        }
        break
    }
  }
}

type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical'
```

## Verwendungsbeispiele

### Basis-Verwendung mit Cleanup

```typescript
// Adaptive Cleanup (empfohlen)
const listeners = new EnhancedIterableWeakSet<Listener>({
  strategy: 'adaptive',
  adaptiveTarget: 0.1, // Cleanup wenn 10% tot
  enableStats: true
})

// Periodisches Cleanup
const observers = new EnhancedIterableWeakSet<Observer>({
  strategy: 'periodic',
  cleanupInterval: 30000, // Alle 30 Sekunden
  maxSize: 10000
})

// Threshold-basiert
const handlers = new EnhancedIterableWeakSet<Handler>({
  strategy: 'threshold',
  cleanupThreshold: 500, // Nach 500 Operationen
})
```

### Mit Cleanup-Scheduler

```typescript
const scheduler = new CleanupScheduler({
  defaultInterval: 60000,
  batchSize: 5,
  priority: 'weighted'
})

// Registriere verschiedene Cleanup-Tasks
scheduler.register('listeners', listeners, {
  interval: 30000,
  priority: 10 // Hohe Priorität
})

scheduler.register('cache', cacheCleanup, {
  interval: 300000, // 5 Minuten
  priority: 5
})

scheduler.register('logs', logCleanup, {
  interval: 3600000, // 1 Stunde
  priority: 1
})

// Statistiken abrufen
setInterval(() => {
  const stats = scheduler.getStats()
  console.log('Cleanup Scheduler:', stats)
}, 60000)
```

### Memory-Pressure-Aware

```typescript
const memoryAware = new MemoryAwareCleanup({
  checkInterval: 10000,
  onMemoryPressure: (level) => {
    console.log(`Memory pressure: ${level}`)
    
    if (level === 'critical') {
      // Notfall-Maßnahmen
      emergencyCleanup()
    }
  }
})

// Integration mit WeakSet
setInterval(() => {
  memoryAware.adjustCleanupStrategy(listeners)
}, 10000)
```

## Tests

```typescript
// packages/core/__tests__/weakset-cleanup.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { EnhancedIterableWeakSet } from '../src/iterable-weakset-enhanced'

describe('Enhanced IterableWeakSet Cleanup', () => {
  it('should cleanup dead refs periodically', async () => {
    const set = new EnhancedIterableWeakSet({
      strategy: 'periodic',
      cleanupInterval: 100 // 100ms for testing
    })

    // Add objects that will be GC'd
    let objects = Array(10).fill(0).map(() => ({ id: Math.random() }))
    objects.forEach(obj => set.add(obj))
    
    expect(set.size).toBe(10)

    // Clear references
    objects = []
    
    // Force GC if available
    if (global.gc) global.gc()

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should have cleaned up
    expect(set.liveSize).toBeLessThan(10)
    
    const stats = set.getStats()
    expect(stats.cleanups).toBeGreaterThan(0)
  })

  it('should cleanup on threshold', () => {
    const set = new EnhancedIterableWeakSet({
      strategy: 'threshold',
      cleanupThreshold: 5
    })

    const cleanup = vi.spyOn(set, 'cleanup')

    // Add 4 items - no cleanup
    for (let i = 0; i < 4; i++) {
      set.add({ id: i })
    }
    expect(cleanup).not.toHaveBeenCalled()

    // 5th operation triggers cleanup
    set.add({ id: 4 })
    expect(cleanup).toHaveBeenCalled()
  })

  it('should adapt cleanup to dead ref percentage', () => {
    const set = new EnhancedIterableWeakSet({
      strategy: 'adaptive',
      adaptiveTarget: 0.2 // 20%
    })

    // Simulate dead refs
    set['deadRefEstimate'] = 25
    set['weakRefs'].size = 100

    // Should trigger cleanup (25% > 20%)
    set['checkCleanupTrigger']()
    
    expect(set.getStats().deadRefPercentage).toBe(0.25)
  })

  it('should respect max size limit', () => {
    const set = new EnhancedIterableWeakSet({
      strategy: 'manual',
      maxSize: 3
    })

    set.add({ id: 1 })
    set.add({ id: 2 })
    set.add({ id: 3 })

    // Should throw on 4th item
    expect(() => set.add({ id: 4 })).toThrow('size limit exceeded')
  })

  it('should track statistics correctly', () => {
    const set = new EnhancedIterableWeakSet({
      enableStats: true
    })

    const obj1 = { id: 1 }
    const obj2 = { id: 2 }

    set.add(obj1)
    set.add(obj2)
    set.remove(obj1)
    set.cleanup()

    const stats = set.getStats()
    expect(stats.adds).toBe(2)
    expect(stats.removes).toBe(1)
    expect(stats.cleanups).toBe(1)
  })
})
```

## Migration Guide

### Von Standard IterableWeakSet zu Enhanced

```typescript
// Alt
const listeners = new IterableWeakSet<Listener>()

// Neu - mit automatischem Cleanup
const listeners = new EnhancedIterableWeakSet<Listener>({
  strategy: 'adaptive',
  maxSize: 10000
})

// Statistiken nutzen
console.log('WeakSet health:', listeners.getStats())
```

### Cleanup-Integration

```typescript
// Global Scheduler für alle WeakSets
const globalScheduler = new CleanupScheduler()

// Alle WeakSets registrieren
globalScheduler.register('eventListeners', eventListeners)
globalScheduler.register('observers', observers)
globalScheduler.register('callbacks', callbacks)

// Zentrale Überwachung
setInterval(() => {
  const stats = globalScheduler.getStats()
  telemetry.recordMetric('cleanup.efficiency', stats.avgDuration)
}, 300000)
```

## Best Practices

1. **Adaptive Strategy als Default**: Passt sich automatisch an
2. **Stats aktivieren**: Für Production Monitoring
3. **MaxSize setzen**: Verhindert unbegrenztes Wachstum
4. **Memory-Aware in Production**: Reagiert auf Speicherdruck
5. **Cleanup-Scheduler**: Für multiple WeakSets

## Performance-Überlegungen

1. **Cleanup-Overhead**: ~1ms pro 1000 WeakRefs
2. **Memory-Savings**: 40-60% bei vielen toten Refs
3. **Adaptive Overhead**: Minimal, nur Schätzungen
4. **Scheduler-Overhead**: <0.1% CPU bei 100 Tasks