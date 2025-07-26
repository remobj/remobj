import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'RemobjTesting',
      formats: ['es', 'cjs'],
      fileName: (format) => `remobj-testing.${format === 'es' ? 'es.js' : 'js'}`
    },
    rollupOptions: {
      external: ['@remobj/core'],
      output: {
        globals: {
          '@remobj/core': 'RemobjCore'
        }
      }
    },
    target: 'es2024',
    cssMinify: true,
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'examples/**',
        'dist/**',
        'lib/**',
        '*.config.*'
      ]
    }
  },
  define: {
    __DEV__: true,
    __PROD_DEVTOOLS__: false,
  },
})