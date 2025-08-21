# Git Hooks

This project uses Husky to manage Git hooks for code quality enforcement.

## Installed Hooks

### pre-commit
Runs before each commit to ensure code quality:
- **Linting**: Automatically fixes linting issues with oxlint
- **Type Checking**: Validates TypeScript types for changed files
- **Test Running**: Runs tests related to changed files

### commit-msg
Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
- Format: `type(scope): subject`
- Example: `feat(core): add new RPC endpoint`
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

### pre-push
Runs comprehensive checks before pushing:
- Full type checking across the codebase
- All tests must pass
- Build must complete successfully

## Bypass Hooks (Emergency Only!)

If you need to bypass hooks in an emergency:
```bash
# Skip pre-commit and commit-msg hooks
git commit --no-verify -m "emergency: fix critical issue"

# Skip pre-push hook
git push --no-verify
```

⚠️ **Warning**: Only bypass hooks in emergencies. Always fix issues properly afterward.

## Troubleshooting

### Hooks not running
```bash
# Reinstall Husky
npm run prepare
```

### Permission issues on Unix systems
```bash
chmod +x .husky/*
```

## Conventional Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test
- `revert`: Reverts a previous commit
- `wip`: Work in progress (use sparingly)

## Valid Scopes

- `core`: Core RPC functionality
- `shared`: Shared utilities
- `devtools`: DevTools integration
- `weakbimap`: WeakBiMap implementation
- `build`: Build system
- `ci`: CI/CD pipeline
- `deps`: Dependencies
- `docs`: Documentation
- `release`: Release process
- `test`: Testing infrastructure
- `bench`: Benchmarks