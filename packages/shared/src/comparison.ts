/**
 * Comparison utilities for loose equality checks
 */

import { isArray, isDate, isObject, isSymbol } from './index'

/**
 * Compares two arrays for loose equality, element by element.
 * 
 * @param firstArray - The first array to compare
 * @param secondArray - The second array to compare
 * @returns True if arrays have the same length and all elements are loosely equal
 * @internal
 */
/* @__NO_SIDE_EFFECTS__ */
const looseCompareArrays = (firstArray: unknown[], secondArray: unknown[]): boolean => {
  if (firstArray.length !== secondArray.length) {
    return false
  }
  let equal = true
  for (let index = 0; equal && index < firstArray.length; index += 1) {
    equal = /*#__PURE__*/ looseEqual(firstArray[index], secondArray[index])
  }
  return equal
}

/**
 * Performs a deep loose equality comparison between two values.
 * Handles special cases for dates, arrays, objects, and other types.
 * 
 * - Dates are compared by their time value
 * - Arrays are compared element by element recursively
 * - Objects are compared by their enumerable properties recursively
 * - Other values fall back to string comparison
 * 
 * @param firstValue - The first value to compare
 * @param secondValue - The second value to compare
 * @returns True if the values are loosely equal
 * 
 * @example
 * ```typescript
 * // Primitive values
 * console.log(looseEqual(1, 1))           // true
 * console.log(looseEqual('1', 1))         // true (string comparison)
 * 
 * // Dates
 * const date1 = new Date('2024-01-01')
 * const date2 = new Date('2024-01-01')
 * console.log(looseEqual(date1, date2))   // true
 * 
 * // Arrays
 * console.log(looseEqual([1, 2], [1, 2])) // true
 * console.log(looseEqual([1, [2]], [1, [2]])) // true (recursive)
 * 
 * // Objects
 * console.log(looseEqual({a: 1}, {a: 1})) // true
 * console.log(looseEqual({a: 1, b: 2}, {b: 2, a: 1})) // true
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const looseEqual = (firstValue: unknown, secondValue: unknown): boolean => {
  if (firstValue === secondValue) {
    return true
  }
  let firstValidType = /*#__PURE__*/ isDate(firstValue)
  let secondValidType = /*#__PURE__*/ isDate(secondValue)
  if (firstValidType || secondValidType) {
    return firstValidType && secondValidType ? (firstValue as Date).getTime() === (secondValue as Date).getTime() : false
  }
  firstValidType = /*#__PURE__*/ isSymbol(firstValue)
  secondValidType = /*#__PURE__*/ isSymbol(secondValue)
  if (firstValidType || secondValidType) {
    return firstValue === secondValue
  }
  firstValidType = /*#__PURE__*/ isArray(firstValue)
  secondValidType = /*#__PURE__*/ isArray(secondValue)
  if (firstValidType || secondValidType) {
    return firstValidType && secondValidType ? /*#__PURE__*/ looseCompareArrays(firstValue as unknown[], secondValue as unknown[]) : false
  }
  firstValidType = /*#__PURE__*/ isObject(firstValue)
  secondValidType = /*#__PURE__*/ isObject(secondValue)
  if (firstValidType || secondValidType) {
    if (!firstValidType || !secondValidType) {
      return false
    }
    const firstKeysCount = /*#__PURE__*/ Object.keys(firstValue as object).length
    const secondKeysCount = /*#__PURE__*/ Object.keys(secondValue as object).length
    if (firstKeysCount !== secondKeysCount) {
      return false
    }
    for (const key in firstValue as object) {
      if (/*#__PURE__*/ Object.hasOwn(firstValue as object, key)) {
        const firstHasKey = /*#__PURE__*/ Object.hasOwn(firstValue as object, key)
        const secondHasKey = /*#__PURE__*/ Object.hasOwn(secondValue as object, key)
        if (
          (firstHasKey && !secondHasKey) ||
          (!firstHasKey && secondHasKey) ||
          !/*#__PURE__*/ looseEqual((firstValue as Record<string, unknown>)[key], (secondValue as Record<string, unknown>)[key])
        ) {
          return false
        }
      }
    }
  }
  return /*#__PURE__*/ String(firstValue) === /*#__PURE__*/ String(secondValue)
}

/**
 * Finds the index of a value in an array using loose equality comparison.
 * Uses looseEqual() to compare each element, allowing for deep equality checks.
 * 
 * @param array - The array to search in
 * @param value - The value to search for
 * @returns The index of the first matching element, or -1 if not found
 * 
 * @__NO_SIDE_EFFECTS__
 * 
 * @example
 * ```typescript
 * const arr = [1, {a: 1}, [1, 2], new Date('2024-01-01')]
 * 
 * console.log(looseIndexOf(arr, 1))                    // 0
 * console.log(looseIndexOf(arr, {a: 1}))              // 1
 * console.log(looseIndexOf(arr, [1, 2]))              // 2
 * console.log(looseIndexOf(arr, new Date('2024-01-01'))) // 3
 * console.log(looseIndexOf(arr, 'not found'))         // -1
 * ```
 */
export const looseIndexOf = (array: unknown[], value: unknown): number => 
  array.findIndex((item: unknown): boolean => /*#__PURE__*/ looseEqual(item, value))