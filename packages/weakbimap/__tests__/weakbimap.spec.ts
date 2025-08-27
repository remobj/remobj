import { describe, expect, it, beforeEach } from 'vitest'
import { WeakBiMap } from '../src/index'

describe('WeakBiMap', () => {
  let map: WeakBiMap<any, any>

  beforeEach(() => {
    map = new WeakBiMap()
  })

  describe('constructor', () => {
    it('should create an empty map', () => {
      expect(map.size).toBe(0)
    })

    it('should initialize with entries', () => {
      const entries: [string, number][] = [
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]
      map = new WeakBiMap(entries)
      expect(map.size).toBe(3)
      expect(map.get('a')).toBe(1)
      expect(map.get('b')).toBe(2)
      expect(map.get('c')).toBe(3)
    })
  })

  describe('primitive keys and values', () => {
    it('should store and retrieve primitive key-value pairs', () => {
      map.set('key', 'value')
      map.set(123, 456)
      map.set(true, false)
      map.set(Symbol.for('test'), 'symbol-value')
      map.set(null, 'null-value')
      map.set(undefined, 'undefined-value')

      expect(map.get('key')).toBe('value')
      expect(map.get(123)).toBe(456)
      expect(map.get(true)).toBe(false)
      expect(map.get(Symbol.for('test'))).toBe('symbol-value')
      expect(map.get(null)).toBe('null-value')
      expect(map.get(undefined)).toBe('undefined-value')
    })

    it('should handle bigint keys and values', () => {
      const bigKey = BigInt(999999999999999)
      const bigValue = BigInt(111111111111111)
      map.set(bigKey, bigValue)
      expect(map.get(bigKey)).toBe(bigValue)
    })
  })

  describe('object keys and values', () => {
    it('should store and retrieve object key-value pairs', () => {
      const objKey = { id: 1 }
      const objValue = { name: 'test' }
      map.set(objKey, objValue)
      
      expect(map.get(objKey)).toBe(objValue)
      expect(map.has(objKey)).toBe(true)
    })

    it('should handle arrays as keys and values', () => {
      const arrKey = [1, 2, 3]
      const arrValue = ['a', 'b', 'c']
      map.set(arrKey, arrValue)
      
      expect(map.get(arrKey)).toBe(arrValue)
    })

    it('should handle functions as keys and values', () => {
      const fnKey = () => 'key'
      const fnValue = () => 'value'
      map.set(fnKey, fnValue)
      
      expect(map.get(fnKey)).toBe(fnValue)
    })
  })

  describe('mixed types', () => {
    it('should handle primitive keys with object values', () => {
      const objValue = { data: 'test' }
      map.set('primitive-key', objValue)
      
      expect(map.get('primitive-key')).toBe(objValue)
    })

    it('should handle object keys with primitive values', () => {
      const objKey = { id: 1 }
      map.set(objKey, 'primitive-value')
      
      expect(map.get(objKey)).toBe('primitive-value')
    })
  })

  describe('Map interface methods', () => {
    it('should implement has() correctly', () => {
      const key = 'test-key'
      expect(map.has(key)).toBe(false)
      
      map.set(key, 'value')
      expect(map.has(key)).toBe(true)
    })

    it('should implement delete() correctly', () => {
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      
      expect(map.delete('key1')).toBe(true)
      expect(map.has('key1')).toBe(false)
      expect(map.has('key2')).toBe(true)
      expect(map.delete('nonexistent')).toBe(false)
    })

    it('should implement clear() correctly', () => {
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      map.set('key3', 'value3')
      
      expect(map.size).toBe(3)
      map.clear()
      expect(map.size).toBe(0)
      expect(map.has('key1')).toBe(false)
    })

    it('should implement forEach() correctly', () => {
      const entries: [string, number][] = [
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]
      entries.forEach(([k, v]) => map.set(k, v))
      
      const collected: [any, any][] = []
      map.forEach((value, key) => {
        collected.push([key, value])
      })
      
      expect(collected).toEqual(entries)
    })

    it('should handle forEach with this context', () => {
      map.set('key', 'value')
      const context = { multiplier: 2 }
      
      map.forEach(function(this: typeof context, value, key) {
        expect(this.multiplier).toBe(2)
      }, context)
    })
  })

  describe('iterators', () => {
    beforeEach(() => {
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      map.set('key3', 'value3')
    })

    it('should iterate over entries', () => {
      const entries = Array.from(map.entries())
      expect(entries).toHaveLength(3)
      expect(entries).toContainEqual(['key1', 'value1'])
      expect(entries).toContainEqual(['key2', 'value2'])
      expect(entries).toContainEqual(['key3', 'value3'])
    })

    it('should iterate over keys', () => {
      const keys = Array.from(map.keys())
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('should iterate over values', () => {
      const values = Array.from(map.values())
      expect(values).toHaveLength(3)
      expect(values).toContain('value1')
      expect(values).toContain('value2')
      expect(values).toContain('value3')
    })

    it('should be iterable with for...of', () => {
      const entries: [any, any][] = []
      for (const entry of map) {
        entries.push(entry)
      }
      expect(entries).toHaveLength(3)
    })

    it('should support Symbol.iterator', () => {
      const iterator = map[Symbol.iterator]()
      expect(iterator.next).toBeDefined()
    })
  })

  describe('cleanup behavior', () => {
    it('should handle forceCleanup without errors', () => {
      map.set('key1', 'value1')
      map.set({ obj: true }, 'value2')
      
      expect(() => map.forceCleanup()).not.toThrow()
    })

    it('should maintain correct size after cleanup', () => {
      // Add some entries
      map.set('persistent', 'value')
      const obj = { temp: true }
      map.set(obj, 'temp-value')
      
      // Size should be correct
      expect(map.size).toBe(2)
      
      // Force cleanup shouldn't affect live references
      map.forceCleanup()
      expect(map.size).toBe(2)
      expect(map.get('persistent')).toBe('value')
      expect(map.get(obj)).toBe('temp-value')
    })

    it('should trigger cleanup after threshold operations', () => {
      // Perform many operations to trigger automatic cleanup
      for (let i = 0; i < 150; i++) {
        map.set(`key${i}`, `value${i}`)
      }
      
      // Should still have all entries
      expect(map.size).toBe(150)
      
      // All entries should be retrievable
      for (let i = 0; i < 150; i++) {
        expect(map.get(`key${i}`)).toBe(`value${i}`)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle undefined and null distinctly', () => {
      map.set(undefined, 'undefined-value')
      map.set(null, 'null-value')
      
      expect(map.get(undefined)).toBe('undefined-value')
      expect(map.get(null)).toBe('null-value')
      expect(map.size).toBe(2)
    })

    it('should handle empty string key', () => {
      map.set('', 'empty-string-value')
      expect(map.get('')).toBe('empty-string-value')
    })

    it('should handle zero as key', () => {
      map.set(0, 'zero-value')
      expect(map.get(0)).toBe('zero-value')
    })

    it('should handle NaN as key', () => {
      map.set(NaN, 'nan-value')
      expect(map.get(NaN)).toBe('nan-value')
    })

    it('should update existing keys', () => {
      map.set('key', 'initial')
      expect(map.get('key')).toBe('initial')
      
      map.set('key', 'updated')
      expect(map.get('key')).toBe('updated')
      expect(map.size).toBe(1)
    })

    it('should handle Symbol.toStringTag', () => {
      expect(map[Symbol.toStringTag]).toBe('WeakBiMap')
      expect(Object.prototype.toString.call(map)).toBe('[object WeakBiMap]')
    })
  })

  describe('dispose', () => {
    it('should clear the map when disposed', () => {
      map.set('key1', 'value1')
      map.set('key2', 'value2')
      
      expect(map.size).toBe(2)
      map.dispose()
      expect(map.size).toBe(0)
    })
  })

  describe('WeakRef behavior simulation', () => {
    it('should handle mixed object and primitive storage', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      
      // Object key, object value
      map.set(obj1, obj2)
      // Object key, primitive value
      map.set(obj2, 'primitive')
      // Primitive key, object value
      map.set('primitive', obj1)
      // Primitive key, primitive value
      map.set(123, 456)
      
      expect(map.get(obj1)).toBe(obj2)
      expect(map.get(obj2)).toBe('primitive')
      expect(map.get('primitive')).toBe(obj1)
      expect(map.get(123)).toBe(456)
      expect(map.size).toBe(4)
    })

    it('should correctly delete object keys', () => {
      const obj = { test: true }
      map.set(obj, 'value')
      
      expect(map.has(obj)).toBe(true)
      expect(map.delete(obj)).toBe(true)
      expect(map.has(obj)).toBe(false)
      expect(map.delete(obj)).toBe(false)
    })
  })
})