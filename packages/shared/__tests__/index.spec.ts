import { describe, it, expect } from 'vitest'
import { 
  isNumber, isString, isArray, isObject, isFunction, isDate, isRegExp, isMap, isSet, 
  isSymbol, isPromise, isPlainObject, isIntegerKey,
  removeFromArray, looseEqual, looseIndexOf, hasOwnProperty,
  camelize, hyphenate, capitalize, toRawType,
  EMPTY_OBJ, EMPTY_ARR, NOOP
} from '../src/index'

describe('@remobj/shared', () => {
  // Type Guard Functions
  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(42)).toBe(true)
      expect(isNumber(0)).toBe(true)
      expect(isNumber(-1)).toBe(true)
      expect(isNumber(3.14)).toBe(true)
    })

    it('should return false for non-numbers and invalid numbers', () => {
      expect(isNumber('42')).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
      expect(isNumber(NaN)).toBe(false)
      expect(isNumber(Infinity)).toBe(false)
      expect(isNumber(-Infinity)).toBe(false)
    })
  })

  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true)
      expect(isString('')).toBe(true)
      expect(isString('123')).toBe(true)
    })

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString({})).toBe(false)
      expect(isString([])).toBe(false)
    })
  })

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(new Array())).toBe(true)
    })

    it('should return false for non-arrays', () => {
      expect(isArray('array')).toBe(false)
      expect(isArray({})).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray(undefined)).toBe(false)
    })
  })

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(true)
      expect(isObject(new Date())).toBe(true)
      expect(isObject(/regex/)).toBe(true)
    })

    it('should return false for non-objects and null', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject(true)).toBe(false)
    })
  })

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true)
      expect(isFunction(function() {})).toBe(true)
      expect(isFunction(Date)).toBe(true)
      expect(isFunction(Array.isArray)).toBe(true)
    })

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false)
      expect(isFunction('function')).toBe(false)
      expect(isFunction(123)).toBe(false)
      expect(isFunction(null)).toBe(false)
    })
  })

  describe('isDate', () => {
    it('should return true for Date objects', () => {
      expect(isDate(new Date())).toBe(true)
      expect(isDate(new Date('2023-01-01'))).toBe(true)
    })

    it('should return false for non-Date objects', () => {
      expect(isDate('2023-01-01')).toBe(false)
      expect(isDate(1234567890)).toBe(false)
      expect(isDate({})).toBe(false)
      expect(isDate(null)).toBe(false)
    })
  })

  describe('isRegExp', () => {
    it('should return true for RegExp objects', () => {
      expect(isRegExp(/test/)).toBe(true)
      expect(isRegExp(new RegExp('test'))).toBe(true)
    })

    it('should return false for non-RegExp objects', () => {
      expect(isRegExp('/test/')).toBe(false)
      expect(isRegExp({})).toBe(false)
      expect(isRegExp(null)).toBe(false)
    })
  })

  describe('isMap', () => {
    it('should return true for Map objects', () => {
      expect(isMap(new Map())).toBe(true)
      expect(isMap(new Map([['key', 'value']]))).toBe(true)
    })

    it('should return false for non-Map objects', () => {
      expect(isMap({})).toBe(false)
      expect(isMap([])).toBe(false)
      expect(isMap(new Set())).toBe(false)
      expect(isMap(null)).toBe(false)
    })
  })

  describe('isSet', () => {
    it('should return true for Set objects', () => {
      expect(isSet(new Set())).toBe(true)
      expect(isSet(new Set([1, 2, 3]))).toBe(true)
    })

    it('should return false for non-Set objects', () => {
      expect(isSet({})).toBe(false)
      expect(isSet([])).toBe(false)
      expect(isSet(new Map())).toBe(false)
      expect(isSet(null)).toBe(false)
    })
  })

  describe('isSymbol', () => {
    it('should return true for symbols', () => {
      expect(isSymbol(Symbol())).toBe(true)
      expect(isSymbol(Symbol('test'))).toBe(true)
      expect(isSymbol(Symbol.iterator)).toBe(true)
    })

    it('should return false for non-symbols', () => {
      expect(isSymbol('symbol')).toBe(false)
      expect(isSymbol({})).toBe(false)
      expect(isSymbol(null)).toBe(false)
    })
  })

  describe('isPromise', () => {
    it('should return true for Promise-like objects', () => {
      expect(isPromise(Promise.resolve())).toBe(true)
      expect(isPromise({ then: () => {}, catch: () => {} })).toBe(true)
    })

    it('should return false for non-Promise objects', () => {
      expect(isPromise({})).toBe(false)
      expect(isPromise({ then: 'not a function' })).toBe(false)
      expect(isPromise(null)).toBe(false)
      expect(isPromise('promise')).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ key: 'value' })).toBe(true)
    })

    it('should return false for non-plain objects', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject(null)).toBe(false)
    })
  })

  describe('isIntegerKey', () => {
    it('should return true for integer keys', () => {
      expect(isIntegerKey('0')).toBe(true)
      expect(isIntegerKey('123')).toBe(true)
      expect(isIntegerKey('999')).toBe(true)
    })

    it('should return false for non-integer keys', () => {
      expect(isIntegerKey('NaN')).toBe(false)
      expect(isIntegerKey('-1')).toBe(false)
      expect(isIntegerKey('1.5')).toBe(false)
      expect(isIntegerKey('abc')).toBe(false)
      expect(isIntegerKey('')).toBe(false)
    })
  })

  // Array Utilities
  describe('removeFromArray', () => {
    it('should remove element from array', () => {
      const arr = [1, 2, 3, 4, 3]
      removeFromArray(arr, 3)
      expect(arr).toEqual([1, 2, 4, 3]) // Only removes first occurrence
    })

    it('should do nothing if element not found', () => {
      const arr = [1, 2, 3]
      const original = [...arr]
      removeFromArray(arr, 5)
      expect(arr).toEqual(original)
    })
  })

  describe('looseEqual', () => {
    it('should return true for equal values', () => {
      expect(looseEqual(1, 1)).toBe(true)
      expect(looseEqual('hello', 'hello')).toBe(true)
      expect(looseEqual([1, 2], [1, 2])).toBe(true)
      expect(looseEqual({ a: 1 }, { a: 1 })).toBe(true)
    })

    it('should return false for different values', () => {
      expect(looseEqual(1, 2)).toBe(false)
      expect(looseEqual([1, 2], [2, 1])).toBe(false)
      expect(looseEqual({ a: 1 }, { a: 2 })).toBe(false)
      expect(looseEqual(null, undefined)).toBe(false)
    })
  })

  describe('looseIndexOf', () => {
    it('should find index using loose equality', () => {
      const arr = [{ a: 1 }, { b: 2 }]
      expect(looseIndexOf(arr, { a: 1 })).toBe(0)
      expect(looseIndexOf(arr, { b: 2 })).toBe(1)
    })

    it('should return -1 if not found', () => {
      const arr = [{ a: 1 }, { b: 2 }]
      expect(looseIndexOf(arr, { c: 3 })).toBe(-1)
      expect(looseIndexOf(arr, null)).toBe(-1)
    })
  })

  describe('hasOwnProperty', () => {
    it('should return true for own properties', () => {
      const obj = { a: 1, b: 2 }
      expect(hasOwnProperty(obj, 'a')).toBe(true)
      expect(hasOwnProperty(obj, 'b')).toBe(true)
    })

    it('should return false for inherited or non-existent properties', () => {
      const obj = { a: 1 }
      expect(hasOwnProperty(obj, 'toString')).toBe(false)
      expect(hasOwnProperty(obj, 'nonExistent')).toBe(false)
    })
  })

  // String Utilities
  describe('camelize', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(camelize('hello-world')).toBe('helloWorld')
      expect(camelize('my-component-name')).toBe('myComponentName')
      expect(camelize('simple')).toBe('simple')
    })

    it('should handle edge cases', () => {
      expect(camelize('')).toBe('')
      expect(camelize('already-camelCase')).toBe('alreadyCamelCase')
      expect(camelize('-leading-dash')).toBe('LeadingDash')
    })
  })

  describe('hyphenate', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(hyphenate('helloWorld')).toBe('hello-world')
      expect(hyphenate('myComponentName')).toBe('my-component-name')
      expect(hyphenate('simple')).toBe('simple')
    })

    it('should handle edge cases', () => {
      expect(hyphenate('')).toBe('')
      expect(hyphenate('A')).toBe('a') // Single uppercase letter becomes lowercase
      expect(hyphenate('HTML')).toBe('h-t-m-l') // Multiple uppercase letters
    })
  })

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
      expect(capitalize('a')).toBe('A')
    })

    it('should handle edge cases', () => {
      expect(capitalize('')).toBe('')
      expect(capitalize('HELLO')).toBe('HELLO')
      expect(capitalize('123abc')).toBe('123abc')
    })
  })

  describe('toRawType', () => {
    it('should return correct type names', () => {
      expect(toRawType({})).toBe('Object')
      expect(toRawType([])).toBe('Array')
      expect(toRawType('string')).toBe('String')
      expect(toRawType(123)).toBe('Number')
    })

    it('should handle special cases', () => {
      expect(toRawType(null)).toBe('Null')
      expect(toRawType(undefined)).toBe('Undefined')
      expect(toRawType(new Date())).toBe('Date')
      expect(toRawType(/regex/)).toBe('RegExp')
    })
  })

  // Constants
  describe('EMPTY_OBJ', () => {
    it('should be an empty object', () => {
      expect(EMPTY_OBJ).toEqual({})
      expect(Object.keys(EMPTY_OBJ)).toHaveLength(0)
    })

    it('should be frozen in development', () => {
      // In development, it should be frozen
      if (__DEV__) {
        expect(Object.isFrozen(EMPTY_OBJ)).toBe(true)
      }
    })
  })

  describe('EMPTY_ARR', () => {
    it('should be an empty array', () => {
      expect(EMPTY_ARR).toEqual([])
      expect(EMPTY_ARR).toHaveLength(0)
    })

    it('should be frozen in development', () => {
      // In development, it should be frozen
      if (__DEV__) {
        expect(Object.isFrozen(EMPTY_ARR)).toBe(true)
      }
    })
  })

  describe('NOOP', () => {
    it('should be a function that does nothing', () => {
      expect(isFunction(NOOP)).toBe(true)
      expect(NOOP()).toBeUndefined()
    })

    it('should return undefined', () => {
      const result = NOOP()
      expect(result).toBeUndefined()
    })
  })
})