import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Recursively find all markdown files in a directory
 * @param {string} dir - Directory to search
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array} Array of file info objects
 */
function findMarkdownFiles(dir, baseDir = dir) {
  const files = []
  
  const items = readdirSync(dir)
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath, baseDir))
    } else if (item.endsWith('.md') && item !== 'README.md') {
      const relativePath = fullPath.replace(baseDir, '').replaceAll("\\\\", '/')
      files.push({
        name: item.replace('.md', ''),
        path: relativePath,
        type: dirname(relativePath).split('/').pop()
      })
    }
  }
  
  return files
}

/**
 * Generate sidebar configuration for API docs
 */
function generateApiSidebar() {
  const apiDir = join(__dirname, '..', 'docs', 'api')
  const packages = ['core', 'shared', 'add', 'mul']
  
  const sidebar = []
  
  // Add overview
  sidebar.push({ text: 'Overview', link: '/api/' })
  
  // Process each package
  for (const pkg of packages) {
    const pkgDir = join(apiDir, pkg)
    if (!existsSync(pkgDir)) {continue}
    
    const items = [{ text: 'Overview', link: `/api/${pkg}/src/` }]
    
    // Find all markdown files in package
    const files = findMarkdownFiles(pkgDir, apiDir)
    
    // Group by type (functions, variables, etc.)
    const grouped = {}
    for (const file of files) {
      if (!file.path.includes('/src/')) {continue}
      if (file.name === 'index') {continue}
      
      if (!grouped[file.type]) {
        grouped[file.type] = []
      }
      
      grouped[file.type].push({
        text: file.name,
        link: `/api${file.path.replace('.md', '')}`
      })
    }
    
    // Add grouped items
    for (const [type, typeItems] of Object.entries(grouped)) {
      items.push(...typeItems.sort((a, b) => a.text.localeCompare(b.text)))
    }
    
    if (items.length > 1) {
      sidebar.push({
        text: `@remobj/${pkg}`,
        collapsed: false,
        items
      })
    }
  }
  
  return sidebar
}

/**
 * Update VitePress config with generated sidebar
 */
function updateVitePressConfig() {
  const configPath = join(__dirname, '..', 'docs', '.vitepress', 'config.ts')
  
  // Read existing config
  let config = readFileSync(configPath, 'utf8')
  
  // Generate new sidebar
  const apiSidebar = generateApiSidebar()
  
  // Convert to TypeScript code
  const sidebarCode = JSON.stringify(apiSidebar, undefined, 8)
    .replaceAll(/"([^"]+)":/g, '$1:') // Remove quotes from keys
    .replaceAll("\"", "'") // Use single quotes
  
  // Replace the /api/ sidebar section
  // First, find the start of the '/api/' section
  const apiStartRegex = /['"]\/api\/['"]:\s*\[/
  const apiStartMatch = config.match(apiStartRegex)
  
  if (!apiStartMatch) {
    console.error('Could not find /api/ sidebar section in config')
    return
  }
  
  // Find the matching closing bracket
  const startIndex = apiStartMatch.index + apiStartMatch[0].length
  let bracketCount = 1
  let endIndex = startIndex
  
  for (let i = startIndex; i < config.length && bracketCount > 0; i++) {
    if (config[i] === '[') {bracketCount++}
    else if (config[i] === ']') {
      bracketCount--
      if (bracketCount === 0) {endIndex = i}
    }
  }
  
  // Replace the entire /api/ section
  config = config.slice(0, apiStartMatch.index) + 
           `'/api/': ${sidebarCode}` +
           config.slice(endIndex + 1)
  
  // Write updated config
  writeFileSync(configPath, config)
  console.log('✅ Updated VitePress config with generated API sidebar')
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateVitePressConfig()
}

export { generateApiSidebar, updateVitePressConfig }