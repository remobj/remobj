/**
 * Type guard functions for runtime type checking
 */


const objectToString: typeof Object.prototype.toString = Object.prototype.toString

/**
 * Gets the string representation of a value's type using Object.prototype.toString.
 * Returns strings like '[object Object]', '[object Array]', etc.
 * 
 * @param value - The value to get the type string for
 * @returns The type string representation
 * @internal
 */
const toTypeString = (value: unknown): string => objectToString.call(value)

/**
 * Extracts the raw type name from a value (e.g., 'Object', 'Array', 'Date').
 * This removes the '[object ' prefix and ']' suffix from Object.prototype.toString output.
 * 
 * @param value - The value to get the raw type for
 * @returns The raw type name as a string
 * 
 * @example
 * ```typescript
 * console.log(toRawType({}))        // 'Object'
 * console.log(toRawType([]))        // 'Array'
 * console.log(toRawType(new Date())) // 'Date'
 * console.log(toRawType(null))      // 'Null'
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const toRawType = (value: unknown): string => /*#__PURE__*/ toTypeString(value).slice(8, -1)

/**
 * Type guard to check if a value is an array.
 * This is a re-export of Array.isArray for consistency with other type guards.
 * 
 * @param val - The value to check
 * @returns True if the value is an array
 * 
 * @example
 * ```typescript
 * const value: unknown = [1, 2, 3]
 * 
 * if (isArray(value)) {
 *   // TypeScript knows value is an array
 *   console.log(value.length) // 3
 * }
 * ```
 */
export const isArray: typeof Array.isArray = Array.isArray

/**
 * Type guard to check if a value is a Map instance.
 * 
 * @param val - The value to check
 * @returns True if the value is a Map
 * 
 * @example
 * ```typescript
 * const value: unknown = new Map([['key', 'value']])
 * 
 * if (isMap(value)) {
 *   // TypeScript knows value is a Map
 *   console.log(value.size) // 1
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isMap = (val: unknown): val is Map<unknown, unknown> =>
  /*#__PURE__*/ toTypeString(val) === '[object Map]'

/**
 * Type guard to check if a value is a Set instance.
 * 
 * @param val - The value to check
 * @returns True if the value is a Set
 * 
 * @example
 * ```typescript
 * const value: unknown = new Set([1, 2, 3])
 * 
 * if (isSet(value)) {
 *   // TypeScript knows value is a Set
 *   console.log(value.size) // 3
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isSet = (val: unknown): val is Set<unknown> =>
  /*#__PURE__*/ toTypeString(val) === '[object Set]'

/**
 * Type guard to check if a value is a Date instance.
 * 
 * @param val - The value to check
 * @returns True if the value is a Date
 * 
 * @example
 * ```typescript
 * const value: unknown = new Date()
 * 
 * if (isDate(value)) {
 *   // TypeScript knows value is a Date
 *   console.log(value.getFullYear()) // e.g., 2024
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isDate = (val: unknown): val is Date =>
  /*#__PURE__*/ toTypeString(val) === '[object Date]'

/**
 * Type guard to check if a value is a RegExp instance.
 * 
 * @param val - The value to check
 * @returns True if the value is a RegExp
 * 
 * @example
 * ```typescript
 * const value: unknown = /^test$/i
 * 
 * if (isRegExp(value)) {
 *   // TypeScript knows value is a RegExp
 *   console.log(value.test('TEST')) // true
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isRegExp = (val: unknown): val is RegExp =>
  /*#__PURE__*/ toTypeString(val) === '[object RegExp]'

/**
 * Type guard to check if a value is a function.
 * 
 * @param val - The value to check
 * @returns True if the value is a function
 * 
 * @example
 * ```typescript
 * const value: unknown = () => 'hello'
 * 
 * if (isFunction(value)) {
 *   // TypeScript knows value is a function
 *   console.log(value()) // 'hello'
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isFunction = (val: unknown): val is (...arguments_: unknown[]) => unknown =>
  typeof val === 'function'

/**
 * Type guard to check if a value is a string.
 * 
 * @param val - The value to check
 * @returns True if the value is a string
 * 
 * @example
 * ```typescript
 * const value: unknown = 'hello world'
 * 
 * if (isString(value)) {
 *   // TypeScript knows value is a string
 *   console.log(value.toUpperCase()) // 'HELLO WORLD'
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isString = (val: unknown): val is string => typeof val === 'string'

/**
 * Type guard to check if a value is a symbol.
 * 
 * @param val - The value to check
 * @returns True if the value is a symbol
 * 
 * @example
 * ```typescript
 * const value: unknown = Symbol('test')
 * 
 * if (isSymbol(value)) {
 *   // TypeScript knows value is a symbol
 *   console.log(value.toString()) // 'Symbol(test)'
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

/**
 * Type guard to check if a value is an object (excluding null).
 * Note: This returns true for arrays, dates, regexes, and other object types.
 * Use isPlainObject() for plain objects only.
 * 
 * @param val - The value to check
 * @returns True if the value is an object (not null)
 * 
 * @example
 * ```typescript
 * const values = [null, {}, [], new Date()]
 * 
 * values.forEach(val => {
 *   if (isObject(val)) {
 *     console.log('Is object:', val)
 *   }
 * })
 * // Output: 'Is object: {}', 'Is object: []', 'Is object: [Date]'
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isObject = (val: unknown): val is Record<string, unknown> =>
  val !== null && typeof val === 'object'

/**
 * Type guard to check if a value is a valid number (not NaN).
 * 
 * @param val - The value to check
 * @returns True if the value is a number and not NaN
 * 
 * @example
 * ```typescript
 * const values = [42, '42', NaN, Infinity]
 * 
 * values.forEach(val => {
 *   if (isNumber(val)) {
 *     console.log('Valid number:', val)
 *   }
 * })
 * // Output: 'Valid number: 42', 'Valid number: Infinity'
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isNumber = (val: unknown): val is number =>
  typeof val === 'number' && !/*#__PURE__*/ Number.isNaN(val) && /*#__PURE__*/ Number.isFinite(val)

/**
 * Type guard to check if a value is a Promise-like object (thenable).
 * Checks for the presence of 'then' and 'catch' methods.
 * 
 * @template T - The type that the Promise resolves to
 * @param val - The value to check
 * @returns True if the value has Promise-like behavior
 * 
 * @example
 * ```typescript
 * const asyncFn = async () => 'result'
 * const promise = Promise.resolve('value')
 * const thenable = { then: () => {}, catch: () => {} }
 * 
 * if (isPromise(promise)) {
 *   // TypeScript knows this is a Promise
 *   promise.then(value => console.log(value))
 * }
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isPromise = <T = unknown>(val: unknown): val is Promise<T> => (
  (/*#__PURE__*/ isObject(val) || /*#__PURE__*/ isFunction(val)) &&
    /*#__PURE__*/ isFunction((val as Record<string, unknown>).then) &&
    /*#__PURE__*/ isFunction((val as Record<string, unknown>).catch)
)

/**
 * Type guard to check if a value is a plain object (created by {} or new Object()).
 * Unlike isObject(), this excludes arrays, dates, regexes, and other object types.
 * 
 * @param val - The value to check
 * @returns True if the value is a plain object
 * 
 * @example
 * ```typescript
 * const values = [{}, [], new Date(), Object.create(null)]
 * 
 * values.forEach(val => {
 *   if (isPlainObject(val)) {
 *     console.log('Plain object:', val)
 *   }
 * })
 * // Output: 'Plain object: {}'
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isPlainObject = (val: unknown): val is object =>
  /*#__PURE__*/ toTypeString(val) === '[object Object]'

/**
 * Checks if a key represents a valid integer index (like array indices).
 * The key must be a string that represents a non-negative integer.
 * 
 * @param key - The key to check
 * @returns True if the key is a valid integer key
 * 
 * @example
 * ```typescript
 * console.log(isIntegerKey('0'))    // true
 * console.log(isIntegerKey('123'))  // true
 * console.log(isIntegerKey('-1'))   // false
 * console.log(isIntegerKey('1.5'))  // false
 * console.log(isIntegerKey('foo'))  // false
 * console.log(isIntegerKey('NaN'))  // false
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const isIntegerKey = (key: unknown): boolean =>
  /*#__PURE__*/ isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + /*#__PURE__*/ Number.parseInt(key, 10) === key



/**
 * Checks if all objects in data are plain objects (Object.prototype)
 * @param data - Data to check recursively
 * @returns true if all objects have Object.prototype, false otherwise
 */
export function hasOnlyPlainObjects(data: unknown): boolean {
  const plainObjectPrototype = Object.getPrototypeOf({})
  const seen = new WeakSet()

  const checkObject = (value: unknown): boolean => {
    // Primitives are OK
    if (value === null || value === undefined) {return true}

    if (!isObject(value)) {return true}

    // Prevent infinite recursion
    if (seen.has(value as object)) {return true}
    seen.add(value as object)

    // Arrays are OK, but check their contents
    if (Array.isArray(value)) {
      return value.every(checkObject)
    }

    // Check if object has plain Object prototype
    if (Object.getPrototypeOf(value) !== plainObjectPrototype) {
      return false
    }

    // Check all property values recursively
    return Object.values(value).every(checkObject)
  }

  return checkObject(data)
}

// Cache for isClonable results to avoid expensive repeated checks
const clonableCache = new WeakMap<object, boolean>()

export const isClonable = (data: unknown): boolean => {
  // Fast path for primitives
  if (data === null || data === undefined) {return true}
  
  const type = typeof data
  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
    return true
  }
  
  if (type === 'symbol' || type === 'function') {
    return false
  }
  
  // For objects, check cache first
  if (type === 'object') {
    // Check cache
    const cached = clonableCache.get(data as object)
    if (cached !== undefined) {return cached}
    
    // Fast checks for known clonable types
    const constructor = (data as any).constructor
    if (constructor === Object || constructor === Array || constructor === null) {
      // For plain objects and arrays, we still need to check contents
      const result = hasOnlyPlainObjects(data)
      clonableCache.set(data as object, result)
      return result
    }
    
    // Known non-clonable types
    if (data instanceof Date || 
        data instanceof RegExp ||
        data instanceof Promise || 
        data instanceof Map || 
        data instanceof Set ||
        data instanceof WeakMap ||
        data instanceof WeakSet ||
        data instanceof Error) {
      clonableCache.set(data as object, false)
      return false
    }
    
    // For other objects, do the full check
    const result = hasOnlyPlainObjects(data)
    clonableCache.set(data as object, result)
    return result
  }
  
  return false
}
