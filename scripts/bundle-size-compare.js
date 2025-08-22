#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDiff(current, base) {
  const diff = current - base
  const percent = base > 0 ? ((diff / base) * 100).toFixed(1) : 0
  
  if (diff === 0) return '='
  
  const sign = diff > 0 ? '+' : ''
  const emoji = diff > 0 ? '🔴' : '🟢'
  
  return `${emoji} ${sign}${formatBytes(diff)} (${sign}${percent}%)`
}

function generateReport() {
  const prReportPath = join(rootDir, 'pr-size-report.json')
  const baseReportPath = join(rootDir, 'base-size-report.json')
  
  // Check if files exist
  if (!existsSync(prReportPath)) {
    console.log('❌ PR size report not found')
    process.exit(1)
  }
  
  const prReport = JSON.parse(readFileSync(prReportPath, 'utf8'))
  
  // If base doesn't exist (new feature), show only PR sizes
  const hasBase = existsSync(baseReportPath)
  const baseReport = hasBase ? JSON.parse(readFileSync(baseReportPath, 'utf8')) : null
  
  // Generate markdown comment
  console.log('## 📦 Bundle Size Report\n')
  console.log('Analyzing the impact of this PR on bundle size:\n')
  
  // Size comparison table
  console.log('| Format | Base | PR | Diff |')
  console.log('|--------|------|----|----|')
  
  if (hasBase) {
    console.log(`| **Original** | ${formatBytes(baseReport.sizes.original)} | ${formatBytes(prReport.sizes.original)} | ${formatDiff(prReport.sizes.original, baseReport.sizes.original)} |`)
    console.log(`| **Gzip** | ${formatBytes(baseReport.sizes.gzip)} | ${formatBytes(prReport.sizes.gzip)} | ${formatDiff(prReport.sizes.gzip, baseReport.sizes.gzip)} |`)
    console.log(`| **Brotli** | ${formatBytes(baseReport.sizes.brotli)} | ${formatBytes(prReport.sizes.brotli)} | ${formatDiff(prReport.sizes.brotli, baseReport.sizes.brotli)} |`)
  } else {
    console.log(`| **Original** | - | ${formatBytes(prReport.sizes.original)} | New |`)
    console.log(`| **Gzip** | - | ${formatBytes(prReport.sizes.gzip)} | New |`)
    console.log(`| **Brotli** | - | ${formatBytes(prReport.sizes.brotli)} | New |`)
  }
  
  console.log('\n### 📊 Compression Efficiency\n')
  console.log(`- **Gzip:** ${prReport.compression.gzip} reduction`)
  console.log(`- **Brotli:** ${prReport.compression.brotli} reduction`)
  
  // Threshold warnings
  const GZIP_WARNING_THRESHOLD = 5 * 1024 // 5KB
  const GZIP_ERROR_THRESHOLD = 10 * 1024 // 10KB
  
  if (prReport.sizes.gzip > GZIP_ERROR_THRESHOLD) {
    console.log('\n### ⚠️ Size Warning\n')
    console.log(`The bundle size (${formatBytes(prReport.sizes.gzip)} gzipped) exceeds the recommended limit of ${formatBytes(GZIP_ERROR_THRESHOLD)}.`)
    console.log('Consider splitting the bundle or removing unnecessary dependencies.')
  } else if (prReport.sizes.gzip > GZIP_WARNING_THRESHOLD) {
    console.log('\n### 📝 Note\n')
    console.log(`Bundle is approaching size limit (${formatBytes(prReport.sizes.gzip)} / ${formatBytes(GZIP_ERROR_THRESHOLD)} gzipped)`)
  }
  
  // Size increase warnings
  if (hasBase) {
    const increase = prReport.sizes.gzip - baseReport.sizes.gzip
    const percentIncrease = baseReport.sizes.gzip > 0 ? (increase / baseReport.sizes.gzip * 100) : 0
    
    if (percentIncrease > 10) {
      console.log('\n### 🚨 Significant Size Increase\n')
      console.log(`This PR increases the bundle size by ${percentIncrease.toFixed(1)}%.`)
      console.log('Please review if all additions are necessary.')
    }
  }
  
  console.log('\n---')
  console.log('*Generated for commit: ' + process.env.GITHUB_SHA?.substring(0, 7) + '*')
}

try {
  generateReport()
} catch (error) {
  console.error('Error generating bundle size report:', error)
  process.exit(1)
}