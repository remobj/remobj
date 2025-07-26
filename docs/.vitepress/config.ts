import { defineConfig } from 'vitepress'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface ApiFile {
  name: string
  path: string
  title: string
}

interface ApiPackage {
  name: string
  path: string
  files: ApiFile[]
}

function getApiPackages(): ApiPackage[] {
  const apiDir = join(__dirname, '..', 'api')
  const packages: ApiPackage[] = []
  
  try {
    const packageDirs = readdirSync(apiDir).filter(dir => {
      const dirPath = join(apiDir, dir)
      return statSync(dirPath).isDirectory()
    })
    
    for (const packageDir of packageDirs) {
      const packagePath = join(apiDir, packageDir)
      const files: ApiFile[] = []
      
      try {
        const mdFiles = readdirSync(packagePath)
          .filter(file => file.endsWith('.md') && file !== 'index.md')
          .sort()
        
        for (const file of mdFiles) {
          const filePath = join(packagePath, file)
          const content = readFileSync(filePath, 'utf-8')
          
          // Skip files that are package overview files (contain "package" in title)
          const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m)
          if (titleMatch && titleMatch[1].toLowerCase().includes('package')) {
            continue
          }
          
          // Extract title from markdown content
          let title = file.replace('.md', '').replace(/^[^-]+-/, '')
          
          if (titleMatch) {
            title = titleMatch[1].replace(/\(\).*$/, '()').replace(/\s+(function|interface|class|type)$/, '')
          }
          
          files.push({
            name: file.replace('.md', ''),
            path: `/api/${packageDir}/${file.replace('.md', '')}`,
            title
          })
        }
        
        if (files.length > 0) {
          // Check if there's a package overview file (*.md with "package" in title)
          let overviewPath = `/api/${packageDir}/`
          
          // Look for a file that contains "package" in the title
          const packageOverviewFile = readdirSync(packagePath)
            .filter(file => file.endsWith('.md') && file !== 'index.md')
            .find(file => {
              const filePath = join(packagePath, file)
              const content = readFileSync(filePath, 'utf-8')
              const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m)
              return titleMatch && titleMatch[1].toLowerCase().includes('package')
            })
          
          if (packageOverviewFile) {
            overviewPath = `/api/${packageDir}/${packageOverviewFile.replace('.md', '')}`
          }
          
          packages.push({
            name: `@remobj/${packageDir}`,
            path: overviewPath,
            files
          })
        }
      } catch (err) {
        console.warn(`Could not read package directory ${packagePath}:`, err)
      }
    }
  } catch (err) {
    console.warn('Could not read API directory:', err)
  }
  
  return packages
}

function generateApiSidebar() {
  const packages = getApiPackages()
  
  return packages.map(pkg => ({
    text: pkg.name,
    collapsed: false,
    items: [
      { text: 'Overview', link: pkg.path },
      ...pkg.files.map(file => ({
        text: file.title,
        link: file.path
      }))
    ]
  }))
}

function getFirstApiLink(): string {
  const packages = getApiPackages()
  return packages.length > 0 ? packages[0].path : '/api/'
}

export default defineConfig({
  title: 'Remobj',
  description: 'Zero-dependency TypeScript library for seamless cross-context communication',
  
  base: '/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: getFirstApiLink() },
      { text: 'Examples', link: '/examples/' },
      { text: 'DevTools', link: '/devtools/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Remobj?', link: '/guide/what-is-remobj' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' }
          ]
        },
        {
          text: 'Basics',
          items: [
            { text: 'Provide & Consume', link: '/guide/provide-consume' },
            { text: 'Working with Workers', link: '/guide/workers' },
            { text: 'Cross-Frame Communication', link: '/guide/iframes' },
            { text: 'Error Handling', link: '/guide/error-handling' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Streaming Data', link: '/guide/streaming' },
            { text: 'WebRTC Integration', link: '/guide/webrtc' },
            { text: 'Node.js Support', link: '/guide/nodejs' },
            { text: 'Performance Optimization', link: '/guide/performance' }
          ]
        },
        {
          text: 'Ecosystem',
          items: [
            { text: 'Package Overview', link: '/guide/packages' },
            { text: 'TypeScript Integration', link: '/guide/typescript' },
            { text: 'Testing Strategies', link: '/guide/testing' }
          ]
        }
      ],
      
      '/api/': generateApiSidebar(),

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' }
          ]
        }
      ],

      '/devtools/': [
        {
          text: 'DevTools',
          items: [
            { text: 'Introduction', link: '/devtools/' },
            { text: 'Browser Extension', link: '/devtools/browser-extension' },
            { text: 'Desktop App', link: '/devtools/desktop-app' },
            { text: 'Integration Guide', link: '/devtools/integration' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/remobj/remobj' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Remobj Contributors'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/remobj/remobj/edit/main/packages/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})