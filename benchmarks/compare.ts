#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

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

async function loadResults(file: string): Promise<BenchmarkSuite[]> {
  const content = await readFile(file, 'utf8')
  return JSON.parse(content)
}

async function findLatestResults(): Promise<string> {
  const { mkdir, access } = await import('node:fs/promises')
  const resultsDir = join(process.cwd(), 'benchmarks', 'results')
  
  // Create results directory if it doesn't exist
  try {
    await access(resultsDir)
  } catch {
    await mkdir(resultsDir, { recursive: true })
    throw new Error('No benchmark results found - results directory was just created')
  }
  
  const files = await readdir(resultsDir)
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort()
  
  if (jsonFiles.length === 0) {
    throw new Error('No benchmark results found in results directory')
  }
  
  return join(resultsDir, jsonFiles[jsonFiles.length - 1])
}

async function findBaseline(): Promise<string | null> {
  const baselinePath = join(process.cwd(), 'benchmarks', 'baseline.json')
  try {
    await readFile(baselinePath)
    return baselinePath
  } catch {
    return 
  }
}

function formatChange(current: number, baseline: number): string {
  const change = ((current - baseline) / baseline) * 100
  const sign = change >= 0 ? '+' : ''
  const color = change >= 0 ? '\u001B[32m' : '\u001B[31m' // green/red
  return `${color}${sign}${change.toFixed(1)}%\u001B[0m`
}

async function compare() {
  const latestFile = await findLatestResults()
  const baselineFile = await findBaseline()
  
  console.log('Loading latest results from:', latestFile)
  const latest = await loadResults(latestFile)
  
  if (!baselineFile) {
    console.log('No baseline found. Showing current results only.\n')
    printResults(latest)
    return
  }
  
  console.log('Comparing against baseline:', baselineFile)
  const baseline = await loadResults(baselineFile)
  
  // Create lookup map for baseline
  const baselineMap = new Map<string, BenchmarkResult>()
  for (const suite of baseline) {
    for (const bench of suite.benchmarks) {
      baselineMap.set(`${suite.name}:${bench.name}`, bench)
    }
  }
  
  // Compare results
  console.log('\n' + '='.repeat(80))
  console.log('BENCHMARK COMPARISON')
  console.log('='.repeat(80) + '\n')
  
  for (const suite of latest) {
    console.log(`\n${suite.name}`)
    console.log('-'.repeat(suite.name.length))
    
    for (const bench of suite.benchmarks) {
      const key = `${suite.name}:${bench.name}`
      const baselineBench = baselineMap.get(key)
      
      console.log(`\n  ${bench.name}:`)
      console.log(`    Current:  ${bench.ops.toFixed(0)} ops/sec (${bench.time.toFixed(3)}ms)`)
      
      if (baselineBench) {
        console.log(`    Baseline: ${baselineBench.ops.toFixed(0)} ops/sec (${baselineBench.time.toFixed(3)}ms)`)
        console.log(`    Change:   ${formatChange(bench.ops, baselineBench.ops)}`)
        
        // Show percentile changes for significant differences
        if (Math.abs(bench.ops - baselineBench.ops) / baselineBench.ops > 0.1) {
          console.log(`    p95:      ${bench.percentiles.p95.toFixed(3)}ms (was ${baselineBench.percentiles.p95.toFixed(3)}ms)`)
        }
      } else {
        console.log(`    Baseline: (no data)`)
      }
    }
  }
  
  // Summary
  let improved = 0, regressed = 0, unchanged = 0
  
  for (const suite of latest) {
    for (const bench of suite.benchmarks) {
      const key = `${suite.name}:${bench.name}`
      const baselineBench = baselineMap.get(key)
      
      if (baselineBench) {
        const change = (bench.ops - baselineBench.ops) / baselineBench.ops
        if (change > 0.05) {improved++}
        else if (change < -0.05) {regressed++}
        else {unchanged++}
      }
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Improved:  ${improved}`)
  console.log(`Regressed: ${regressed}`)
  console.log(`Unchanged: ${unchanged}`)
}

function printResults(results: BenchmarkSuite[]) {
  for (const suite of results) {
    console.log(`\n${suite.name}`)
    console.log('-'.repeat(suite.name.length))
    
    for (const bench of suite.benchmarks) {
      console.log(`  ${bench.name}:`)
      console.log(`    ${bench.ops.toFixed(0)} ops/sec`)
      console.log(`    ${bench.time.toFixed(3)}ms avg`)
      console.log(`    p95: ${bench.percentiles.p95.toFixed(3)}ms`)
    }
  }
}

// Update baseline command
async function updateBaseline() {
  try {
    const latestFile = await findLatestResults()
    const latest = await loadResults(latestFile)
    
    const baselinePath = join(process.cwd(), 'benchmarks', 'baseline.json')
    await import('node:fs/promises').then(fs => 
      fs.writeFile(baselinePath, JSON.stringify(latest, undefined, 2))
    )
    
    console.log('Baseline updated from:', latestFile)
  } catch (error: any) {
    if (error.message.includes('No benchmark results found')) {
      console.log('No benchmark results available to create baseline.')
      console.log('Please run benchmarks first with: npm run bench')
      process.exit(0) // Exit gracefully since this is expected in CI
    }
    throw error
  }
}

// Main
const command = process.argv[2]

if (command === 'update-baseline') {
  updateBaseline().catch(console.error)
} else {
  compare().catch(console.error)
}

export { compare, updateBaseline }