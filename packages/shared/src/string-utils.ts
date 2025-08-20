/**
 * String manipulation utilities with caching for performance
 */

/**
 * Creates a cached version of a string transformation function.
 * Results are memoized to improve performance for repeated calls with the same input.
 * 
 * @template StringFunction - The function type to cache
 * @param stringFunction - The string transformation function to cache
 * @returns A cached version of the function
 * @internal
 */
/* @__NO_SIDE_EFFECTS__ */
const cacheStringFunction = <StringFunction extends (str: string) => string>(stringFunction: StringFunction): StringFunction => {
  const cache: Record<string, string> = /*#__PURE__*/ Object.create(null)
  return ((str: string): string => {
    const hit = cache[str]
    return hit || (cache[str] = stringFunction(str))
  }) as StringFunction
}

const camelizeRegularExpression = /-(\w)/g

/**
 * Converts a kebab-case string to camelCase.
 * Results are cached for performance.
 * 
 * @param str - The kebab-case string to convert
 * @returns The camelCase version of the string
 * 
 * @example
 * ```typescript
 * console.log(camelize('hello-world'))      // 'helloWorld'
 * console.log(camelize('my-component-name')) // 'myComponentName'
 * console.log(camelize('single'))           // 'single'
 * console.log(camelize(''))                 // ''
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const camelize: (str: string) => string = /*#__PURE__*/ cacheStringFunction(
  (str: string): string => 
    str.replace(camelizeRegularExpression, (_unused: string, character: string): string => (character ? character.toUpperCase() : '')),
)

const hyphenateRegularExpression = /\B([A-Z])/g

/**
 * Converts a camelCase string to kebab-case.
 * Results are cached for performance.
 * 
 * @param str - The camelCase string to convert
 * @returns The kebab-case version of the string
 * 
 * @example
 * ```typescript
 * console.log(hyphenate('helloWorld'))     // 'hello-world'
 * console.log(hyphenate('myComponentName')) // 'my-component-name'
 * console.log(hyphenate('single'))         // 'single'
 * console.log(hyphenate('XMLHttpRequest')) // 'x-m-l-http-request'
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const hyphenate: (str: string) => string = /*#__PURE__*/ cacheStringFunction(
  (str: string): string => str.replace(hyphenateRegularExpression, '-$1').toLowerCase(),
)

/**
 * Capitalizes the first letter of a string while preserving the rest.
 * Results are cached for performance and provides precise TypeScript typing.
 * 
 * @template StringType - The input string type for precise return typing
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 * 
 * @example
 * ```typescript
 * console.log(capitalize('hello'))     // 'Hello'
 * console.log(capitalize('wORLD'))     // 'WORLD'
 * console.log(capitalize(''))          // ''
 * console.log(capitalize('a'))         // 'A'
 * 
 * // TypeScript preserves literal types
 * const result: 'Hello' = capitalize('hello' as const)
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export const capitalize: <StringType extends string>(str: StringType) => Capitalize<StringType> =
  /*#__PURE__*/ cacheStringFunction(<StringType extends string>(str: StringType): Capitalize<StringType> => 
    (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<StringType>)