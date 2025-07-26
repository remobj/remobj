#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { gzipSizeSync } from 'gzip-size'

// Simple brotli fallback for now
function brotliSizeSync(content) {
  // For now, estimate brotli as ~80% of gzip size
  return Math.round(gzipSizeSync(content) * 0.8)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const statsDir = join(rootDir, '.bundle-stats')

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  files.forEach(file => {
    const filePath = join(dir, file)
    if (statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList)
    } else {
      fileList.push({ name: file, path: filePath, relativePath: filePath.replace(distDir + '\\', '').replace(distDir + '/', '') })
    }
  })
  return fileList
}

function analyzeBundles() {
  const allFiles = getAllFiles(distDir)
  const jsFiles = allFiles.filter(f => f.name.endsWith('.js'))
  const cssFiles = allFiles.filter(f => f.name.endsWith('.css'))
  
  const stats = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    files: {},
    totals: {
      raw: 0,
      gzip: 0,
      brotli: 0
    }
  }

  // Analyze JS files
  jsFiles.forEach(file => {
    const content = readFileSync(file.path)
    const rawSize = content.length
    const gzipSize = gzipSizeSync(content)
    const brotliSize = brotliSizeSync(content)

    stats.files[file.relativePath] = {
      type: 'js',
      raw: rawSize,
      gzip: gzipSize,
      brotli: brotliSize,
      rawFormatted: formatBytes(rawSize),
      gzipFormatted: formatBytes(gzipSize),
      brotliFormatted: formatBytes(brotliSize)
    }

    stats.totals.raw += rawSize
    stats.totals.gzip += gzipSize
    stats.totals.brotli += brotliSize
  })

  // Analyze CSS files
  cssFiles.forEach(file => {
    const content = readFileSync(file.path)
    const rawSize = content.length
    const gzipSize = gzipSizeSync(content)
    const brotliSize = brotliSizeSync(content)

    stats.files[file.relativePath] = {
      type: 'css',
      raw: rawSize,
      gzip: gzipSize,
      brotli: brotliSize,
      rawFormatted: formatBytes(rawSize),
      gzipFormatted: formatBytes(gzipSize),
      brotliFormatted: formatBytes(brotliSize)
    }

    stats.totals.raw += rawSize
    stats.totals.gzip += gzipSize
    stats.totals.brotli += brotliSize
  })

  // Format totals
  stats.totals.rawFormatted = formatBytes(stats.totals.raw)
  stats.totals.gzipFormatted = formatBytes(stats.totals.gzip)
  stats.totals.brotliFormatted = formatBytes(stats.totals.brotli)

  return stats
}

function loadHistoricalStats() {
  const historyFile = join(statsDir, 'history.json')
  if (!existsSync(historyFile)) {
    return []
  }
  
  try {
    return JSON.parse(readFileSync(historyFile, 'utf8'))
  } catch (error) {
    console.warn('Could not load historical stats:', error.message)
    return []
  }
}

function saveStats(stats) {
  // Save current stats
  const currentFile = join(statsDir, 'current.json')
  writeFileSync(currentFile, JSON.stringify(stats, null, 2))

  // Load and update history
  const history = loadHistoricalStats()
  history.push(stats)

  // Keep only last 100 entries
  if (history.length > 100) {
    history.splice(0, history.length - 100)
  }

  // Save history
  const historyFile = join(statsDir, 'history.json')
  writeFileSync(historyFile, JSON.stringify(history, null, 2))

  return history
}

function generateReport(stats, history) {
  console.log('\\n📦 Bundle Size Report')
  console.log('='.repeat(50))
  
  console.log('\\n🗂️  Individual Files:')
  Object.entries(stats.files).forEach(([filename, fileStats]) => {
    console.log(`  ${filename}:`)
    console.log(`    Raw:    ${fileStats.rawFormatted}`)
    console.log(`    Gzip:   ${fileStats.gzipFormatted}`)
    console.log(`    Brotli: ${fileStats.brotliFormatted}`)
  })

  console.log('\\n📊 Total Bundle Size:')
  console.log(`  Raw:    ${stats.totals.rawFormatted}`)
  console.log(`  Gzip:   ${stats.totals.gzipFormatted}`)
  console.log(`  Brotli: ${stats.totals.brotliFormatted}`)

  // Compare with previous build
  if (history.length > 1) {
    const previous = history[history.length - 2]
    const currentGzip = stats.totals.gzip
    const previousGzip = previous.totals.gzip
    const diff = currentGzip - previousGzip
    const diffPercent = ((diff / previousGzip) * 100).toFixed(2)

    console.log('\\n📈 Size Change (vs previous):')
    if (diff > 0) {
      console.log(`  📈 +${formatBytes(diff)} (+${diffPercent}%)`)
    } else if (diff < 0) {
      console.log(`  📉 ${formatBytes(diff)} (${diffPercent}%)`)
    } else {
      console.log(`  ➖ No change`)
    }

    // Alert if size increased significantly
    const ALERT_THRESHOLD = 0.1 // 10% increase
    if (diffPercent > ALERT_THRESHOLD * 100 && diffPercent !== Infinity) {
      console.log('\\n⚠️  WARNING: Bundle size increased significantly!')
      console.log(`   Threshold: ${ALERT_THRESHOLD * 100}% | Actual: +${diffPercent}%`)
      
      // Only fail CI for actual size increases, not first builds
      if (process.env.CI === 'true' && previous.totals.gzip > 0) {
        process.exitCode = 1
      }
    }
  }

  console.log('\\n' + '='.repeat(50))
}

function generateMarkdownReport(stats, history) {
  let markdown = `# Bundle Size Report\\n\\n`
  markdown += `**Generated:** ${new Date().toLocaleString()}\\n`
  markdown += `**Commit:** ${stats.commit}\\n`
  markdown += `**Branch:** ${stats.branch}\\n\\n`

  markdown += `## 📦 Current Bundle Size\\n\\n`
  markdown += `| File | Raw | Gzip | Brotli |\\n`
  markdown += `|------|-----|------|--------|\\n`
  
  Object.entries(stats.files).forEach(([filename, fileStats]) => {
    markdown += `| ${filename} | ${fileStats.rawFormatted} | ${fileStats.gzipFormatted} | ${fileStats.brotliFormatted} |\\n`
  })

  markdown += `| **Total** | **${stats.totals.rawFormatted}** | **${stats.totals.gzipFormatted}** | **${stats.totals.brotliFormatted}** |\\n\\n`

  if (history.length > 1) {
    const previous = history[history.length - 2]
    const diff = stats.totals.gzip - previous.totals.gzip
    const diffPercent = ((diff / previous.totals.gzip) * 100).toFixed(2)

    markdown += `## 📈 Size Change\\n\\n`
    if (diff > 0) {
      markdown += `📈 **+${formatBytes(diff)}** (+${diffPercent}%)\\n\\n`
    } else if (diff < 0) {
      markdown += `📉 **${formatBytes(diff)}** (${diffPercent}%)\\n\\n`
    } else {
      markdown += `➖ **No change**\\n\\n`
    }
  }

  // Add trend chart (last 10 builds)
  if (history.length > 1) {
    markdown += `## 📊 Size Trend (Last 10 Builds)\\n\\n`
    const recent = history.slice(-10)
    markdown += `| Build | Date | Gzip Size | Change |\\n`
    markdown += `|-------|------|-----------|--------|\\n`
    
    recent.forEach((build, index) => {
      const prevBuild = index > 0 ? recent[index - 1] : null
      const change = prevBuild 
        ? build.totals.gzip - prevBuild.totals.gzip
        : 0
      const changeStr = change === 0 ? '-' : 
        change > 0 ? `+${formatBytes(change)}` : 
        formatBytes(change)
      
      markdown += `| ${index + 1} | ${new Date(build.timestamp).toLocaleDateString()} | ${build.totals.gzipFormatted} | ${changeStr} |\\n`
    })
  }

  const reportFile = join(statsDir, 'report.md')
  writeFileSync(reportFile, markdown)
  
  return markdown
}

function main() {
  if (!existsSync(distDir)) {
    console.error('❌ Dist directory not found. Run "npm run build" first.')
    process.exit(1)
  }

  console.log('🔍 Analyzing bundle sizes...')
  
  const stats = analyzeBundles()
  const history = saveStats(stats)
  
  generateReport(stats, history)
  const markdown = generateMarkdownReport(stats, history)
  
  console.log(`\\n💾 Stats saved to ${join(statsDir, 'current.json')}`)
  console.log(`📄 Report saved to ${join(statsDir, 'report.md')}`)

  // Output for GitHub Actions
  if (process.env.GITHUB_ACTIONS) {
    console.log('\\n::group::Bundle Size Details')
    console.log(markdown)
    console.log('::endgroup::')
  }
}

main()