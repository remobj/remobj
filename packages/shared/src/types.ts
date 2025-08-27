/**
 * Advanced TypeScript utility types
 */

/**
 * Type utility that expands object types to show their full structure in IDE tooltips.
 * Useful for making complex intersection types more readable in development.
 * 
 * @template TypeParameter - The type to prettify
 * 
 * @example
 * ```typescript
 * type User = { name: string }
 * type WithId = { id: number }
 * 
 * // Without Prettify: User & WithId (shows intersection)
 * type UserWithId = User & WithId
 * 
 * // With Prettify: { name: string; id: number } (shows expanded structure)
 * type PrettyUserWithId = Prettify<User & WithId>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<TypeParameter> = { [KeyType in keyof TypeParameter]: TypeParameter[KeyType] } & {}

/**
 * Type utility that converts a union type to an intersection type.
 * This advanced utility uses conditional types and contravariance to transform unions.
 * 
 * @template UnionType - The union type to convert to intersection
 * 
 * @example
 * ```typescript
 * type Union = { a: string } | { b: number } | { c: boolean }
 * 
 * // Result: { a: string } & { b: number } & { c: boolean }
 * type Intersection = UnionToIntersection<Union>
 * 
 * // Usage example
 * const obj: Intersection = { a: 'hello', b: 42, c: true }
 * ```
 */
export type UnionToIntersection<UnionType> = (
  UnionType extends unknown ? (keyParameter: UnionType) => void : never
) extends (keyParameter: infer InferredType) => void
  ? InferredType
  : never

/**
 * Type utility that makes all properties required while preserving undefined values.
 * Unlike Required\<T\>, this allows properties to be undefined but ensures they exist.
 * 
 * @template TypeParameter - The type to make loosely required
 * 
 * @example
 * ```typescript
 * interface User {
 *   name?: string
 *   age?: number | undefined
 *   email?: string
 * }
 * 
 * // All properties are required but can still be undefined
 * type LooseRequiredUser = LooseRequired<User>
 * // Result: { name: string | undefined; age: number | undefined; email: string | undefined }
 * 
 * const user: LooseRequiredUser = {
 *   name: undefined,    // OK - property exists but is undefined
 *   age: undefined,     // OK
 *   email: 'test@example.com' // OK
 * }
 * ```
 */
export type LooseRequired<TypeParameter> = { [PropertyType in keyof (TypeParameter & Required<TypeParameter>)]: TypeParameter[PropertyType] }

/**
 * Type utility that detects if a type is 'any' and returns different types accordingly.
 * If T is 'any', returns Y, otherwise returns N.
 * 
 * Uses the fact that 'any' has the special property that `0 extends 1 & any` is true.
 * 
 * @template TypeParameter - The type to check for 'any'
 * @template YesType - The type to return if T is 'any'
 * @template NoType - The type to return if T is not 'any'
 * 
 * @see https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
 * 
 * @example
 * ```typescript
 * type Test1 = IfAny<any, 'is any', 'not any'>        // 'is any'
 * type Test2 = IfAny<string, 'is any', 'not any'>    // 'not any'
 * type Test3 = IfAny<unknown, 'is any', 'not any'>   // 'not any'
 * ```
 */
export type IfAny<TypeParameter, YesType, NoType> = 0 extends 1 & TypeParameter ? YesType : NoType

/**
 * Type utility that checks if all keys of an object type extend a given key type.
 * Returns false for 'any' types, non-objects, or when keys don't match the constraint.
 * 
 * @template TypeParameter - The object type to check
 * @template KeyType - The key type constraint (defaults to string)
 * 
 * @example
 * ```typescript
 * type Test1 = IsKeyValues<{ name: string; age: number }>           // true (all keys are strings)
 * type Test2 = IsKeyValues<{ [key: symbol]: any }>                 // false (keys are symbols)
 * type Test3 = IsKeyValues<{ [key: symbol]: any }, symbol>         // true (keys match symbol constraint)
 * type Test4 = IsKeyValues<string>                                 // false (not an object)
 * type Test5 = IsKeyValues<any>                                    // false (any type)
 * ```
 */
export type IsKeyValues<TypeParameter, KeyType = string> = IfAny<
  TypeParameter,
  false,
  TypeParameter extends object ? (keyof TypeParameter extends KeyType ? true : false) : false
>

/**
 * Type utility for extracting parameters from function overloads.
 * Useful for typed event emitters and other scenarios with overloaded functions.
 * 
 * This handles the complex case where a function has multiple overloads and you need
 * to extract the parameter types for all possible overloads.
 * 
 * @template TypeParameter - The overloaded function type
 * 
 * @see https://github.com/microsoft/TypeScript/issues/32164#issuecomment-1146737709
 * 
 * @example
 * ```typescript
 * // Overloaded function
 * declare function emit(event: 'click', x: number, y: number): void
 * declare function emit(event: 'change', value: string): void
 * declare function emit(event: 'error', error: Error): void
 * 
 * // Extract all possible parameter combinations
 * type EmitParams = OverloadParameters<typeof emit>
 * // Result: ['click', number, number] | ['change', string] | ['error', Error]
 * ```
 */
export type OverloadParameters<TypeParameter extends (...arguments_: unknown[]) => unknown> = Parameters<
  OverloadUnion<TypeParameter>
>

/**
 * Helper type for extracting properties from overload types.
 * @template TOverload - The overload type to extract properties from
 * @internal
 */
type OverloadProps<TOverload> = Pick<TOverload, keyof TOverload>

/**
 * Recursive helper type for building union of overload signatures.
 * This complex type recursively processes overloaded functions to extract all signatures.
 * 
 * @template TOverload - The overload type being processed
 * @template TPartialOverload - Accumulated partial overload (defaults to unknown)
 * @internal
 */
type OverloadUnionRecursive<
  TOverload,
  TPartialOverload = unknown,
> = TOverload extends (...arguments_: infer TArguments) => infer TReturn
  ? TPartialOverload extends TOverload
    ? never
    :
        | OverloadUnionRecursive<
            TPartialOverload & TOverload,
            TPartialOverload &
              ((...arguments_: TArguments) => TReturn) &
              OverloadProps<TOverload>
          >
        | ((...arguments_: TArguments) => TReturn)
  : never

/**
 * Helper type that creates a union of all overload signatures from a function type.
 * This processes the recursive overload extraction and cleans up the result.
 * 
 * @template TOverload - The overloaded function type to process
 * @internal
 */
type OverloadUnion<TOverload extends (...arguments_: unknown[]) => unknown> = Exclude<
  OverloadUnionRecursive<(() => never) & TOverload>,
  TOverload extends () => never ? never : () => never
>