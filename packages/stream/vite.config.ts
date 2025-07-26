import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    // IMPORTANT: These define replacements are only for LOCAL development and testing!
    // In the production build for npm, we do NOT replace these variables
    // This allows users of the library to control __DEV__ at runtime in their own bundler
    define: isProduction ? {} : {
      // Only define these for local dev/test, NOT for the npm build
      __DEV__: true,
      __PROD_DEVTOOLS__: false
    },
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'RemobjStream',
        fileName: (format) => `remobj-stream.${format === 'es' ? 'es.js' : 'js'}`
      },
      rollupOptions: {
        external: ['@remobj/core'],
        output: {
          globals: {
            '@remobj/core': 'RemobjCore'
          }
        }
      }
    },
    test: {
      globals: true,
      environment: 'node'
    }
  }
})