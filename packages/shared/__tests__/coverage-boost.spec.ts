import { describe, expect, it } from 'vitest'
import {
  EMPTY_ARR,
  EMPTY_OBJ,
  NOOP,
  isPromise,
  looseEqual,
  looseIndexOf,
  toRawType
} from '../src/index'

describe('shared coverage boost', () => {
  describe('utility functions', () => {
    it('should test isPromise', () => {
      expect(isPromise(Promise.resolve())).toBe(true)
      expect(isPromise(new Promise(() => {}))).toBe(true)
      expect(isPromise({ then: () => {} })).toBe(false)
      expect(isPromise(null)).toBe(false)
      expect(isPromise(undefined)).toBe(false)
      expect(isPromise({})).toBe(false)
    })


    it('should test looseEqual with edge cases', () => {
      // Arrays with different lengths
      expect(looseEqual([1, 2], [1, 2, 3])).toBe(false)
      
      // Empty objects and arrays
      expect(looseEqual({}, {})).toBe(true)
      expect(looseEqual([], [])).toBe(true)
      
      // null and undefined
      expect(looseEqual(null, undefined)).toBe(false)
      expect(looseEqual(null, null)).toBe(true)
      expect(looseEqual(undefined, undefined)).toBe(true)
    })

    it('should test looseIndexOf edge cases', () => {
      // String numbers
      expect(looseIndexOf([1, '2', 3], 2)).toBe(1)
      expect(looseIndexOf(['1', 2, '3'], '2')).toBe(1)
      
      // Not found
      expect(looseIndexOf([], 1)).toBe(-1)
      expect(looseIndexOf([1, 2, 3], 4)).toBe(-1)
    })

    it('should test toRawType with more types', () => {
      expect(toRawType(new Map())).toBe('Map')
      expect(toRawType(new Set())).toBe('Set')
      expect(toRawType(new WeakMap())).toBe('WeakMap')
      expect(toRawType(new WeakSet())).toBe('WeakSet')
      expect(toRawType(Symbol('test'))).toBe('Symbol')
      expect(toRawType(BigInt(123))).toBe('BigInt')
    })
  })

  describe('constants', () => {
    it('should verify constants are properly defined', () => {
      expect(typeof EMPTY_OBJ).toBe('object')
      expect(Object.keys(EMPTY_OBJ)).toHaveLength(0)
      
      expect(Array.isArray(EMPTY_ARR)).toBe(true)
      expect(EMPTY_ARR).toHaveLength(0)
      
      expect(typeof NOOP).toBe('function')
      expect(NOOP()).toBeUndefined()
    })
  })
})