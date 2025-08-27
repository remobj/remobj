# RemObj Benchmark Suite

Performance benchmarks for RemObj packages using both Node.js and Deno runtimes.

## Architecture

The benchmark system uses a shared test definition file (`test.js`) with separate runners for each runtime:

- **test.js**: Contains all benchmark test functions (exports)
- **index.js**: Node.js benchmark runner
- **deno.ts**: Deno benchmark runner (TypeScript)
- **package.json**: Dependencies for Node.js
- **deno.json**: Configuration for Deno

## Running Benchmarks

### Node.js

```bash
# From project root
npm run bench

# From benchmark directory
npm start
# or
node index.js
```

### Deno

```bash
# From project root
npm run bench:deno

# From benchmark directory
deno run --allow-read deno.ts
# or
deno task bench
```

## Benchmark Categories

### 1. **Shared Package**
- Type Guards: `isString`, `isObject`, `isArray`, `isNumber`, mixed checks
- Clonable Checks: Simple objects, nested objects, arrays
- String Utils: `camelize`, `hyphenate`, `capitalize`

### 2. **WeakBiMap**
- Basic operations: `set`, `get` (by object/string), `has`, `delete`
- Pre-populated with 100 test objects for realistic performance

### 3. **RPC (Remote Procedure Calls)**
- Simple calls: Basic function invocation
- Nested calls: Namespace traversal
- Array handling: Small (5 items) and large (100 items)
- Object returns: Complex object creation
- Parallel calls: Multiple concurrent RPC calls

### 4. **Channel Creation**
- MessageChannel creation overhead
- Multiplexed endpoint setup
- Complete RPC setup and teardown

### 5. **Native Baseline**
- Native Map and WeakMap operations
- Object creation
- Array mapping
- Used for performance comparison

## Output Format

Results show:
- **Ops/sec**: Operations per second (with K/M suffix)
- **Average**: Mean execution time in microseconds
- **Median**: P50 percentile
- **P95**: 95th percentile
- **P99**: 99th percentile

### Summary Section
- Top 5 fastest operations
- Bottom 5 slowest operations

## CI/CD Integration

The benchmarks run automatically on:
- Every push to main branch
- Every pull request
- Manual workflow dispatch

### Matrix Testing
- **Operating Systems**: Ubuntu, Windows, macOS
- **Runtimes**: Node.js 20.x, Deno latest
- **Total**: 6 combinations (3 OS × 2 runtimes)

### PR Features
- Automatic comparison with main branch
- Performance regression detection (±5% threshold)
- Color-coded results (🟢 improved, 🔴 regressed, ⚪ unchanged)
- Comments on PR with detailed results

## Configuration

### Benchmark Settings (in runners)
```javascript
const config = {
  warmup: 100,      // Warmup iterations
  iterations: 1000, // Test iterations  
  async_iterations: 100, // For async tests
  timeout: 5000     // Max time per benchmark
}
```

### Adding New Benchmarks

1. Add test function to `test.js`:
```javascript
export function myPackage_newTest() {
  // Your benchmark code
  return result;
}
```

2. Add to both runners (`index.js` and `deno.ts`):
```javascript
results.push(await runBenchmark('new test', tests.myPackage_newTest));
```

## Performance Targets

Based on current benchmarks:

| Category | Target Performance |
|----------|-------------------|
| Type Guards | > 1M ops/sec |
| String Utils | > 4M ops/sec |
| WeakBiMap | > 2M ops/sec |
| RPC Calls | > 5K ops/sec |
| Native Baseline | > 5M ops/sec |

## Notes

- RPC benchmarks use real MessageChannel communication
- All benchmarks include warmup phase
- Results are averaged over multiple iterations
- Timeout protection prevents hanging benchmarks
- Both runtimes use identical test functions for fair comparison