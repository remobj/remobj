# Contributing to RemObj

We love your input! We want to make contributing to RemObj as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Getting Started

### Prerequisites

- Node.js >= 18
- PNPM >= 8

### Setup

```bash
# Clone your fork
git clone https://github.com/remobj/remobj.git
cd remobj

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Development Workflow

```bash
# Build in development mode
npm run dev

# Build specific package
npm run build shared

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage

# Documentation
npm run docs:dev  # Start dev server
npm run docs:generate  # Generate API docs
```

## Project Structure

```
remobj/
├── packages/           # Package sources
│   ├── core/          # Main RPC implementation
│   ├── shared/        # Shared utilities
│   ├── devtools/      # DevTools integration
│   └── weakbimap/     # WeakBiMap implementation
├── scripts/           # Build and release scripts
├── docs/              # Documentation (VitePress + TypeDoc)
└── tests/             # Global test utilities
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Add JSDoc comments for all public APIs
- Use meaningful variable and function names

### Formatting

We use Oxlint for linting. Run `npm run lint` to check your code.

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semicolons, etc)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `build:` Changes to build system or dependencies
- `ci:` CI configuration changes
- `chore:` Other changes that don't modify src or test files

Examples:
```
feat: add support for custom serializers
fix: resolve memory leak in WeakBiMap cleanup
docs: update API documentation for consume()
```

## Testing

- Write tests for all new features
- Maintain or improve code coverage (minimum 80%)
- Tests are located in `packages/*/\__tests__/`
- Use Vitest for testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test packages/core

# Run with coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for all public APIs
- Update CLAUDE.md if development workflow changes
- Generate API docs after changes: `npm run docs:generate`

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the documentation with `npm run docs:generate`
3. Ensure all tests pass with `npm test`
4. Ensure code passes linting with `npm run lint`
5. Ensure TypeScript types are correct with `npm run typecheck`
6. Update the CHANGELOG.md with your changes
7. The PR will be merged once you have the sign-off of at least one maintainer

## Any contributions you make will be under the MIT Software License

When you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report bugs using GitHub's [issue tracker](https://github.com/remobj/remobj/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/remobj/remobj/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue with your question or reach out to the maintainers directly.