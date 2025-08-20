# RemObj Benchmarks

Performance benchmarks for the RemObj library.

## Structure

```
benchmarks/
├── core/           # Core package micro-benchmarks
├── shared/         # Shared utilities benchmarks  
├── scenarios/      # Real-world usage scenarios
├── results/        # Benchmark results (git-ignored)
├── runner.ts       # Main benchmark runner (TypeScript)
└── simple-runner.js # Alternative simple runner
```

## Running Benchmarks

### Simple Runner (Recommended for now)
```bash
# Run simple benchmarks
node benchmarks/simple-runner.js
```

### Full Runner (Work in Progress)
```bash
# Run all benchmarks
npm run bench

# Run specific package
npm run bench core

# Compare with baseline
npm run bench:compare

# Update baseline
npm run bench:baseline
```

## Current Benchmark Results

- **Type Guards**:
  - isClonable (simple): ~470k ops/sec
  - isClonable (complex): ~1.5M ops/sec (cache working!)
  - isObject: ~700k ops/sec

- **RPC**:
  - Setup: ~13k ops/sec
  - Simple call: ~1.7k ops/sec (0.57ms latency)

## Writing Benchmarks

Each benchmark should:
1. Test a specific feature/function
2. Include multiple input sizes
3. Compare against baseline when possible
4. Be deterministic and reproducible