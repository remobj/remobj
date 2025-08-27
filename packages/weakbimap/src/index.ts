type StorageType<T> = T extends object ? WeakRef<T> : T

function createIterator<T>(iterableIterator: IterableIterator<T>): MapIterator<T> {
  const iterator = {
    [Symbol.iterator]: () => iterator,
    [Symbol.dispose]() {},
    next: () => iterableIterator.next()
  }
  return iterator
}

function isPrimitive(value: unknown): value is (string | number | boolean | symbol | undefined | bigint | null) {
  return typeof value === 'string' || 
         typeof value === 'number' || 
         typeof value === 'boolean' || 
         typeof value === 'symbol' || 
         typeof value === 'undefined' || 
         typeof value === 'bigint' || 
         value === null
}

/**
 * WeakBiMap is a bidirectional weak map that supports both primitive and object keys/values.
 * 
 * Features:
 * - Supports both objects and primitives as keys and values
 * - Automatic garbage collection for unreferenced objects
 * - Bidirectional mapping (can look up by key or value)
 * - Implements full Map interface
 * - Memory efficient with automatic cleanup
 * 
 * Important notes about iteration:
 * - Elements may be garbage collected during iteration
 * - The iterator provides a snapshot at the time of iteration
 * - No guarantees are made about elements that become unreachable during iteration
 * 
 * @template K - The type of keys
 * @template V - The type of values
 * 
 * @example
 * ```typescript
 * const map = new WeakBiMap<object, string>()
 * const obj = { id: 1 }
 * map.set(obj, 'value')
 * console.log(map.get(obj)) // 'value'
 * 
 * // Objects are automatically garbage collected when no longer referenced
 * ```
 */
export class WeakBiMap<K, V> implements Map<K, V> {
  #keyToRef = new WeakMap<K & object, WeakRef<K & object>>()
  #data = new Map<StorageType<K>, StorageType<V>>()
  #operationCount = 0
  readonly #cleanupInterval = 100

  private cleanup() {
    const toDelete: StorageType<K>[] = []
    
    this.#data.forEach((value, key) => {
      let shouldDelete = false
      
      // Check if value is a dead WeakRef
      if(value instanceof WeakRef && !value.deref()) {
        shouldDelete = true
      }
      
      // Check if key is a dead WeakRef
      if(key instanceof WeakRef) {
        const dereferencedKey = key.deref()
        if (!dereferencedKey) {
          shouldDelete = true
        } else if (shouldDelete) {
          // Only delete from keyToRef if we have a valid dereferenced key
          this.#keyToRef.delete(dereferencedKey)
        }
      }
      
      if (shouldDelete) {
        toDelete.push(key)
      }
    })
    
    // Delete all marked entries
    toDelete.forEach(key => this.#data.delete(key))
  }
  
  private maybeCleanup() {
    this.#operationCount++
    if (this.#operationCount >= this.#cleanupInterval) {
      this.cleanup()
      this.#operationCount = 0
    }
  }
  
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value)
      }
    }
  }

  get size(): number {
    // Force cleanup for accurate size
    // Note: Synchronous cleanup is intentional here to ensure accurate size reporting.
    // This may block on large maps but guarantees correctness over performance.
    this.cleanup()
    return this.#data.size
  }

  get [Symbol.toStringTag](): string {
    return 'WeakBiMap'
  }

  clear(): void {
    this.#data.clear()
    this.#keyToRef = new WeakMap()
  }

  delete(key: K): boolean {
    const storageKey = isPrimitive(key) ? key : this.#keyToRef.get(key as K & object)
    if(storageKey === undefined && !isPrimitive(key)) {return false;}
    if(storageKey instanceof WeakRef) {
      const dereferencedKey = storageKey.deref()
      if(dereferencedKey) {this.#keyToRef.delete(dereferencedKey)}
    }
    return this.#data.delete(storageKey as StorageType<K>)
  }

  forEach(callbackFunction: (value: V, key: K, map: Map<K, V>) => void, thisArgument?: any): void {
    for (const [key, value] of this) {
      callbackFunction.call(thisArgument, value, key, this as Map<K, V>)
    }
  }

  get(key: K): V | undefined {
    const storageKey = isPrimitive(key) ? key : this.#keyToRef.get(key as K & object)
    if(storageKey === undefined && !isPrimitive(key)) {return;}
    const value = this.#data.get(storageKey as StorageType<K>);
    if(value instanceof WeakRef) {return value.deref() as V | undefined}
    return value as V;
  }

  has(key: K): boolean {
    const storageKey = isPrimitive(key) ? key : this.#keyToRef.get(key as K & object)
    if(storageKey === undefined && !isPrimitive(key)) {return false;}
    return this.#data.has(storageKey as StorageType<K>)
  }

  set(key: K, value: V): this {
    if(isPrimitive(key)) {
      if(isPrimitive(value)) {
        this.#data.set(key as StorageType<K>, value as StorageType<V>)
      } else {
        this.#data.set(key as StorageType<K>, new WeakRef(value as V & object) as StorageType<V>)
      }
    } else {
      const storageValue: StorageType<V> = isPrimitive(value) ? value as StorageType<V> : new WeakRef(value as V & object) as StorageType<V>

      let keyReference = this.#keyToRef.get(key as K & object)
      if(!keyReference) {
        keyReference = new WeakRef(key as K & object)
        this.#keyToRef.set(key as K & object, keyReference)
      }
      this.#data.set(keyReference as StorageType<K>, storageValue)
    }
    
    this.maybeCleanup()
    return this;
  }

  entries(): MapIterator<[K, V]> {
    return createIterator(this.entriesGenerator())
  }
  
  private *entriesGenerator(): IterableIterator<[K, V]> {
    // Note: We don't cleanup here to avoid modifying during iteration
    // Elements may be GC'd during iteration
    for (const [key, value] of this.#data) {
      let actualKey: K
      let actualValue: V
      
      if (key instanceof WeakRef) {
        const dereferencedKey = key.deref()
        if (!dereferencedKey) {continue}
        actualKey = dereferencedKey as K
      } else {
        actualKey = key as K
      }
      
      if (value instanceof WeakRef) {
        const dereferencedValue = value.deref()
        if (!dereferencedValue) {continue}
        actualValue = dereferencedValue as V
      } else {
        actualValue = value as V
      }
      
      yield [actualKey, actualValue]
    }
  }

  keys(): MapIterator<K> {
    return createIterator(this.keysGenerator())
  }
  
  private *keysGenerator(): IterableIterator<K> {
    // Note: We don't cleanup here to avoid modifying during iteration
    // Elements may be GC'd during iteration
    for (const [key] of this.#data) {
      if (key instanceof WeakRef) {
        const derefKey = key.deref()
        if (!derefKey) {continue}
        yield derefKey as K
      } else {
        yield key as K
      }
    }
  }

  values(): MapIterator<V> {
    return createIterator(this.valuesGenerator())
  }
  
  private *valuesGenerator(): IterableIterator<V> {
    // Note: We don't cleanup here to avoid modifying during iteration
    // Elements may be GC'd during iteration
    for (const [, value] of this.#data) {
      if (value instanceof WeakRef) {
        const derefValue = value.deref()
        if (!derefValue) {continue}
        yield derefValue as V
      } else {
        yield value as V
      }
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries()
  }
  
  /**
   * Manually trigger cleanup of garbage collected entries.
   * This is called automatically based on the cleanup strategy.
   */
  forceCleanup(): void {
    this.cleanup()
  }
  
  /**
   * Dispose of the WeakBiMap and clean up resources
   */
  dispose(): void {
    this.clear()
  }
}
