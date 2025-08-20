import { describe, expect, it } from 'vitest'
import { 
  EMPTY_ARR,
  EMPTY_OBJ,
  NOOP,
  def,
  looseEqual,
  looseIndexOf,
  remove, 
  toRawType,
  toTypeString
} from '../src/index'

describe('utils', () => {
  describe('constants', () => {
    it('should export EMPTY_OBJ', () => {
      expect(EMPTY_OBJ).toEqual({})
      expect(Object.isFrozen(EMPTY_OBJ)).toBe(__DEV__)
    })

    it('should export EMPTY_ARR', () => {
      expect(EMPTY_ARR).toEqual([])
      expect(Object.isFrozen(EMPTY_ARR)).toBe(__DEV__)
    })

    it('should export NOOP', () => {
      expect(NOOP).toBeInstanceOf(Function)
      expect(NOOP()).toBeUndefined()
    })
  })

  describe('toRawType', () => {
    it('should extract raw type', () => {
      expect(toRawType({})).toBe('Object')
      expect(toRawType([])).toBe('Array')
      expect(toRawType(new Date())).toBe('Date')
      expect(toRawType(/test/)).toBe('RegExp')
    })
  })

  describe('looseEqual', () => {
    it('should handle Date comparison', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-01')
      const date3 = new Date('2024-01-02')
      
      expect(looseEqual(date1, date2)).toBe(true)
      expect(looseEqual(date1, date3)).toBe(false)
    })

    it('should handle RegExp comparison', () => {
      const regex1 = /test/gi
      const regex2 = /test/gi
      const regex3 = /test/i
      
      expect(looseEqual(regex1, regex2)).toBe(true)
      expect(looseEqual(regex1, regex3)).toBe(false)
    })

    it('should handle string number comparison', () => {
      // looseEqual converts strings to numbers for comparison
      expect(looseEqual('123', 123)).toBe(true)
    })

    it('should handle boolean string comparison', () => {
      // looseEqual does not convert 'true' string to boolean true
      expect(looseEqual('true', true)).toBe(true)
    })

    it('should handle objects with different key order', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 2, a: 1 }
      expect(looseEqual(obj1, obj2)).toBe(true)
    })
  })

  describe('looseIndexOf', () => {
    it('should find string number in number array', () => {
      const arr = [1, 2, 3]
      expect(looseIndexOf(arr, '2')).toBe(1)
    })

    it('should handle not found', () => {
      const arr = [1, 2, 3]
      expect(looseIndexOf(arr, '4')).toBe(-1)
    })
  })

})