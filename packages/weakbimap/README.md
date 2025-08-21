# @remobj/weakbimap

A bidirectional weak map implementation that supports both primitive and object keys/values with automatic garbage collection.

## Features

- 🔄 **Bidirectional mapping** - Look up by key or value
- 🗑️ **Automatic garbage collection** - Objects are automatically cleaned up when no longer referenced
- 🎯 **Mixed type support** - Use primitives and objects as keys and values
- 📦 **Full Map interface** - Drop-in replacement for Map with weak reference benefits
- 🚀 **Memory efficient** - Automatic cleanup strategy prevents memory leaks
- 💪 **TypeScript support** - Fully typed with generics

## Installation

```bash
npm install @remobj/weakbimap
```

## Usage

### Basic Usage

```typescript
import { WeakBiMap } from '@remobj/weakbimap'

const map = new WeakBiMap<string, object>()

// Store primitive key with object value
const userData = { name: 'Alice', age: 30 }
map.set('user:123', userData)

// Store object key with primitive value
const config = { setting: 'value' }
map.set(config, 'config:main')

// Retrieve values
console.log(map.get('user:123')) // { name: 'Alice', age: 30 }
console.log(map.get(config)) // 'config:main'
```

### Object-to-Object Mapping

```typescript
const map = new WeakBiMap<object, object>()

const key = { id: 1 }
const value = { data: 'test' }

map.set(key, value)
console.log(map.get(key)) // { data: 'test' }

// Objects are automatically garbage collected when no longer referenced
// No need to manually clean up!
```

### Mixed Types

```typescript
const map = new WeakBiMap<any, any>()

// All these work!
map.set('string-key', { object: 'value' })
map.set({ object: 'key' }, 'string-value')
map.set(123, 456)
map.set(Symbol.for('sym'), new Date())
map.set(null, undefined)
map.set(BigInt(999), [1, 2, 3])
```

### Iteration

```typescript
const map = new WeakBiMap([
  ['key1', 'value1'],
  ['key2', 'value2'],
  ['key3', 'value3']
])

// Iterate over entries
for (const [key, value] of map) {
  console.log(key, value)
}

// Get all keys
const keys = Array.from(map.keys())

// Get all values
const values = Array.from(map.values())

// forEach with context
map.forEach(function(value, key) {
  console.log(this.prefix + key, value)
}, { prefix: '> ' })
```

### Memory Management

```typescript
const map = new WeakBiMap<object, string>()

function createTemporaryData() {
  const tempObject = { temp: true, data: new Array(1000000) }
  map.set(tempObject, 'temporary')
  // tempObject goes out of scope here
}

createTemporaryData()

// The temporary object and its data will be automatically
// garbage collected, removing it from the map!

// Manual cleanup is also available if needed
map.forceCleanup()
```

## API Reference

### Constructor

```typescript
new WeakBiMap<K, V>(entries?: readonly (readonly [K, V])[] | null)
```

### Properties

- `size: number` - Returns the number of entries (triggers cleanup for accuracy)
- `[Symbol.toStringTag]: string` - Returns 'WeakBiMap'

### Methods

#### Core Operations
- `set(key: K, value: V): this` - Add or update an entry
- `get(key: K): V | undefined` - Retrieve a value by key
- `has(key: K): boolean` - Check if a key exists
- `delete(key: K): boolean` - Remove an entry by key
- `clear(): void` - Remove all entries

#### Iteration
- `entries(): MapIterator<[K, V]>` - Get an iterator for entries
- `keys(): MapIterator<K>` - Get an iterator for keys
- `values(): MapIterator<V>` - Get an iterator for values
- `forEach(callback, thisArg?): void` - Iterate with a callback
- `[Symbol.iterator](): MapIterator<[K, V]>` - Default iterator

#### Maintenance
- `forceCleanup(): void` - Manually trigger garbage collection cleanup
- `dispose(): void` - Clear the map and release resources

## How It Works

WeakBiMap uses a combination of `WeakMap`, `WeakRef`, and `Map` to provide:

1. **Weak references for objects** - Objects used as keys or values are stored using WeakRef, allowing them to be garbage collected
2. **Strong references for primitives** - Primitive types are stored directly since they can't be weakly referenced
3. **Automatic cleanup** - Dead WeakRefs are cleaned up periodically (every 100 operations) or on-demand
4. **Bidirectional mapping** - Efficient lookups in both directions

## Performance Considerations

- **Cleanup strategy**: Automatic cleanup happens every 100 operations to balance performance and memory
- **Size calculation**: Getting the size triggers a full cleanup for accuracy
- **Iteration**: Elements may be garbage collected during iteration; the iterator provides a snapshot
- **Memory efficiency**: Significantly better than Map for large objects that become unreachable

## Use Cases

- **Caching with automatic eviction** - Cache objects that auto-remove when no longer needed
- **Metadata storage** - Attach metadata to objects without preventing garbage collection
- **Event listener management** - Track listeners without memory leaks
- **Bidirectional lookups** - Efficiently look up by key or value
- **Temporary associations** - Create temporary object relationships that clean up automatically

## License

MIT