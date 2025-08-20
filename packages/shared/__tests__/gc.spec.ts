import { describe, it, expect, vi } from 'vitest'
import { onGarbageCollected } from '../src/gc'

describe('onGarbageCollected', () => {
  it('should register cleanup callback for object', () => {
    const obj = { test: 'value' }
    const callback = vi.fn()
    
    // Should not throw when registering
    expect(() => onGarbageCollected(obj, callback)).not.toThrow()
  })

  it('should handle multiple objects with same callback', () => {
    const obj1 = { test: 'value1' }
    const obj2 = { test: 'value2' }
    const callback = vi.fn()
    
    expect(() => {
      onGarbageCollected(obj1, callback)
      onGarbageCollected(obj2, callback)
    }).not.toThrow()
  })

  it('should handle different callbacks for same object', () => {
    const obj = { test: 'value' }
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    
    expect(() => {
      onGarbageCollected(obj, callback1)
      onGarbageCollected(obj, callback2)
    }).not.toThrow()
  })

  it('should handle WeakRef functionality', () => {
    const obj = { test: 'value' }
    const callback = vi.fn()
    
    // Test that we can register without errors
    onGarbageCollected(obj, callback)
    
    // Since we can't actually trigger GC in tests, just verify no errors
    expect(callback).not.toHaveBeenCalled()
  })
})