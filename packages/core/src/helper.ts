/**
 * @fileoverview Security validation and utility functions
 * 
 * This module provides essential security validation functions and type guards
 * used throughout remobj to prevent common security vulnerabilities:
 * 
 * - Prototype pollution prevention
 * - RPC message validation
 * - Safe property access checking
 * - Type guard utilities
 * 
 * All functions include comprehensive error handling and security checks.
 */

import type { RemoteCall, RemoteResponse } from "./remoteObject";

// ============================================================================
// Security Assertion Functions
// ============================================================================
/**
 * Validates a key chain array to prevent prototype pollution and unsafe property access.
 * 
 * Security checks:
 * - Ensures keyChain is an array
 * - Validates all keys are strings
 * - Blocks dangerous properties: '__proto__', 'prototype', 'constructor'
 * 
 * @param keyChain - The key chain to validate
 * @throws Error if key chain contains unsafe properties or invalid structure
 * 
 * @example
 * ```typescript
 * // Safe key chains
 * assertValidKeyChain(['user', 'profile', 'name']) // ✓ Valid
 * assertValidKeyChain(['api', 'getData']) // ✓ Valid
 * 
 * // Unsafe key chains
 * assertValidKeyChain(['__proto__', 'pollute']) // ✗ Throws error  
 * assertValidKeyChain(['constructor', 'prototype']) // ✗ Throws error
 * ```
 */
export function assertValidKeyChain(keyChain: unknown): asserts keyChain is string[] {
  if (!Array.isArray(keyChain)) {
    throw new Error('Invalid keyChain: must be an array');
  }

  if (keyChain.some(key => !isString(key) || key.includes('__proto__') || key.includes('prototype') || key.includes('constructor'))) {
    throw new Error('Invalid keyChain: contains unsafe property names');
  }
}
/**
 * Validates an RPC call message structure for security and correctness.
 * 
 * Validation checks:
 * - Ensures data is an object with required id and type fields
 * - Validates keyChain for security (prevents prototype pollution)
 * - Checks args array for call/construct operations
 * 
 * @param data - The data to validate as an RPC call
 * @throws Error if the RPC call structure is invalid or unsafe
 * 
 * @example
 * ```typescript
 * // Valid RPC calls
 * assertValidRPCCall({ id: '123', type: 'call', keyChain: ['method'], args: [] })
 * assertValidRPCCall({ id: '456', type: 'await', keyChain: ['property'] })
 * 
 * // Invalid RPC calls  
 * assertValidRPCCall({ type: 'call' }) // ✗ Missing id
 * assertValidRPCCall({ id: '123', keyChain: ['__proto__'] }) // ✗ Unsafe keyChain
 * ```
 */
export function assertValidRPCCall(data: unknown): asserts data is RemoteCall {
  if (!data || !isObject(data)) {
    throw new Error('Invalid RPC call: not an object');
  }

  const d = data as any;
  if (typeof d.id === 'undefined' || !d.type) {
    throw new Error('Invalid RPC call: missing id or type');
  }

  assertValidKeyChain(d.keyChain);

  if ((d.type === 'call' || d.type === 'construct') && !Array.isArray(d.args)) {
    throw new Error('Invalid RPC call: args must be an array');
  }
}
/**
 * Validates an RPC response message structure.
 * 
 * Validation checks:
 * - Ensures data is an object
 * - Validates presence of required id field
 * - Supports both 'response' and 'error' response types
 * 
 * @param data - The data to validate as an RPC response
 * @throws Error if the RPC response structure is invalid
 * 
 * @example
 * ```typescript
 * // Valid RPC responses
 * assertValidRPCResponse({ id: '123', type: 'response', data: { type: 'any', data: 'result' } })
 * assertValidRPCResponse({ id: '456', type: 'error', code: 'E001', message: 'Error occurred' })
 * 
 * // Invalid RPC responses
 * assertValidRPCResponse({ type: 'response' }) // ✗ Missing id
 * ```
 */
export function assertValidRPCResponse(data: unknown): asserts data is RemoteResponse {
  if (!data || !isObject(data)) {
    throw new Error('Invalid RPC response: not an object');
  }

  const d = data as any;
  if (typeof d.id === 'undefined') {
    throw new Error('Invalid RPC response: missing id or invalid type');
  }
}
/**
 * Validates that a target is a function, throwing a descriptive error if not.
 * 
 * @param target - The value to check
 * @param name - Descriptive name for error messages
 * @throws Error if target is not a function
 * 
 * @example
 * ```typescript
 * const obj = { method: () => {}, notAFunction: 'string' }
 * 
 * assertIsFunction(obj.method, 'obj.method') // ✓ Valid
 * assertIsFunction(obj.notAFunction, 'obj.notAFunction') // ✗ Throws error
 * ```
 */
export function assertIsFunction(target: unknown, name: string): asserts target is Function {
  if (!isFunction(target)) {
    throw new Error(`Target is not a function: '${name}'`);
  }
}
/**
 * Safely checks if a property exists on an object or its prototype chain.
 * 
 * This function traverses the prototype chain safely with a depth limit
 * to prevent infinite loops while checking for property existence.
 * 
 * Features:
 * - Safe prototype chain traversal
 * - Depth limit protection (100 levels)
 * - Handles null/undefined objects gracefully
 * - Uses hasOwnProperty for accurate property detection
 * 
 * @param obj - The object to check for the property
 * @param property - The property name to look for
 * @throws Error if property is not found or object is invalid
 * 
 * @example
 * ```typescript
 * const obj = { name: 'test', nested: { value: 42 } }
 * 
 * assertPropertyExists(obj, 'name') // ✓ Valid
 * assertPropertyExists(obj, 'toString') // ✓ Valid (inherited)
 * assertPropertyExists(obj, 'nonexistent') // ✗ Throws error
 * ```
 */
export function assertPropertyExists(obj: any, property: string): void {
  if (!obj || !isObject(obj)) {
    throw new Error(`Cannot access property on non-object: '${property}'`);
  }

  let base = obj;

  for (let i = 0; i < 100; i++) {
    if (base) {
      if (Object.prototype.hasOwnProperty.call(base ?? {}, property)) {
        return;
      }
      base = Reflect.getPrototypeOf(base) as object;
    } else {
      throw new Error(`Property not found or not accessible: '${property}'`);
    }
  }
  throw new Error('Loop stopped too much inherits');
}
// ============================================================================
// Type Guard Utilities
// ============================================================================

/**
 * Type guard to check if a value is a function
 * @param x - The value to check
 * @returns True if x is a function
 */
export const isFunction = (x: unknown): x is Function => typeof x === 'function';

/**
 * Type guard to check if a value is a non-null object
 * @param x - The value to check  
 * @returns True if x is an object and not null
 */
export const isObject = (x: unknown): x is object => typeof x === 'object' && x !== null;

/**
 * Type guard to check if a value is a string
 * @param x - The value to check
 * @returns True if x is a string
 */
export const isString = (x: unknown): x is string => typeof x === 'string';

