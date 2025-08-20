#!/usr/bin/env node
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

interface BenchmarkResult {
  name: string
  ops: number
  time: number
  iterations: number
  percentiles: {
    p50: number
    p75: number
    p95: number
    p99: number
  }
}

interface BenchmarkSuite {
  name: string
  benchmarks: BenchmarkResult[]
  timestamp: number
}

class BenchmarkRunner {
  private results: BenchmarkSuite[] = []
  
  async runBenchmark(
    name: string, 
    fn: () => void | Promise<void>,
    options = { duration: 1000, warmup: 100 }
  ): Promise<BenchmarkResult> {
    const times: number[] = []
    
    // Warmup
    for (let i = 0; i < options.warmup; i++) {
      await fn()
    }
    
    // Measure
    const startTime = performance.now()
    let iterations = 0
    
    while (performance.now() - startTime < options.duration) {
      const iterStart = performance.now()
      await fn()
      const iterTime = performance.now() - iterStart
      times.push(iterTime)
      iterations++
    }
    
    // Calculate stats
    times.sort((a, b) => a - b)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    
    return {
      name,
      ops: 1000 / avgTime,
      time: avgTime,
      iterations,
      percentiles: {
        p50: times[Math.floor(times.length * 0.5)],
        p75: times[Math.floor(times.length * 0.75)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)]
      }
    }
  }
  
  async runSuite(suitePath: string) {
    const suite = await import(pathToFileURL(suitePath).href)
    const results: BenchmarkResult[] = []
    
    console.log(`Running ${suite.name || suitePath}...`)
    
    for (const [name, benchmark] of Object.entries(suite)) {
      if (name === 'name' || name === 'default') {continue}
      if (typeof benchmark === 'function') {
        const result = await this.runBenchmark(name, benchmark)
        results.push(result)
        this.printResult(result)
      }
    }
    
    this.results.push({
      name: suite.name || suitePath,
      benchmarks: results,
      timestamp: Date.now()
    })
  }
  
  printResult(result: BenchmarkResult) {
    console.log(`  ${result.name}:`)
    console.log(`    ${result.ops.toFixed(0)} ops/sec`)
    console.log(`    ${result.time.toFixed(3)}ms avg`)
    console.log(`    p95: ${result.percentiles.p95.toFixed(3)}ms`)
  }
  
  async saveResults(outputPath: string) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(
      outputPath,
      JSON.stringify(this.results, undefined, 2)
    )
  }
}

// Main execution
async function main() {
  const runner = new BenchmarkRunner()
  const target = process.argv[2] || '.'
  
  // Find all benchmark files
  const benchFiles: string[] = []
  
  async function findBenchmarks(path: string) {
    const { stat } = await import('node:fs/promises')
    const stats = await stat(path)
    
    if (stats.isFile() && path.endsWith('.bench.ts')) {
      benchFiles.push(path)
    } else if (stats.isDirectory()) {
      const entries = await readdir(path, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = join(path, entry.name)
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await findBenchmarks(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.bench.ts')) {
          benchFiles.push(fullPath)
        }
      }
    }
  }
  
  const targetPath = target.endsWith('.bench.ts') 
    ? join(process.cwd(), target)
    : join(process.cwd(), 'benchmarks', target)
    
  await findBenchmarks(targetPath)
  
  // Run benchmarks
  for (const file of benchFiles) {
    await runner.runSuite(file)
  }
  
  // Save results
  const timestamp = new Date().toISOString().replaceAll(":", '-')
  await runner.saveResults(
    join(process.cwd(), 'benchmarks', 'results', `${timestamp}.json`)
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error)
}

export { BenchmarkRunner }