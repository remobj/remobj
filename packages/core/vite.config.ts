import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isTest = process.env.NODE_ENV === 'test' || mode === 'test'
  
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
        entry: './src/index.ts',
        name: 'remobj',
        fileName: (format) => {
          return format === 'es' ? 'remobj.es.js' : 'remobj.js'
        }
      },
      rollupOptions: {
        external: [],
        output: [
          {
            format: 'es'
          },
          {
            format: 'umd',
            name: 'remobj'
          }
        ]
      },
      minify: true
    },
    test: {
      globals: true,
      environment: 'node'
    }
  }
})