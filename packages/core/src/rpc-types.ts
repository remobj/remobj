/**
 * Properties that are forbidden from remote access for security reasons
 */
export type ForbiddenProperty = '__proto__' | 'prototype' | 'constructor' | 'then' | 'catch' | 'finally'

/**
 * List of properties that cannot be accessed remotely
 */
export const FORBIDDEN_PROPERTIES: readonly ForbiddenProperty[] = ['__proto__', 'prototype', 'constructor'] as const


export interface Plugins {
  'Date': {
    typeOriginal: Date,
    transferType: number,
    returnType: Date
  }
}

/**
 * Transforms a type T into its remote proxy equivalent
 * - Primitive types become Promises
 * - Functions return Promises
 * - Objects have all their properties transformed recursively
 * - Constructors return Remote instances
 * 
 * @template T - The original type to transform
 * @template B - Whether to enable deep proxying (default: true)
 */
export type Remote<T extends unknown, B = true> =
    T extends symbol ? Promise<null> :
    T extends number | string | boolean | bigint | null | undefined ? Promise<T> :
    T extends { new(...args: infer ARGS): infer RETURN } ? { new(...args: ARGS): Promise<Remote<RETURN>> } :
    T extends (...args: any[]) => any ? (...args: Parameters<T>) => (
        ReturnType<T> extends Record<string, unknown> ? Promise<ReturnType<T>> :
        T extends object ? Promise<Remote<ReturnType<T>>> :
        Promise<T>
    ) :
    T extends Record<string, unknown> ? { [K in keyof Omit<T, ForbiddenProperty | symbol>]: Remote<T[K]> } & Promise<T> :
    { [K in keyof Plugins]: T extends Plugins[K]['typeOriginal'] ? Plugins[K]['returnType'] : never } extends Record<string, infer RET> ? RET :
    T extends object ? (
        B extends true ? { [K in keyof Omit<T, ForbiddenProperty | symbol>]: Remote<T[K]> } : Remote<T, false>
    ) :
    never

/**
 * Request structure for remote procedure calls
 */
export interface RemoteCallRequest {
    requestID: string
    consumerID: string
    realmId: string
    operationType: 'call' | 'construct' | 'set' | 'await' | 'gc-register' | 'gc-collect' | 'ping'
    propertyPath: string
    args: any[]
}

/**
 * Response structure for remote procedure calls
 */
export interface RemoteCallResponse {
    type: 'response'
    requestID: string
    resultType: 'result' | 'error'
    result: any
    providerID: string
}

/**
 * Configuration options for providing objects via RPC
 */
export interface ProvideConfig {
    allowWrite?: boolean
    name?: string
}

/**
 * Configuration options for consuming remote objects via RPC
 */
export interface ConsumeConfig {
    timeout?: number
    name?: string
}

/**
 * Represents wrapped function arguments that may need special handling
 */
export interface WrappedArgument { type: string; value: any }