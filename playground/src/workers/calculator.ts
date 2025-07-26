import { provide } from '@remobj/core'

// Calculator implementation that runs in a Web Worker
const calculator = {
  async add(a: number, b: number): Promise<number> {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100))
    return a + b
  },

  async fibonacci(n: number): Promise<number> {
    // Recursive fibonacci with some optimization
    function fib(num: number): number {
      if (num <= 1) return num
      return fib(num - 1) + fib(num - 2)
    }
    
    // Simulate heavy computation
    const result = fib(n)
    return result
  },

  async findPrimes(max: number): Promise<number[]> {
    const primes: number[] = []
    
    // Sieve of Eratosthenes
    const sieve = new Array(max + 1).fill(true)
    sieve[0] = sieve[1] = false
    
    for (let i = 2; i * i <= max; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= max; j += i) {
          sieve[j] = false
        }
      }
    }
    
    for (let i = 2; i <= max; i++) {
      if (sieve[i]) {
        primes.push(i)
      }
    }
    
    // Simulate processing time based on complexity
    await new Promise(resolve => setTimeout(resolve, Math.min(1000, max / 10)))
    
    return primes
  }
}

// Expose the calculator API to the main thread
provide(calculator, self)

// Log that the worker is ready
console.log('🧮 Calculator worker ready')

// Handle worker lifecycle
self.addEventListener('error', (error) => {
  console.error('Calculator worker error:', error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Calculator worker unhandled rejection:', event.reason)
})