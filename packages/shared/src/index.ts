/**
 * An empty object that is frozen in development mode for immutability.
 * Use this constant instead of creating new empty objects to improve performance.
 * 
 * @example
 * ```typescript
 * // Good
 * const defaultOptions = { ...EMPTY_OBJ, userOptions }
 * 
 * // Instead of
 * const defaultOptions = { ...{}, userOptions }
 * ```
 */
export const EMPTY_OBJ: Record<string, unknown> = __DEV__ ? Object.freeze({}) : {}

/**
 * An empty array that is frozen in development mode for immutability.
 * Use this constant instead of creating new empty arrays to improve performance.
 * 
 * @example
 * ```typescript
 * // Good
 * const items = someCondition ? userItems : EMPTY_ARR
 * 
 * // Instead of
 * const items = someCondition ? userItems : []
 * ```
 */
export const EMPTY_ARR: readonly never[] = __DEV__ ? Object.freeze([]) : []

/**
 * A no-operation function that does nothing and returns void.
 * Useful as a default callback or placeholder function.
 * 
 * @example
 * ```typescript
 * function processData(data: any[], onComplete: () => void = NOOP) {
 *   // Process data...
 *   onComplete()
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const NOOP = (): void => {}

/**
 * Removes the first occurrence of an element from an array in place.
 * If the element is not found, the array remains unchanged.
 * 
 * @template T - The type of elements in the array
 * @param array - The array to remove the element from
 * @param element - The element to remove
 * 
 * @example
 * ```typescript
 * const items = [1, 2, 3, 2, 4]
 * removeFromArray(items, 2)
 * console.log(items) // [1, 3, 2, 4] - only first occurrence removed
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const removeFromArray = <T>(array: T[], element: T): void => {
  const index = array.indexOf(element)
  if (index !== -1) {
    array.splice(index, 1)
  }
}

const hasOwnPropertyPrototype = Object.prototype.hasOwnProperty

/**
 * Safely checks if an object has a property as its own (not inherited).
 * This is a safer alternative to obj.hasOwnProperty() which can fail if
 * the object doesn't have Object.prototype in its chain.
 * 
 * @param val - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property as its own, with type narrowing
 * 
 * @example
 * ```typescript
 * const obj = { name: 'John', age: 30 }
 * 
 * if (hasOwnProperty(obj, 'name')) {
 *   // TypeScript knows obj.name exists
 *   console.log(obj.name) // 'John'
 * }
 * 
 * // Safe even with objects that don't inherit from Object.prototype
 * const nullObj = Object.create(null)
 * nullObj.prop = 'value'
 * console.log(hasOwnProperty(nullObj, 'prop')) // true
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const hasOwnProperty = (
  val: object,
  key: string | symbol,
): key is keyof typeof val => hasOwnPropertyPrototype.call(val, key)


// Re-export type guards from separate module
export {
  isArray,
  isMap,
  isSet,
  isDate,
  isRegExp,
  isFunction,
  isString,
  isSymbol,
  isObject,
  isNumber,
  isPromise,
  isPlainObject,
  isIntegerKey,
  toRawType,
  isClonable,
  hasOnlyPlainObjects
} from './type-guards'

// Re-export string utilities from separate module
export { camelize, hyphenate, capitalize } from './string-utils'

// Re-export comparison functions from separate module
export { looseEqual, looseIndexOf } from './comparison'


// Re-export garbage collection utilities
export { onGarbageCollected, unregisterGarbageCollection } from './gc'

// Re-export types from separate module
export type {
  Prettify,
  UnionToIntersection,
  LooseRequired,
  IfAny,
  IsKeyValues,
  OverloadParameters
} from './types'