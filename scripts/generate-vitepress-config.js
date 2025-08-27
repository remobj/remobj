import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
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
  const packages = ['core', 'web', 'node', 'shared', 'weakbimap', 'devtools']
  
  const sidebar = []
  
  // Add overview
  sidebar.push({ text: 'Overview', link: '/api/' })
  
  // Process each package
  for (const pkg of packages) {
    const pkgDir = join(apiDir, pkg)
    if (!existsSync(pkgDir)) {continue}
    
    const items = []
    
    // Add package README as overview
    const readmePath = join(pkgDir, 'src', 'README.md')
    if (existsSync(readmePath)) {
      items.push({ text: 'Overview', link: `/api/${pkg}/src/README` })
    }
    
    // Find all markdown files in package source directory
    const srcDir = join(pkgDir, 'src')
    
    // Group by type (functions, classes, interfaces, type-aliases, variables)
    const grouped = {
      functions: [],
      classes: [],
      interfaces: [],
      'type-aliases': [],
      variables: []
    }
    
    // Check each category directory
    const categories = ['functions', 'classes', 'interfaces', 'type-aliases', 'variables']
    for (const category of categories) {
      const categoryDir = join(srcDir, category)
      if (existsSync(categoryDir)) {
        const files = readdirSync(categoryDir).filter(f => f.endsWith('.md'))
        for (const file of files) {
          const name = file.replace('.md', '')
          grouped[category].push({
            text: name,
            link: `/api/${pkg}/src/${category}/${name}`
          })
        }
      }
    }
    
    // Add grouped items with proper section headers
    if (grouped.functions.length > 0) {
      items.push({
        text: 'Functions',
        collapsed: true,
        items: grouped.functions.sort((a, b) => a.text.localeCompare(b.text))
      })
    }
    
    if (grouped.classes.length > 0) {
      items.push({
        text: 'Classes',
        collapsed: true,
        items: grouped.classes.sort((a, b) => a.text.localeCompare(b.text))
      })
    }
    
    if (grouped.interfaces.length > 0) {
      items.push({
        text: 'Interfaces',
        collapsed: true,
        items: grouped.interfaces.sort((a, b) => a.text.localeCompare(b.text))
      })
    }
    
    if (grouped['type-aliases'].length > 0) {
      items.push({
        text: 'Type Aliases',
        collapsed: true,
        items: grouped['type-aliases'].sort((a, b) => a.text.localeCompare(b.text))
      })
    }
    
    if (grouped.variables.length > 0) {
      items.push({
        text: 'Variables',
        collapsed: true,
        items: grouped.variables.sort((a, b) => a.text.localeCompare(b.text))
      })
    }
    
    if (items.length > 0) {
      // Determine if package should be collapsed by default
      const isCollapsed = ['shared', 'weakbimap', 'devtools'].includes(pkg)
      
      sidebar.push({
        text: `@remobj/${pkg}`,
        collapsed: isCollapsed,
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

/**
 * Rename README.md to index.md for VitePress compatibility
 */
function renameReadmeToIndex() {
  const apiDir = join(__dirname, '..', 'docs', 'api')
  const readmePath = join(apiDir, 'README.md')
  const indexPath = join(apiDir, 'index.md')
  
  if (existsSync(readmePath)) {
    renameSync(readmePath, indexPath)
    console.log('✅ Renamed api/README.md to api/index.md')
  }
}

/**
 * Recursively process all markdown files in a directory
 * @param {string} dir - Directory to process
 * @param {Function} processor - Function to process each file's content
 */
function processMarkdownFiles(dir, processor) {
  const items = readdirSync(dir)
  
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      processMarkdownFiles(fullPath, processor)
    } else if (item.endsWith('.md')) {
      const content = readFileSync(fullPath, 'utf8')
      const newContent = processor(content)
      if (content !== newContent) {
        writeFileSync(fullPath, newContent, 'utf8')
      }
    }
  }
}

/**
 * Remove dead breadcrumb links from generated TypeDoc files
 */
function fixDeadLinks() {
  const apiDir = join(__dirname, '..', 'docs', 'api')
  let filesFixed = 0
  
  // Process all markdown files to remove dead breadcrumb links
  processMarkdownFiles(apiDir, (content) => {
    // Remove the breadcrumb navigation header that contains dead links
    // Pattern: [**remobj**](../../../README.md) followed by *** and newlines
    let newContent = content.replace(/\[\*\*remobj\*\*\]\(\.\.\/.*?README\.md\)\r?\n\r?\n\*\*\*\r?\n\r?\n/g, '')
    
    // Remove breadcrumb trail links like: [remobj](../../../README.md) / 
    newContent = newContent.replace(/\[remobj\]\(\.\.\/.*?README\.md\) \/ /g, '')
    
    if (newContent !== content) {
      filesFixed++
    }
    
    return newContent
  })
  
  console.log(`✅ Fixed dead breadcrumb links in ${filesFixed} API documentation files`)
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  renameReadmeToIndex()
  fixDeadLinks()
  updateVitePressConfig()
}

export { fixDeadLinks, generateApiSidebar, renameReadmeToIndex, updateVitePressConfig }