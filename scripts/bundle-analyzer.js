import { readFileSync, statSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { join } from 'node:path'

/**
 * Formats bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.2 KB")
 */
function formatBytes(bytes) {
  if (bytes === 0) {return '0 B'}
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Formats bytes to show both human readable format and exact bytes
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.2 KB (1,234 bytes)")
 */
function formatBytesWithExact(bytes) {
  if (bytes === 0) {return '0 B (0 bytes)'}
  
  const humanReadable = formatBytes(bytes)
  const exactBytes = bytes.toLocaleString()
  
  return `${humanReadable} (${exactBytes} bytes)`
}

/**
 * Calculates compression ratio as percentage
 * @param {number} original - Original size in bytes
 * @param {number} compressed - Compressed size in bytes
 * @returns {string} Compression ratio (e.g., "65%")
 */
function compressionRatio(original, compressed) {
  const ratio = ((original - compressed) / original * 100).toFixed(1)
  return `${ratio}%`
}

/**
 * Analyzes a single file and returns size information
 * @param {string} filePath - Path to the file
 * @returns {object} Size analysis data
 */
function analyzeFile(filePath) {
  try {
    const stats = statSync(filePath)
    const originalSize = stats.size
    
    if (originalSize === 0) {
      return {
        original: 0,
        gzip: 0,
        brotli: 0,
        gzipRatio: '0%',
        brotliRatio: '0%'
      }
    }
    
    const content = readFileSync(filePath)
    const gzipped = gzipSync(content)
    const brotlied = brotliCompressSync(content)
    
    return {
      original: originalSize,
      gzip: gzipped.length,
      brotli: brotlied.length,
      gzipRatio: compressionRatio(originalSize, gzipped.length),
      brotliRatio: compressionRatio(originalSize, brotlied.length)
    }
  } catch (error) {
    return {
      original: 0,
      gzip: 0,
      brotli: 0,
      gzipRatio: '0%',
      brotliRatio: '0%',
      error: error.message
    }
  }
}

/**
 * Creates a formatted table row for bundle analysis
 * @param {string} file - File name
 * @param {object} analysis - Analysis data
 * @returns {string} Formatted table row
 */
function createTableRow(file, analysis) {
  if (analysis.error) {
    return `${file.padEnd(30)} ERROR: ${analysis.error}`
  }
  
  const original = formatBytesWithExact(analysis.original).padStart(18)
  const gzip = formatBytesWithExact(analysis.gzip).padStart(18)
  const brotli = formatBytesWithExact(analysis.brotli).padStart(18)
  const gzipRatio = analysis.gzipRatio.padStart(6)
  const brotliRatio = analysis.brotliRatio.padStart(6)
  
  return `${file.padEnd(30)} ${original} ${gzip} ${brotli} ${gzipRatio} ${brotliRatio}`
}

/**
 * Analyzes all built files and displays bundle sizes
 * @param {string[]} outputFiles - Array of output file paths
 */
export function analyzeBundles(outputFiles) {
  if (!outputFiles || outputFiles.length === 0) {
    console.log('No output files to analyze')
    return
  }
  
  console.log('\n📦 Bundle Size Analysis')
  console.log('=' .repeat(108))
  
  // Header
  const header = 'File'.padEnd(30) + 
                '          Original'.padStart(18) + 
                '              Gzip'.padStart(18) + 
                '            Brotli'.padStart(18) + 
                '  Gzip%'.padStart(6) + 
                ' Brotli%'.padStart(6)
  console.log(header)
  console.log('-'.repeat(108))
  
  // Group files by build format
  const formatGroups = {}
  const totals = {
    original: 0,
    gzip: 0,
    brotli: 0
  }
  
  outputFiles.forEach(filePath => {
    const analysis = analyzeFile(filePath)
    
    // Extract package name and file info
    const parts = filePath.replaceAll("\\\\", '/').split('/')
    const packagesIndex = parts.findIndex(part => part === 'packages')
    const packageName = packagesIndex !== -1 && packagesIndex + 1 < parts.length 
      ? parts[packagesIndex + 1] 
      : 'unknown'
    const fileName = parts[parts.length - 1]
    
    // Determine build format from filename
    let buildFormat = 'unknown'
    if (fileName.includes('.esm.js')) {
      buildFormat = 'ESM Production'
    } else if (fileName.includes('.bundler.js')) {
      buildFormat = 'ESM Bundler'
    } else if (fileName.includes('.umd.js')) {
      buildFormat = 'UMD'
    }
    
    if (!formatGroups[buildFormat]) {
      formatGroups[buildFormat] = {
        files: [],
        totals: { original: 0, gzip: 0, brotli: 0 }
      }
    }
    
    formatGroups[buildFormat].files.push({
      packageName,
      fileName,
      analysis,
      fullPath: filePath
    })
    
    // Add to format totals
    formatGroups[buildFormat].totals.original += analysis.original
    formatGroups[buildFormat].totals.gzip += analysis.gzip
    formatGroups[buildFormat].totals.brotli += analysis.brotli
    
    // Add to grand totals
    totals.original += analysis.original
    totals.gzip += analysis.gzip
    totals.brotli += analysis.brotli
  })
  
  // Display by build format
  const formatOrder = ['ESM Production', 'ESM Bundler', 'UMD', 'unknown']
  formatOrder.forEach(formatName => {
    if (!formatGroups[formatName]) {return}
    
    const formatData = formatGroups[formatName]
    console.log(`\n📦 ${formatName}`)
    
    formatData.files.forEach(({ packageName, fileName, analysis }) => {
      const displayName = `${packageName}/${fileName}`
      console.log(createTableRow(displayName, analysis))
    })
    
    // Show format subtotal
    if (formatData.files.length > 1) {
      console.log('-'.repeat(108))
      const formatTotalAnalysis = {
        original: formatData.totals.original,
        gzip: formatData.totals.gzip,
        brotli: formatData.totals.brotli,
        gzipRatio: compressionRatio(formatData.totals.original, formatData.totals.gzip),
        brotliRatio: compressionRatio(formatData.totals.original, formatData.totals.brotli)
      }
      console.log(createTableRow(`${formatName} SUBTOTAL`, formatTotalAnalysis))
    }
  })
  
  // Display totals
  console.log('-'.repeat(108))
  const totalAnalysis = {
    original: totals.original,
    gzip: totals.gzip,
    brotli: totals.brotli,
    gzipRatio: compressionRatio(totals.original, totals.gzip),
    brotliRatio: compressionRatio(totals.original, totals.brotli)
  }
  
  console.log(createTableRow('TOTAL', totalAnalysis))
  console.log('=' .repeat(108))
  
  // Additional insights
  if (totals.original > 0) {
    console.log(`\n💡 Insights:`)
    console.log(`   • Gzip saves ${formatBytes(totals.original - totals.gzip)} (${totalAnalysis.gzipRatio} reduction)`)
    console.log(`   • Brotli saves ${formatBytes(totals.original - totals.brotli)} (${totalAnalysis.brotliRatio} reduction)`)
    console.log(`   • Brotli is ${formatBytes(totals.gzip - totals.brotli)} smaller than Gzip`)
  }
}