/**
 * @fileoverview Remote Object API for cross-realm object manipulation
 * 
 * This module provides high-level RPC-based communication for exposing and consuming
 * JavaScript objects across different execution contexts (Workers, iframes, etc.).
 * 
 * Features:
 * - Automatic proxy creation for remote objects
 * - Seamless method calls, property access, and constructor invocation
 * - Automatic argument serialization with proxy detection
 * - Object reference management and cleanup
 * - Type-safe async/await support
 * - Security validation for all RPC operations
 * 
 * @example Basic usage
 * ```typescript
 * // Provider side (e.g., in Worker)
 * const calculator = {
 *   add: (a: number, b: number) => a + b,
 *   multiply: (a: number, b: number) => a * b
 * }
 * provide(calculator, self)
 * 
 * // Consumer side (e.g., main thread)
 * const worker = new Worker('calculator.js')
 * const calc = consume(worker)
 * const result = await calc.add(5, 3) // Returns 8
 * ```
 */

import { assertIsFunction, assertValidRPCCall, assertValidRPCResponse, isObject, isFunction, assertValidKeyChain, assertPropertyExists } from './helper';
import { type PostMessageEndpoint, createChannel } from './endpoint'
import { type Wrapped } from './remoteTypes'
import { createProxyEndpoint } from './devtools'

/**
 * Serialized RPC data that can be either plain data or a reference to a wrapped object.
 * 
 * This type represents how data is serialized for transmission across contexts:
 * - `{ type: 'any', data: any }` - Plain data that can be directly transmitted
 * - `{ type: 'wrapped', id: string }` - Reference to a wrapped object accessible via its unique ID
 * 
 * @internal
 */
export type SerializedData = { type: 'any'; data: any; } | { type: 'wrapped'; id: string; };

/**
 * RPC call message structure supporting method calls, constructor calls, and property access.
 * 
 * Represents the structure of RPC calls sent from consumer to provider:
 * - `id` - Unique identifier for matching responses to calls
 * - `keyChain` - Array of property names to traverse (e.g., ['api', 'users', 'create'])
 * - `type` - Operation type:
 *   - 'call' - Function call with arguments
 *   - 'construct' - Constructor invocation with arguments  
 *   - 'await' - Property access/await operation (no arguments)
 * - `args` - Serialized arguments (only for 'call' and 'construct')
 * 
 * @internal
 */
export type RemoteCall = (({ id: string; keyChain: string[]; }) & ({ type: 'await'; } | { type: 'construct' | 'call'; args: SerializedData[]; }));

/**
 * RPC response message structure for successful responses and errors.
 * 
 * Represents responses sent from provider back to consumer:
 * - Success: `{ id: string, type: 'response', data: SerializedData }` - Contains result data
 * - Error: `{ id: string, type: 'error', code: string, message: string }` - Contains error info
 * 
 * The `id` field matches the original call to enable proper Promise resolution.
 * 
 * @internal
 */
export type RemoteResponse = { id: string; type: 'response'; data: SerializedData; } | {id: string; type: 'error', code: string, message: string};

/**
 * Generates a unique identifier for RPC calls and object references.
 * 
 * Uses crypto.randomUUID() to ensure uniqueness across different contexts
 * and prevent ID collisions in distributed RPC systems.
 * 
 * @returns A cryptographically secure random UUID (e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479")
 * @internal
 */
function getId(): string {
  return crypto.randomUUID();
}

/**
 * WeakSet to track objects that should always be wrapped as remote references.
 * 
 * Objects in this set are forced to be wrapped even if they don't contain functions.
 * This is particularly used for constructor results that need to maintain their
 * remote object identity across RPC calls.
 * 
 * @internal
 */
const markedObj = new WeakSet<any>();

/**
 * WeakSet to track endpoints that are already providing objects to prevent conflicts.
 * 
 * Ensures that each PostMessageEndpoint can only provide one object to prevent
 * message routing conflicts and maintain clear API boundaries.
 * 
 * @internal
 */
const exposedEndpoints = new WeakSet<PostMessageEndpoint>();
/**
 * Wraps an array of arguments for RPC transmission.
 * 
 * Processes each argument through wrapArgument() to handle functions and complex objects
 * that need to be exposed as remote references. Plain data is passed through directly.
 * 
 * @param args - The arguments array to wrap for transmission
 * @param endpoint - The PostMessageEndpoint for creating channels for wrapped objects
 * @returns Array of serialized RPC data ready for transmission
 * @internal
 * 
 * @example
 * ```typescript
 * const args = [42, "hello", () => "function", { prop: "object" }]
 * const wrapped = wrapArguments(args, endpoint)
 * // Result: [
 * //   { type: 'any', data: 42 },
 * //   { type: 'any', data: "hello" },
 * //   { type: 'wrapped', id: "uuid-1" },  // function wrapped
 * //   { type: 'any', data: { prop: "object" } }
 * // ]
 * ```
 */
function wrapArguments(args: any[], endpoint: PostMessageEndpoint): SerializedData[] {
  return args.map((arg) => wrapArgument(arg, endpoint));
}
/**
 * Wraps a single argument for RPC transmission.
 * 
 * Determines whether data should be wrapped as a remote reference or passed directly:
 * 
 * **Wrapping Logic:**
 * - Functions are always wrapped
 * - Objects containing functions are wrapped  
 * - Objects marked in markedObj (e.g., constructor results) are wrapped
 * - Arrays and plain objects are passed directly
 * - Primitive values (numbers, strings, etc.) are passed directly
 * 
 * **Wrapped objects:**
 * - Get a unique channel created via createChannel()
 * - Are provided on that channel for remote access
 * - Return a reference with type 'wrapped' and unique ID
 * 
 * @param data - The data to wrap for transmission
 * @param endpoint - The PostMessageEndpoint for creating channels for wrapped objects
 * @param wrap - Force wrapping even for plain data (used for constructor results)
 * @returns Serialized RPC data - either direct data or remote reference
 * @internal
 * 
 * @example
 * ```typescript
 * // Function gets wrapped
 * wrapArgument(() => 42, endpoint) 
 * // → { type: 'wrapped', id: 'uuid-123' }
 * 
 * // Object with methods gets wrapped
 * wrapArgument({ name: 'test', method: () => {} }, endpoint)
 * // → { type: 'wrapped', id: 'uuid-456' }
 * 
 * // Plain data passes through
 * wrapArgument('hello', endpoint)
 * // → { type: 'any', data: 'hello' }
 * ```
 */
function wrapArgument(data: unknown, endpoint: PostMessageEndpoint, wrap = false): SerializedData {
  // Check if data is a function
  if (isFunction(data)) {
    wrap = true;
  } 
  // Check if object contains functions
  else if (data && isObject(data) && !Array.isArray(data) && data !== null) {
    try {
      wrap = Object.values(data).some(isFunction);
    } catch {
      // Handle objects that don't support Object.values (e.g., some built-ins)
      wrap = false;
    }
  }
  
  // Check if object is marked for forced wrapping (e.g., constructor results)
  if (markedObj.has(data)) {
    wrap = true;
  }

  if (wrap) {
    // Create unique ID and dedicated channel for this object
    const id = getId();
    const channelEp = createChannel(endpoint, id);
    
    // Provide object on dedicated channel for remote access
    provide(data as Record<string, any>, channelEp);

    return { type: 'wrapped', id };
  } else {
    // Pass plain data directly
    return { type: 'any', data };
  }
}
/**
 * Unwraps RPC data back to its original form.
 * 
 * Handles deserialization of data received from RPC calls:
 * - Plain data (`type: 'any'`) is returned directly
 * - Wrapped objects (`type: 'wrapped'`) become proxy objects via consume()
 * 
 * For wrapped objects, creates a dedicated channel using the object's ID
 * and returns a consuming proxy that enables remote method calls.
 * 
 * @param data - The serialized RPC data to unwrap
 * @param endpoint - The PostMessageEndpoint for creating channels for proxy objects
 * @returns The unwrapped data or a proxy object for remote access
 * @internal
 * 
 * @example
 * ```typescript
 * // Plain data
 * unwrapArgument({ type: 'any', data: 'hello' }, endpoint)
 * // → 'hello'
 * 
 * // Wrapped object reference
 * unwrapArgument({ type: 'wrapped', id: 'uuid-123' }, endpoint)
 * // → Proxy object for remote method calls
 * ```
 */
function unwrapArgument(data: SerializedData, endpoint: PostMessageEndpoint) {
  if (data.type === 'any') {
    // Return plain data directly
    return data.data;
  } else if (data.type === 'wrapped') {
    // Create proxy for remote object access
    const id = data.id;
    const channelEp = createChannel(endpoint, id);
    return consume(channelEp);
  }
}
/**
 * Safely traverses an object using a key chain to access nested properties.
 * 
 * Performs secure property access with multiple validation layers:
 * 1. Validates key chain structure and content for security
 * 2. Checks each property exists before accessing it
 * 3. Prevents prototype pollution attacks
 * 4. Handles complex nested object structures
 * 
 * @param obj - The root object to start traversal from
 * @param keyChain - Array of property names to traverse (e.g., ['api', 'users', 'create'])
 * @returns The value found at the end of the key chain
 * @throws Error if key chain is invalid, contains unsafe properties, or property doesn't exist
 * @internal
 * 
 * @example
 * ```typescript
 * const api = {
 *   users: {
 *     create: (userData) => { ... },
 *     list: () => { ... }
 *   },
 *   posts: {
 *     get: (id) => { ... }
 *   }
 * }
 * 
 * // Access nested method
 * const createUser = getKeyChain(api, ['users', 'create'])
 * // → Returns the create function
 * 
 * // Access top-level property
 * const users = getKeyChain(api, ['users'])
 * // → Returns the users object
 * 
 * // Security: these would throw errors
 * getKeyChain(api, ['__proto__']) // ✗ Unsafe property
 * getKeyChain(api, ['nonexistent']) // ✗ Property doesn't exist
 * ```
 */
function getKeyChain(obj: any, keyChain: string[]) {
  // Security: validate key chain structure and content
  assertValidKeyChain(keyChain);

  let currentObject = obj;

  // Traverse each property in the chain
  for (let i = 0; i < keyChain.length; i++) {
    const property = keyChain[i];
    
    // Security: ensure property exists and is accessible
    assertPropertyExists(currentObject, property);
    
    // Move to next level in the object hierarchy
    currentObject = currentObject[property];
  }

  return currentObject;
}




/**
 * Creates a proxy object for consuming remote objects over a PostMessageEndpoint.
 * 
 * @template T - The type of the remote object for complete type safety
 * @param ep - The PostMessageEndpoint to communicate over
 * @returns A proxy object with all methods converted to async and proper type inference
 * @public
 * 
 * @description
 * The returned proxy supports:
 * - **Method calls**: `proxy.method(args)` → RPC call with type safety
 * - **Property access**: `proxy.property` → Nested proxy with intellisense
 * - **Constructor calls**: `new proxy.Constructor(args)` → RPC construct
 * - **Async/await**: `await proxy.asyncMethod()` → Promise resolution
 * 
 * @features
 * - ✅ **Full TypeScript Support**: Complete type inference and autocomplete
 * - ✅ **Automatic Cleanup**: Memory management via FinalizationRegistry
 * - ✅ **Type-safe Arguments**: Automatic serialization with type preservation
 * - ✅ **Nested Object Access**: Deep property chains with intellisense
 * - ✅ **Promise Integration**: Seamless async/await support
 * - ✅ **Error Propagation**: Remote errors become local Promise rejections
 * 
 * @example Basic Usage with Type Safety
 * ```typescript
 * // Define your API interface for complete type safety
 * interface MathAPI {
 *   add(a: number, b: number): number
 *   multiply(a: number, b: number): number
 *   divide(a: number, b: number): number
 * }
 * 
 * const worker = new Worker('math-worker.js')
 * const math = consume<MathAPI>(worker)
 * 
 * // Full intellisense and type checking
 * const sum: number = await math.add(5, 3)      // ✅ Typed as number
 * const product: number = await math.multiply(4, 7) // ✅ Autocomplete works
 * 
 * // TypeScript catches errors at compile time
 * await math.add("5", "3")     // ❌ Type error: string not assignable to number
 * await math.nonexistent()     // ❌ Type error: property doesn't exist
 * ```
 * 
 * @example Nested Objects with Intellisense
 * ```typescript
 * interface DatabaseAPI {
 *   users: {
 *     findById(id: number): Promise<User | null>
 *     create(userData: CreateUserData): Promise<User>
 *     update(id: number, updates: Partial<User>): Promise<User>
 *   }
 *   posts: {
 *     findByUserId(userId: number): Promise<Post[]>
 *     create(postData: CreatePostData): Promise<Post>
 *   }
 * }
 * 
 * const worker = new Worker('db-worker.js')
 * const db = consume<DatabaseAPI>(worker)
 * 
 * // Nested property access with full type safety
 * const user = await db.users.findById(123)     // Type: User | null
 * const posts = await db.posts.findByUserId(123) // Type: Post[]
 * 
 * // IDE provides autocomplete for all nested properties
 * db.users.   // ← Shows: findById, create, update
 * db.posts.   // ← Shows: findByUserId, create
 * ```
 * 
 * @example Constructor Calls with Type Safety
 * ```typescript
 * interface ServiceAPI {
 *   Logger: new (name: string, level: 'info' | 'debug' | 'error') => {
 *     log(message: string): void
 *     error(message: string, error?: Error): void
 *   }
 *   Database: new (connectionString: string) => {
 *     query<T>(sql: string, params?: any[]): Promise<T[]>
 *     close(): Promise<void>
 *   }
 * }
 * 
 * const worker = new Worker('services-worker.js')
 * const services = consume<ServiceAPI>(worker)
 * 
 * // Constructor calls with type safety
 * const logger = await new services.Logger('MyApp', 'debug')
 * await logger.log('Application started')  // ✅ Fully typed
 * 
 * const db = await new services.Database('postgresql://...')
 * const users = await db.query<User>('SELECT * FROM users') // ✅ Generic support
 * ```
 * 
 * @example Error Handling with Type Safety
 * ```typescript
 * interface UserAPI {
 *   getUser(id: number): Promise<User>
 *   createUser(data: UserData): Promise<User>
 * }
 * 
 * const worker = new Worker('user-worker.js')
 * const userAPI = consume<UserAPI>(worker)
 * 
 * try {
 *   const user = await userAPI.getUser(123)
 *   console.log('User found:', user.name) // ✅ user is typed as User
 * } catch (error) {
 *   console.error('Remote error:', error.message) // ✅ Errors propagated properly
 * }
 * ```
 * 
 * @see {@link provide} - For exposing objects to be consumed
 * @see {@link createChannel} - For creating isolated communication channels
 * @see {@link Wrapped} - The return type wrapper for consumed objects
 * 
 * @since 1.0.0
 */
export function consume<T extends Record<string, any> = Record<string, any>>(
  endpoint: PostMessageEndpoint
): Wrapped<T> {
  const wrappedEndpoint = createProxyEndpoint(endpoint);  
  // ============================================================================
  // Promise Management System
  // ============================================================================
  
  /**
   * Map storing pending RPC calls waiting for responses.
   * Key: Call ID, Value: Promise resolve/reject functions
   */
  const promiseMap = new Map<string, { res: (data: any) => void, rej: (err: any) => void }>()
  
  /**
   * Creates a new Promise and registers it in the promise map.
   * Used to track RPC calls and match responses to the correct Promise.
   */
  function createPromise(id: string) {
    return new Promise((res, rej) => {
      promiseMap.set(id, { res, rej })
    })
  }

  // ============================================================================
  // Automatic Cleanup System
  // ============================================================================
  
  /**
   * Counter tracking active proxy objects for automatic cleanup.
   * When this reaches 0, all resources are cleaned up automatically.
   */
  let proxyCount = 0
  
  /**
   * FinalizationRegistry for automatic cleanup when proxies are garbage collected.
   * Ensures no memory leaks by cleaning up event listeners and pending promises.
   */
  const registry = new FinalizationRegistry(() => {
    proxyCount--
    if (proxyCount === 0) {
      cleanup()
    }
  })


  // ============================================================================
  // Response Handler - Processes incoming RPC responses
  // ============================================================================
  
  /**
   * Handles incoming RPC responses from the remote provider.
   * 
   * Processes two types of responses:
   * - Success responses: Resolves the corresponding Promise with unwrapped data
   * - Error responses: Rejects the corresponding Promise with error details
   * 
   * Security features:
   * - Validates response structure before processing
   * - Ignores channel messages (prevents cross-talk)
   * - Handles unknown call IDs gracefully
   */
  function responseHandler(ev: MessageEvent<any>) {
    // Only process non-channel messages intended for this consumer
    if (ev.data && !ev.data.channel) {
      try {
        // Security: validate response structure
        assertValidRPCResponse(ev.data);
        const response: RemoteResponse = ev.data

        if(response.type == 'response') {
          // Success response - unwrap data and resolve Promise
          const result = unwrapArgument(response.data, wrappedEndpoint)
          const promise = promiseMap.get(response.id)
  
          if (promise) {
            promise.res(result)
            promiseMap.delete(response.id)
          }
          // Note: Unknown IDs are silently ignored (might be late responses)
          
        } else if(response.type == 'error') {
          // Error response - reject Promise with error
          const promise = promiseMap.get(response.id)
          if(promise) {
            promise.rej(new Error(response.message))
            promiseMap.delete(response.id)
          }
        }
      } catch (error) {
        console.error('Error processing RPC response:', error);
      }
    }
  }


  // ============================================================================
  // Proxy Factory - Creates intelligent proxy objects for remote access
  // ============================================================================
  
  /**
   * Creates a proxy object that represents a specific path in the remote object.
   * 
   * This is the heart of the consume system - it creates JavaScript Proxy objects
   * that intercept property access, method calls, and constructor calls, converting
   * them into RPC messages.
   * 
   * **Key Features:**
   * - **Property Access**: `proxy.property` → Creates nested proxy
   * - **Method Calls**: `proxy.method(args)` → Sends RPC call
   * - **Constructor Calls**: `new proxy.Constructor(args)` → Sends RPC construct
   * - **Promise Integration**: `await proxy.asyncMethod()` → Handles .then() automatically
   * - **Memory Management**: Uses WeakRef for efficient garbage collection
   * 
   * @param keyChain - The property path to this proxy in the remote object (e.g., ['api', 'users'])
   * @returns A proxy that handles get/apply/construct operations
   * @internal
   */
  function createProxy(keyChain: string[] = []) {
    /**
     * Cache for nested proxies to avoid creating duplicates.
     * Uses WeakRef to allow garbage collection of unused proxies.
     */
    const getters = new Map<string, WeakRef<any>>()

    const proxy = new Proxy(class { }, {
      /**
       * Intercepts property access on the proxy.
       * 
       * Handles special cases:
       * - Symbols: Return undefined (prevents Symbol property access)
       * - 'then' on root: Return undefined (prevents unwanted Promise behavior)
       * - Cached properties: Return existing proxy from WeakRef
       * - New properties: Create and cache new nested proxy
       */
      get(_, property) {
        // Handle symbol access (e.g., Symbol.iterator)
        if (typeof property === 'symbol') {
          return undefined;
        }

        // Prevent root proxy from being treated as Promise
        if (keyChain.length === 0 && property === 'then') {
          return undefined;
        }

        // Return cached proxy if it still exists
        if (getters.has(property)) {
          const cachedProxy = getters.get(property)!.deref()
          if (cachedProxy) {
            return cachedProxy
          }
        }

        // Create new nested proxy for this property path
        const nestedProxy = createProxy([...keyChain, property])
        getters.set(property, new WeakRef(nestedProxy))

        return nestedProxy
      },
      
      /**
       * Intercepts function calls on the proxy.
       * 
       * Handles two scenarios:
       * 1. Promise .then() calls: Sends 'await' RPC and processes as Promise
       * 2. Regular method calls: Sends 'call' RPC with wrapped arguments
       */
      apply(_, __, args) {
        // Special handling for Promise .then() method
        if (keyChain[keyChain.length - 1] === 'then') {
          const id = getId()
          const promise = createPromise(id)

          // Send await RPC (remove 'then' from keyChain)
          const targetKeyChain = keyChain.slice(0, keyChain.length - 1)
          wrappedEndpoint.postMessage({ id, type: 'await', keyChain: targetKeyChain } as RemoteCall)

          // Process as Promise.then()
          return promise.then(...args);
        } else {
          // Regular method call
          const id = getId()
          const promise = createPromise(id)

          // Send call RPC with wrapped arguments
          wrappedEndpoint.postMessage({ 
            id, 
            type: 'call', 
            keyChain: keyChain, 
            args: wrapArguments(args, wrappedEndpoint) 
          } as RemoteCall)

          return promise;
        }
      },
      
      /**
       * Intercepts constructor calls on the proxy.
       * 
       * Handles `new proxy.Constructor(args)` by sending 'construct' RPC.
       * Constructor results are automatically marked for wrapping to maintain
       * object identity across the RPC boundary.
       */
      construct(_, args) {
        const id = getId()
        const promise = createPromise(id)

        // Send construct RPC with wrapped arguments
        wrappedEndpoint.postMessage({ 
          id, 
          type: 'construct', 
          keyChain: keyChain, 
          args: wrapArguments(args, wrappedEndpoint) 
        } as RemoteCall)

        return promise;
      }
    })

    // Register proxy for automatic cleanup and track active proxy count
    proxyCount++;
    registry.register(proxy, null)

    return proxy
  }

  // ============================================================================
  // Initialization and Cleanup
  // ============================================================================
  
  // Set up message listener for RPC responses
  wrappedEndpoint.addEventListener('message', responseHandler)

  /**
   * Cleanup function that removes event listeners and rejects pending promises.
   * Called automatically when all proxies are garbage collected.
   */
  function cleanup() {
    // Remove event listener to prevent memory leaks
    wrappedEndpoint.removeEventListener('message', responseHandler)
    
    // Reject all pending promises with cleanup error
    const cleanupError = new Error('Connection was cleaned up')
    promiseMap.forEach(promise => promise.rej(cleanupError)) 
    promiseMap.clear()
  }

  // Return the root proxy object
  return createProxy() as Wrapped<T>
}

/**
 * Exposes an object's methods and properties for remote access over a PostMessageEndpoint.
 * 
 * @template T - The type of the object being provided for type inference on consumer side
 * @param obj - The object to expose for remote access
 * @param ep - The PostMessageEndpoint to provide the object over
 * @throws {Error} If the endpoint is already being used to provide an object
 * @public
 * 
 * @description
 * The provided object becomes accessible to consumers via RPC calls and supports:
 * - **Method calls**: Automatic argument unwrapping and result wrapping
 * - **Property access**: Nested object traversal with security validation
 * - **Constructor invocation**: Class instantiation across contexts
 * - **Async method support**: Promise resolution and error propagation
 * 
 * @security
 * - ✅ **RPC Validation**: All incoming calls validated for structure and safety
 * - ✅ **Prototype Pollution Prevention**: Blocks access to `__proto__`, `prototype`, `constructor`
 * - ✅ **Property Access Control**: Validates property existence before access
 * - ✅ **Endpoint Conflict Detection**: Prevents multiple objects on same endpoint
 * - ✅ **Error Isolation**: Remote errors don't crash the provider context
 * 
 * @example Basic API Provision with Type Safety
 * ```typescript
 * // ===== worker.ts (Provider) =====
 * interface MathAPI {
 *   add(a: number, b: number): number
 *   multiply(a: number, b: number): number
 *   divide(a: number, b: number): number
 *   factorial(n: number): number
 * }
 * 
 * const mathAPI: MathAPI = {
 *   add: (a, b) => a + b,
 *   multiply: (a, b) => a * b,
 *   divide: (a, b) => {
 *     if (b === 0) throw new Error('Division by zero')
 *     return a / b
 *   },
 *   factorial: (n) => n <= 1 ? 1 : n * mathAPI.factorial(n - 1)
 * }
 * 
 * // Provide the API - consumers get full type safety
 * provide(mathAPI, self)
 * 
 * // ===== main.ts (Consumer) =====
 * const worker = new Worker('./worker.js')
 * const math = consume<MathAPI>(worker) // ← Gets full type safety from provide()
 * ```
 * 
 * @example Complex Nested Object with Database API
 * ```typescript
 * // ===== database-worker.ts =====
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 *   createdAt: Date
 * }
 * 
 * interface DatabaseAPI {
 *   users: {
 *     findById(id: number): Promise<User | null>
 *     findByEmail(email: string): Promise<User | null>
 *     create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>
 *     update(id: number, updates: Partial<User>): Promise<User>
 *     delete(id: number): Promise<void>
 *   }
 *   posts: {
 *     findByUserId(userId: number): Promise<Post[]>
 *     create(postData: CreatePostData): Promise<Post>
 *   }
 * }
 * 
 * const databaseAPI: DatabaseAPI = {
 *   users: {
 *     async findById(id) {
 *       // Database query logic
 *       return await db.query('SELECT * FROM users WHERE id = ?', [id])
 *     },
 *     async create(userData) {
 *       // Validation and creation logic
 *       return await db.insert('users', userData)
 *     },
 *     // ... other methods
 *   },
 *   posts: {
 *     // ... post methods
 *   }
 * }
 * 
 * provide(databaseAPI, self)
 * ```
 * 
 * @example Class Constructors and Instance Methods
 * ```typescript
 * // ===== services-worker.ts =====
 * interface ServiceAPI {
 *   Logger: new (name: string, level: 'debug' | 'info' | 'warn' | 'error') => {
 *     debug(message: string, ...args: any[]): void
 *     info(message: string, ...args: any[]): void
 *     warn(message: string, ...args: any[]): void
 *     error(message: string, error?: Error): void
 *     setLevel(level: string): void
 *   }
 *   Database: new (connectionString: string) => {
 *     connect(): Promise<void>
 *     query<T>(sql: string, params?: any[]): Promise<T[]>
 *     transaction<T>(callback: () => Promise<T>): Promise<T>
 *     close(): Promise<void>
 *   }
 * }
 * 
 * const serviceAPI: ServiceAPI = {
 *   Logger: class Logger {
 *     constructor(private name: string, private level: string) {}
 *     
 *     debug(message: string, ...args: any[]) {
 *       if (this.level === 'debug') {
 *         console.log(`[${this.name}] DEBUG:`, message, ...args)
 *       }
 *     }
 *     
 *     setLevel(level: string) {
 *       this.level = level
 *     }
 *     
 *     // ... other methods
 *   },
 *   
 *   Database: class Database {
 *     constructor(private connectionString: string) {}
 *     
 *     async connect() {
 *       // Connection logic
 *     }
 *     
 *     async query<T>(sql: string, params?: any[]): Promise<T[]> {
 *       // Query logic with generic return type
 *       return []
 *     }
 *     
 *     // ... other methods
 *   }
 * }
 * 
 * provide(serviceAPI, self)
 * ```
 * 
 * @example Error Handling and Async Operations
 * ```typescript
 * // ===== api-worker.ts =====
 * interface APIService {
 *   fetchUser(id: number): Promise<User>
 *   uploadFile(file: ArrayBuffer, filename: string): Promise<{ url: string, size: number }>
 *   processData(data: unknown[]): Promise<ProcessResult>
 * }
 * 
 * const apiService: APIService = {
 *   async fetchUser(id) {
 *     try {
 *       const response = await fetch(`/api/users/${id}`)
 *       if (!response.ok) {
 *         throw new Error(`User not found: ${id}`)
 *       }
 *       return await response.json()
 *     } catch (error) {
 *       // Errors are automatically propagated to consumer
 *       throw new Error(`Failed to fetch user: ${error.message}`)
 *     }
 *   },
 *   
 *   async uploadFile(file, filename) {
 *     // File upload logic with progress
 *     const formData = new FormData()
 *     formData.append('file', new Blob([file]), filename)
 *     
 *     const response = await fetch('/api/upload', {
 *       method: 'POST',
 *       body: formData
 *     })
 *     
 *     return await response.json()
 *   },
 *   
 *   async processData(data) {
 *     // Long-running data processing
 *     const results = await Promise.all(
 *       data.map(async (item) => {
 *         // Process each item
 *         return processItem(item)
 *       })
 *     )
 *     
 *     return { processed: results.length, results }
 *   }
 * }
 * 
 * provide(apiService, self)
 * ```
 * 
 * @see {@link consume} - For creating typed consumers of provided objects
 * @see {@link createChannel} - For providing multiple APIs on isolated channels
 * @see {@link Wrapped} - The type wrapper applied to consumed objects
 * 
 * @since 1.0.0
 */
export function provide<T extends Record<string, any>>(
  obj: T, 
  endpoint: PostMessageEndpoint
): void {
  const wrappedEndpoint = createProxyEndpoint(endpoint);
  
  if (exposedEndpoints.has(endpoint)) {
    throw new Error('Endpoint is already exposed: Use a different endpoint or createChannel() for multiple APIs');
  }
  exposedEndpoints.add(endpoint);

  // ============================================================================
  // RPC Request Handler - Processes incoming calls from consumers
  // ============================================================================
  
  /**
   * Handles incoming RPC requests and dispatches them to the provided object.
   * 
   * Processes three types of RPC operations:
   * 1. **await**: Property access or value retrieval
   * 2. **call**: Method invocation with arguments
   * 3. **construct**: Constructor calls for class instantiation
   * 
   * Security features:
   * - Validates all incoming RPC calls
   * - Uses secure key chain traversal
   * - Handles errors gracefully with proper error responses
   * - Ignores channel messages to prevent cross-talk
   * 
   * @param ev - The message event containing the RPC call
   */
  async function requestHandler(ev: MessageEvent<any>) {
    // Only process non-channel messages intended for this provider
    if (ev.data && !ev.data.channel) {
      try {
        // Security: validate RPC call structure
        assertValidRPCCall(ev.data);
        const call: RemoteCall = ev.data

        if (call.type === 'await') {
          // Property access or value retrieval
          const value = getKeyChain(obj, call.keyChain)

          wrappedEndpoint.postMessage({
            id: call.id,
            type: 'response',
            data: wrapArgument(value, wrappedEndpoint)
          } as RemoteResponse)
          
        } else if (call.type === 'call') {
          // Method call with arguments
          const targetFunction = getKeyChain(obj, call.keyChain)
          assertIsFunction(targetFunction, 'call target');

          // Unwrap arguments from RPC format
          const args = call.args.map(arg => unwrapArgument(arg, wrappedEndpoint))
          
          // Execute the method (support both sync and async)
          const result = await targetFunction(...args)

          wrappedEndpoint.postMessage({
            id: call.id,
            type: 'response',
            data: wrapArgument(result, wrappedEndpoint)
          } as RemoteResponse)
          
        } else if (call.type === 'construct') {
          // Constructor call
          const Constructor = getKeyChain(obj, call.keyChain)
          assertIsFunction(Constructor, 'constructor target');

          // Unwrap constructor arguments
          const args = Array.isArray(call.args) ? call.args.map(arg => unwrapArgument(arg, wrappedEndpoint)) : [];
          
          // Create new instance
          const instance = new Constructor(...args)

          // Mark instance for wrapping to maintain object identity
          markedObj.add(instance)

          wrappedEndpoint.postMessage({
            id: call.id,
            type: 'response',
            data: wrapArgument(instance, wrappedEndpoint, true)
          } as RemoteResponse)
        }
      } catch (error: any) {
        // Send error response for any failures
        wrappedEndpoint.postMessage({
          id: ev.data?.id,
          type: 'error',
          code: 'E014',
          message: error.message
        } as RemoteResponse);
      }
    }
  }

  wrappedEndpoint.addEventListener('message', requestHandler)
}