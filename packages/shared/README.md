# @remobj/shared

Shared utilities and helpers for the RemObj library ecosystem. Provides type guards, garbage collection utilities, string manipulation, and other common functionality used across RemObj packages.

## Installation

```bash
npm install @remobj/shared
```

## Key Features

- **Type Guards**: Comprehensive runtime type checking utilities
- **Garbage Collection**: Memory management helpers with weak references
- **String Utilities**: Common string transformations (camelize, hyphenate, etc.)
- **Object Utilities**: Safe property access and array manipulation
- **Comparison Functions**: Deep equality and loose comparison utilities
- **Performance Constants**: Reusable empty objects and arrays
- **TypeScript Types**: Advanced utility types for type manipulation

## Basic Usage

### Type Guards

```typescript
import { isFunction, isArray, isPlainObject, isPromise } from '@remobj/shared'

const value: unknown = getData()

if (isFunction(value)) {
  // TypeScript knows value is a function
  const result = value()
}

if (isArray(value)) {
  // TypeScript knows value is an array
  console.log(value.length)
}

if (isPlainObject(value)) {
  // TypeScript knows value is a plain object
  console.log(Object.keys(value))
}

if (isPromise(value)) {
  // TypeScript knows value is a Promise
  const result = await value
}
```

### String Utilities

```typescript
import { camelize, hyphenate, capitalize } from '@remobj/shared'

camelize('hello-world')     // 'helloWorld'
hyphenate('helloWorld')     // 'hello-world'  
capitalize('hello')         // 'Hello'
```

### Object and Array Utilities

```typescript
import { hasOwnProperty, removeFromArray } from '@remobj/shared'

// Safe property checking
const obj = { name: 'John', age: 30 }
if (hasOwnProperty(obj, 'name')) {
  console.log(obj.name) // TypeScript knows this exists
}

// Array manipulation
const items = [1, 2, 3, 2, 4]
removeFromArray(items, 2)
console.log(items) // [1, 3, 2, 4] - only first occurrence removed
```

### Performance Constants

```typescript
import { EMPTY_OBJ, EMPTY_ARR, NOOP } from '@remobj/shared'

// Use these instead of creating new empty objects/arrays
function processData(options = EMPTY_OBJ) {
  // More efficient than options = {}
}

function handleItems(items = EMPTY_ARR as readonly string[]) {
  // More efficient than items = []
}

function withCallback(callback = NOOP) {
  // Safe default no-op function
}
```

### Garbage Collection

```typescript
import { onGarbageCollected, unregisterGarbageCollection } from '@remobj/shared'

const resource = { data: 'important' }
const cleanup = () => console.log('Resource was garbage collected')

// Register cleanup when object is GC'd
const unregister = onGarbageCollected(resource, cleanup)

// Manually unregister if needed
unregister()
// or
unregisterGarbageCollection(resource)
```

### Comparison Utilities

```typescript
import { looseEqual, looseIndexOf } from '@remobj/shared'

// Deep equality check with loose comparison
looseEqual([1, 2, { a: 3 }], [1, 2, { a: 3 }]) // true
looseEqual('123', 123) // true (loose comparison)

// Find index with loose equality
const items = [1, '2', { a: 3 }]
looseIndexOf(items, 2) // 1 (finds '2' with loose equality)
```

## Main Exports

### Type Guards
- `isArray(val)` - Check if value is array
- `isMap(val)` - Check if value is Map
- `isSet(val)` - Check if value is Set  
- `isDate(val)` - Check if value is Date
- `isRegExp(val)` - Check if value is RegExp
- `isFunction(val)` - Check if value is function
- `isString(val)` - Check if value is string
- `isSymbol(val)` - Check if value is symbol
- `isObject(val)` - Check if value is object
- `isNumber(val)` - Check if value is number
- `isPromise(val)` - Check if value is Promise
- `isPlainObject(val)` - Check if value is plain object
- `isIntegerKey(val)` - Check if value is valid integer key
- `toRawType(val)` - Get raw type string
- `isClonable(val)` - Check if value can be cloned
- `hasOnlyPlainObjects(val)` - Check if object tree contains only plain objects

### String Utilities
- `camelize(str)` - Convert kebab-case to camelCase
- `hyphenate(str)` - Convert camelCase to kebab-case  
- `capitalize(str)` - Capitalize first letter

### Object Utilities
- `hasOwnProperty(obj, key)` - Safe own property check
- `removeFromArray(arr, element)` - Remove first occurrence from array

### Constants
- `EMPTY_OBJ` - Frozen empty object (dev mode) or empty object
- `EMPTY_ARR` - Frozen empty array (dev mode) or empty array  
- `NOOP` - No-operation function

### Comparison
- `looseEqual(a, b)` - Deep equality with loose comparison
- `looseIndexOf(arr, val)` - Find index with loose equality

### Garbage Collection
- `onGarbageCollected(target, callback)` - Register GC callback
- `unregisterGarbageCollection(target)` - Unregister GC callback

### TypeScript Types
- `Prettify<T>` - Clean up intersection types
- `UnionToIntersection<T>` - Convert union to intersection type
- `LooseRequired<T>` - Make properties required with loose constraints  
- `IfAny<T, Y, N>` - Conditional type for any check
- `IsKeyValues<T>` - Check if type represents key-value pairs
- `OverloadParameters<T>` - Extract parameters from overloaded functions

## Repository

Part of the [RemObj monorepo](https://github.com/remobj/remobj). For more information, examples, and documentation, visit the main repository.

## License

MIT