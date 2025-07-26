/**
 * @fileoverview TypeScript type definitions for remobj Remote Object transformations
 * 
 * This module provides comprehensive type definitions that accurately represent how
 * remobj transforms JavaScript objects when wrapped with provide() and consume().
 * 
 * Key transformations:
 * - All function calls become async (return Promise)
 * - All property access becomes async (return Promise) 
 * - Constructor calls become async (return Promise<Wrapped<Instance>>)
 * - Nested objects become wrapped recursively
 * - Method chaining breaks (each call returns Promise)
 * 
 * @example Basic usage
 * ```typescript
 * interface Calculator {
 *   add(a: number, b: number): number
 *   config: { precision: number }
 * }
 * 
 * // Direct usage
 * const calc: Calculator = { add: (a, b) => a + b, config: { precision: 2 } }
 * const result = calc.add(5, 3) // number (8)
 * const precision = calc.config.precision // number (2)
 * 
 * // Wrapped usage  
 * const remote: Wrapped<Calculator> = consume(worker)
 * const result = await remote.add(5, 3) // Promise<number> -> number (8)
 * const precision = await remote.config.precision // Promise<number> -> number (2)
 * ```
 */

// ============================================================================
// Core Transformation Types
// ============================================================================

/**
 * Transforms any type T into its remote-wrapped equivalent.
 * 
 * This is the main type that represents how remobj changes object interfaces:
 * - Functions: T() -\> Promise\<Awaited\<T()\>\>
 * - Constructors: new T() -\> Promise\<Wrapped\<InstanceType\<T\>\>\>
 * - Objects: T -\> Wrapped\<T\> (recursive)
 * - Primitives: T -\> Promise\<T\>
 * 
 * @template T - The original type to wrap
 * 
 * @example Function transformation
 * ```typescript
 * // Original
 * type Add = (a: number, b: number) => number
 * 
 * // Wrapped  
 * type WrappedAdd = Wrapped<Add>
 * // Result: (a: number, b: number) => Promise<number>
 * ```
 * 
 * @example Object transformation
 * ```typescript
 * // Original
 * interface API {
 *   calculate: (x: number) => number
 *   config: { timeout: number }
 * }
 * 
 * // Wrapped
 * type WrappedAPI = Wrapped<API>
 * // Result: {
 * //   calculate: (x: number) => Promise<number>  
 * //   config: Wrapped<{ timeout: number }>
 * // }
 * ```
 */
/**
 * @public
 */
export type Wrapped<T = Record<string | symbol, any>> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? // Functions: Transform to async version
      (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : T[K] extends new (...args: any[]) => any
    ? // Constructors: Transform to async constructor returning wrapped instance
      new (...args: ConstructorParameters<T[K]>) => Promise<Wrapped<InstanceType<T[K]>>>
    : T[K] extends object
    ? // Objects: Recursively wrap (but exclude primitives like Date, RegExp, etc.)
      T[K] extends Function | Date | RegExp | Error | Promise<any> | ArrayBuffer | Uint8Array | Int32Array | Float64Array
        ? Promise<T[K]> // Treat special objects as primitives
        : Wrapped<T[K]> // Recursively wrap plain objects
    : // Primitives: Wrap in Promise
      Promise<T[K]>
};

// ============================================================================
// Utility Types for Common Patterns  
// ============================================================================

/**
 * Extracts the original (unwrapped) type from a Wrapped type.
 * Useful for type inference and reverse transformations.
 * 
 * @template T - The wrapped type to unwrap
 * 
 * @example
 * ```typescript
 * type WrappedCalc = Wrapped<{ add: (a: number, b: number) => number }>
 * type OriginalCalc = Unwrapped<WrappedCalc>
 * // Result: { add: (a: number, b: number) => number }
 * ```
 */
/**
 * @internal
 */
export type Unwrapped<T> = T extends Wrapped<infer U> ? U : never;

/**
 * Type guard to check if a function is a remote (wrapped) function.
 * Remote functions always return Promises.
 * 
 * @template T - The function type to check
 * 
 * @example
 * ```typescript
 * type LocalFn = (x: number) => number
 * type RemoteFn = (x: number) => Promise<number>
 * 
 * type IsLocalRemote = IsRemoteFunction<LocalFn>   // false
 * type IsRemoteRemote = IsRemoteFunction<RemoteFn> // true
 * ```
 */
/**
 * @internal
 */
export type IsRemoteFunction<T> = T extends (...args: any[]) => Promise<any> ? true : false;

/**
 * Extracts the return type from a remote function, unwrapping the Promise.
 * 
 * @template T - The remote function type
 * 
 * @example
 * ```typescript
 * type RemoteFn = (x: number) => Promise<string>
 * type Result = RemoteReturnType<RemoteFn> // string
 * ```
 */
/**
 * @internal
 */
export type RemoteReturnType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

/**
 * Transforms a local function type to its remote equivalent.
 * 
 * @template T - The local function type
 * 
 * @example
 * ```typescript
 * type LocalFn = (a: number, b: string) => boolean
 * type RemoteFn = ToRemoteFunction<LocalFn>
 * // Result: (a: number, b: string) => Promise<boolean>
 * ```
 */
/**
 * @internal
 */
export type ToRemoteFunction<T> = T extends (...args: infer P) => infer R
  ? (...args: P) => Promise<Awaited<R>>
  : never;

// ============================================================================
// Method Chaining Types
// ============================================================================

/**
 * Represents a method that would normally support chaining but breaks in remote context.
 * This type helps identify fluent interface methods that won't work across RPC.
 * 
 * @template T - The object type that supports chaining
 * 
 * @example
 * ```typescript
 * interface Builder {
 *   add(n: number): Builder
 *   multiply(n: number): Builder  
 *   get(): number
 * }
 * 
 * // Direct usage (works)
 * const result = builder.add(5).multiply(3).get() // number
 * 
 * // Remote usage (broken)
 * const broken = remoteBuilder.add(5).multiply(3).get() // Type error!
 * 
 * // Remote usage (correct)
 * const step1 = await remoteBuilder.add(5)    // Promise<Wrapped<Builder>>
 * const step2 = await step1.multiply(3)       // Promise<Wrapped<Builder>>
 * const result = await step2.get()           // Promise<number>
 * ```
 */
/**
 * @internal
 */
export type BrokenChainMethod<T, R = T> = T extends object
  ? ((...args: any[]) => R) extends (...args: any[]) => T
    ? Promise<Wrapped<R>> // Chain methods become async
    : never
  : never;

/**
 * Identifies properties that return 'this' for method chaining.
 * These will break in remote context since they return Promises instead.
 * 
 * @template T - The object type to analyze
 */
/**
 * @internal
 */
export type ChainableMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => T ? K : never
}[keyof T];

// ============================================================================
// Callback and Higher-Order Function Types
// ============================================================================

/**
 * Transforms callback parameters to work across remote boundaries.
 * Callbacks passed to remote functions are automatically wrapped as remote objects.
 * 
 * @template T - The callback function type
 * 
 * @example
 * ```typescript
 * // Local usage
 * processor.process(data, (result) => console.log(result))
 * 
 * // Remote usage - callback automatically becomes remote
 * await remoteProcessor.process(data, (result) => console.log(result))
 * // The callback function runs in the consumer context via RPC
 * ```
 */
/**
 * @internal
 */
export type RemoteCallback<T> = T extends (...args: infer P) => infer R
  ? (...args: P) => Promise<Awaited<R>>
  : T;

/**
 * Type for functions that accept callbacks and work in remote context.
 * 
 * @template F - The function type that accepts callbacks
 * @template C - The callback parameter indices
 */
/**
 * @internal
 */
export type WithRemoteCallbacks<F, C extends number[]> = F extends (
  ...args: infer P
) => infer R
  ? (
      ...args: {
        [K in keyof P]: K extends C[number] ? RemoteCallback<P[K]> : P[K]
      }
    ) => Promise<Awaited<R>>
  : never;

// ============================================================================
// Constructor and Class Types
// ============================================================================

/**
 * Transforms a class constructor to work in remote context.
 * Remote constructors return Promise<Wrapped<Instance>> instead of direct instances.
 * 
 * @template T - The constructor function type
 * 
 * @example
 * ```typescript
 * class Calculator {
 *   constructor(precision: number) { this.precision = precision }
 *   add(a: number, b: number): number { return a + b }
 * }
 * 
 * // Local usage
 * const calc = new Calculator(2) // Calculator instance
 * 
 * // Remote usage  
 * const calc = await new remoteCalculator.Calculator(2) // Promise<Wrapped<Calculator>>
 * const result = await calc.add(5, 3) // Promise<number>
 * ```
 */
/**
 * @internal
 */
export type RemoteConstructor<T> = T extends new (...args: infer P) => infer I
  ? new (...args: P) => Promise<Wrapped<I>>
  : never;

/**
 * Extracts the instance type from a remote constructor.
 * 
 * @template T - The remote constructor type
 */
/**
 * @internal
 */
export type RemoteInstanceType<T> = T extends new (...args: any[]) => Promise<Wrapped<infer I>>
  ? I
  : never;

// ============================================================================
// Performance and Optimization Types
// ============================================================================

/**
 * Identifies properties that will cause performance issues in remote context.
 * These are properties that would typically be accessed frequently or in loops.
 * 
 * @template T - The object type to analyze
 */
/**
 * @internal
 */
export type ExpensiveRemoteAccess<T> = {
  [K in keyof T]: T[K] extends Function
    ? never // Functions are expected to be async
    : T[K] extends object
    ? K // Nested objects require RPC calls
    : K // Primitives require RPC calls
}[keyof T];

/**
 * Suggests batch operations for types that would be expensive to access remotely.
 * 
 * @template T - The object type
 * 
 * @example
 * ```typescript
 * interface UserAPI {
 *   getUser(id: string): User
 *   getUserName(id: string): string
 *   getUserAge(id: string): number
 * }
 * 
 * // Instead of multiple calls:
 * // const name = await api.getUserName(id)  // RPC call 1
 * // const age = await api.getUserAge(id)    // RPC call 2
 * 
 * // Better: Single batch call
 * // const user = await api.getUser(id)      // RPC call 1
 * // const name = user.name, age = user.age  // Local access
 * ```
 */
/**
 * @internal
 */
export type BatchOptimized<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R
    ? R extends object
      ? T[K] // Return full objects instead of individual properties
      : T[K]
    : T[K]
};

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Wraps function return types to include potential RPC errors.
 * All remote calls can fail with network/serialization errors.
 * 
 * @template T - The function type
 * 
 * @example
 * ```typescript
 * // Local function never throws network errors
 * const localResult = calculate(5, 3) // number
 * 
 * // Remote function can throw RPC errors  
 * try {
 *   const remoteResult = await remoteCalculate(5, 3) // Promise<number>
 * } catch (error) {
 *   // Could be original function error OR RPC error
 * }
 * ```
 */
/**
 * @internal
 */
export type RemoteErrorProne<T> = T extends (...args: infer P) => infer R
  ? (...args: P) => Promise<Awaited<R> | never>
  : T;

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type predicate to check if a value is a remote proxy object.
 * 
 * @template T - The type to check
 */
/**
 * @internal
 */
export type IsRemote<T> = T extends Wrapped<any> ? true : false;

/**
 * Conditional type that selects different implementations based on whether
 * the type is used in local or remote context.
 * 
 * @template T - The base type
 * @template Local - Type for local usage
 * @template Remote - Type for remote usage
 */
/**
 * @internal
 */
export type LocalOrRemote<T, Local, Remote> = T extends Wrapped<any> ? Remote : Local;

// ============================================================================
// Advanced Transformation Types
// ============================================================================

/**
 * Deep transformation that handles complex nested structures.
 * This goes beyond the basic Wrapped<T> to handle edge cases like:
 * - Arrays of objects
 * - Maps and Sets
 * - Mixed primitive/object structures
 * 
 * @template T - The complex type to transform
 */
/**
 * @internal
 */
export type DeepWrapped<T> = T extends (...args: any[]) => any
  ? ToRemoteFunction<T>
  : T extends new (...args: any[]) => any
  ? RemoteConstructor<T>
  : T extends Array<infer U>
  ? Promise<Array<DeepWrapped<U>>>
  : T extends Map<infer K, infer V>
  ? Promise<Map<K, DeepWrapped<V>>>
  : T extends Set<infer U>
  ? Promise<Set<DeepWrapped<U>>>
  : T extends object
  ? T extends Function | Date | RegExp | Error | Promise<any>
    ? Promise<T>
    : Wrapped<T>
  : Promise<T>;

/**
 * Type representing the complete API surface that gets exposed when an object
 * is provided via provide(). This includes all the security validations and
 * transformations that happen.
 * 
 * @template T - The object being provided
 */
/**
 * @internal
 */
export type ProvidedAPI<T> = {
  readonly [K in keyof T as K extends string
    ? K extends '__proto__' | 'constructor' | 'prototype'
      ? never // Security: Block dangerous properties
      : K
    : K]: Wrapped<T[K]>
};

/**
 * Type representing what the consumer sees when using consume().
 * This is the complete proxy interface with all transformations applied.
 * 
 * @template T - The original object type being consumed
 */
/**
 * @internal
 */
export type ConsumedAPI<T> = ProvidedAPI<T> & {
  /**
   * Special property to identify this as a remote proxy.
   * This is not actually present at runtime but helps with type checking.
   */
  readonly __remobjRemote: true;
};