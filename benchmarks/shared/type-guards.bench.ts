import { 
  isClonable,
  isObject,
  isPlainObject,
  isArray,
  isFunction,
  isSymbol
} from '@remobj/shared'

export const name = 'Type Guards Benchmarks'

// Test subjects
const plainObj = { a: 1, b: 'test' }
const nestedObj = { a: { b: { c: 1 } } }
const arrayObj = [1, 2, 3, { x: 'y' }]
const dateObj = new Date()
const mapObj = new Map([['a', 1]])
const classInstance = new (class Test { x = 1 })()

// Benchmark: isClonable with cache hits
export function isClonableCached() {
  // These should hit cache after first call
  isClonable(plainObj)
  isClonable(nestedObj)
  isClonable(arrayObj)
  isClonable(dateObj)
  isClonable(mapObj)
}

// Benchmark: isClonable with new objects
export function isClonableNew() {
  isClonable({ x: Math.random() })
  isClonable([Math.random()])
  isClonable(new Date())
}

// Benchmark: Basic type guards
export function basicTypeGuards() {
  isObject(plainObj)
  isArray(arrayObj)
  isFunction(() => {})
  isSymbol(Symbol('test'))
  isPlainObject(plainObj)
}

// Benchmark: Complex object checking
export function complexObjectCheck() {
  const complex = {
    data: Array(50).fill(0).map((_, i) => ({
      id: i,
      values: [i, i * 2, i * 3],
      meta: { created: new Date() }
    }))
  }
  
  isClonable(complex)
}

// Benchmark: Mixed type checking
export function mixedTypeChecking() {
  const values = [
    'string',
    123,
    true,
    null,
    undefined,
    { obj: true },
    [1, 2, 3],
    new Date(),
    () => {},
    Symbol('test')
  ]
  
  for (const val of values) {
    isObject(val)
    isClonable(val)
  }
}