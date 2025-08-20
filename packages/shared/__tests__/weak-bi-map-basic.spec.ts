import { describe, expect, it } from 'vitest'
import { WeakBiMap } from '../src/weak-bi-map'

describe('WeakBiMap basic functionality', () => {
  it('should handle basic map operations', () => {
    const map = new WeakBiMap<string, object>()
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    
    // Set and get
    map.set('key1', obj1)
    map.set('key2', obj2)
    
    expect(map.get('key1')).toBe(obj1)
    expect(map.get('key2')).toBe(obj2)
    expect(map.get('key3')).toBeUndefined()
    
    // Has
    expect(map.has('key1')).toBe(true)
    expect(map.has('key2')).toBe(true)
    expect(map.has('key3')).toBe(false)
    
    // Size
    expect(map.size).toBe(2)
    
    // Delete
    map.delete('key1')
    expect(map.has('key1')).toBe(false)
    expect(map.size).toBe(1)
    
    // Clear
    map.clear()
    expect(map.size).toBe(0)
  })

  it('should handle forEach', () => {
    const map = new WeakBiMap<string, object>()
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    
    map.set('key1', obj1)
    map.set('key2', obj2)
    
    const collected: [string, object][] = []
    map.forEach((value, key) => {
      collected.push([key, value])
    })
    
    expect(collected).toHaveLength(2)
    expect(collected).toContainEqual(['key1', obj1])
    expect(collected).toContainEqual(['key2', obj2])
  })

  it('should handle iterators', () => {
    const map = new WeakBiMap<string, object>()
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    
    map.set('key1', obj1)
    map.set('key2', obj2)
    
    // Keys iterator
    const keys = [...map.keys()]
    expect(keys).toHaveLength(2)
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    
    // Values iterator
    const values = [...map.values()]
    expect(values).toHaveLength(2)
    expect(values).toContain(obj1)
    expect(values).toContain(obj2)
    
    // Entries iterator
    const entries = [...map.entries()]
    expect(entries).toHaveLength(2)
    expect(entries).toContainEqual(['key1', obj1])
    expect(entries).toContainEqual(['key2', obj2])
  })

  it('should be iterable', () => {
    const map = new WeakBiMap<string, object>()
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    
    map.set('key1', obj1)
    map.set('key2', obj2)
    
    const collected: [string, object][] = []
    for (const entry of map) {
      collected.push(entry)
    }
    
    expect(collected).toHaveLength(2)
    expect(collected).toContainEqual(['key1', obj1])
    expect(collected).toContainEqual(['key2', obj2])
  })

  it('should handle updating existing keys', () => {
    const map = new WeakBiMap<string, object>()
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    
    map.set('key1', obj1)
    expect(map.get('key1')).toBe(obj1)
    
    map.set('key1', obj2)
    expect(map.get('key1')).toBe(obj2)
    expect(map.size).toBe(1)
  })

  it('should handle non-existent operations', () => {
    const map = new WeakBiMap<string, object>()
    
    // Delete non-existent
    expect(map.delete('nonexistent')).toBe(false)
    
    // Get non-existent
    expect(map.get('nonexistent')).toBeUndefined()
    
    // Has non-existent
    expect(map.has('nonexistent')).toBe(false)
  })
})