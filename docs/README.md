# @remobj/docs

> Comprehensive documentation for the remobj ecosystem

[![VitePress](https://img.shields.io/badge/VitePress-Ready-green.svg)](https://vitepress.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

This package contains the complete documentation website for the remobj ecosystem, built with VitePress. It includes comprehensive guides, API references, examples, and tutorials for all remobj packages.

## ✨ Features

- **📚 Complete Guides**: Step-by-step tutorials for all remobj features
- **🔍 API Reference**: Auto-generated API documentation from TypeScript
- **💡 Interactive Examples**: Live code examples and demos
- **🎯 Getting Started**: Quick start guides for different use cases
- **🏗️ Architecture**: Deep dives into remobj design and patterns
- **🧪 Testing**: Testing strategies and best practices

## 🚀 Quick Start

### Development

```bash
# Install dependencies
rush update

# Start development server
cd docs
npm run dev
```

Visit the local development server at port 5173 to view the documentation site.

### Building

```bash
# Build static site
npm run build

# Preview built site
npm run preview
```

## 📖 Documentation Structure

### Getting Started (`/guide/`)
- **What is remobj?** - Introduction and core concepts
- **Getting Started** - Installation and basic setup
- **Core Concepts** - PostMessage, endpoints, and communication patterns
- **Package Overview** - Understanding the remobj ecosystem

### Core Functionality (`/guide/`)
- **Provide & Consume** - RPC-style communication
- **Workers** - Web Worker integration
- **iframes** - Cross-frame communication  
- **Streaming** - Real-time data flow
- **WebRTC** - Peer-to-peer communication
- **Node.js** - Server-side usage patterns

### Advanced Topics (`/guide/`)
- **TypeScript** - Type safety and inference
- **Error Handling** - Robust error management
- **Performance** - Optimization strategies
- **Testing** - Testing cross-context communication

### API Reference (`/api/`)
Auto-generated API documentation for all packages:
- **[@remobj/core](./api/core/)** - Core types and functions
- **[@remobj/stream](./api/stream/)** - Stream utilities
- **[@remobj/web](./api/web/)** - Web API adapters
- **[@remobj/node](./api/node/)** - Node.js adapters

### Examples (`/examples/`)
- **Basic Usage** - Simple RPC examples
- **Real-World Scenarios** - Complex application patterns
- **Performance Benchmarks** - Optimization examples
- **Testing Patterns** - Testing strategies

## 🏗️ Content Organization

### Guide Structure
```
guide/
├── index.md                 # Overview and navigation
├── what-is-remobj.md        # Introduction and motivation
├── getting-started.md      # Installation and first steps
├── core-concepts.md        # Fundamental concepts
├── packages.md             # Package ecosystem overview
├── provide-consume.md      # RPC patterns
├── workers.md              # Web Worker integration
├── iframes.md              # Cross-frame communication
├── streaming.md            # Stream-based patterns
├── webrtc.md              # WebRTC integration
├── nodejs.md              # Server-side usage
├── typescript.md          # Type safety features
├── error-handling.md      # Error management
├── performance.md         # Optimization strategies
└── testing.md             # Testing approaches
```

### API Documentation
Auto-generated from TypeScript using Microsoft API Extractor:
- Source: `*.d.ts` files from each package
- Generated: Markdown files in `/api/` directory
- Updated: Automatically during package builds

### Examples Collection
```
examples/
├── index.md               # Examples overview
├── basic/                 # Simple usage patterns
├── advanced/              # Complex scenarios
├── performance/           # Optimization examples
└── testing/              # Testing strategies
```

## 🎯 Content Guidelines

### Writing Style
- **Clear and Concise**: Use simple, direct language
- **Code-First**: Show working examples for every concept
- **Progressive Disclosure**: Start simple, add complexity gradually
- **Cross-References**: Link related concepts and APIs

### Code Examples
- **Complete and Runnable**: All examples should work as-is
- **Type-Safe**: Use TypeScript with proper type annotations
- **Error Handling**: Include proper error management
- **Best Practices**: Demonstrate recommended patterns

### API Documentation
- **Comprehensive**: Document all public APIs
- **Examples**: Include usage examples for each function
- **Type Information**: Show complete type signatures
- **Cross-Links**: Link to related functions and concepts

## 🔧 Development

### Local Development
```bash
# Start development server with hot reload
npm run dev

# Access at the local development server
```

### Content Creation
1. **Guides**: Add new `.md` files to `/guide/` directory
2. **Examples**: Create working examples in `/examples/`
3. **API Docs**: Auto-generated from TypeScript (no manual editing)

### Navigation
Edit `.vitepress/config.ts` to update:
- Sidebar navigation
- Search configuration
- Theme settings
- Plugin configuration

### Styling
- **Theme**: Uses VitePress default theme with customizations
- **Components**: Vue components for interactive elements
- **CSS**: Custom styles in `.vitepress/theme/`

## 🧪 Content Verification

### Link Checking
```bash
# Check all internal links
npm run check-links

# Check external links
npm run check-external
```

### Code Example Testing
```bash
# Test all code examples
npm run test-examples

# Test specific example
npm run test-example -- worker-basic
```

### Build Verification
```bash
# Build and verify no errors
npm run build

# Check for broken links in build
npm run verify-build
```

## 📦 Dependencies

### Core Dependencies
- **VitePress**: Documentation site generator
- **Vue**: Component framework for interactive elements
- **TypeScript**: Type checking and API generation

### remobj Packages
All remobj packages are included as dependencies for:
- API documentation generation
- Interactive examples
- Type checking in examples

### Build Tools
- **API Extractor**: Generates API docs from TypeScript
- **Gray Matter**: Frontmatter parsing
- **Fast Glob**: File system operations

## 🚀 Deployment

### Build Process
1. **Content Generation**: Process all markdown files
2. **API Extraction**: Generate API docs from packages
3. **Example Validation**: Test all code examples
4. **Static Generation**: Build VitePress site
5. **Asset Optimization**: Minify and optimize assets

### Deployment Targets
- **GitHub Pages**: Automatic deployment from main branch
- **Vercel**: Preview deployments for pull requests
- **CDN**: Static assets served from CDN

## 🤝 Contributing

### Adding Content
1. **Fork Repository**: Create your own fork
2. **Create Content**: Add guides, examples, or improvements
3. **Test Locally**: Verify content builds and displays correctly
4. **Submit PR**: Create pull request with detailed description

### Content Standards
- **Accuracy**: Ensure all examples work correctly
- **Clarity**: Write for developers of all skill levels
- **Completeness**: Include necessary context and prerequisites
- **Consistency**: Follow established patterns and style

## 📄 License

ISC - Documentation content is part of the remobj ecosystem

---

Made with ❤️ by the remobj team