import { createWorkspaceAliases } from './scripts/workspace-aliases.js'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['packages/*/__tests__/**/*.spec.ts'],
      exclude: ['**/e2e/**'],
      environment: 'node',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'coverage/**',
          'dist/**',
          '**/node_modules/**',
          '**/scripts/**',
          '**/*.d.ts',
          '**/vitest.config.ts',
          '**/vitest.workspace.ts',
          'packages/devtools/**',
          '**/types.ts'
        ],
        include: [
          'packages/*/src/**/*.ts'
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      }
    },
    resolve: {
      alias: createWorkspaceAliases()
    },
    define: {
      __DEV__: true,
      __TEST__: true,
      __VERSION__: '"test"',
      __BROWSER__: false,
      __PROD_DEVTOOLS__: false
    }
  }
])