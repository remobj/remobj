import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'RemobjNode',
        fileName: (format) => `remobj-node.${format}.js`,
        formats: ['es', 'cjs']
      },
      rollupOptions: {
        external: [
          '@remobj/core',
          'child_process',
          'worker_threads', 
          'stream',
          'net',
          'fs',
          'path',
          'util'
        ]
      },
      target: 'node16',
      minify: false
    },
    // Only define these for local dev/test, NOT for the npm build
    define: isProduction ? {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    } : {
      __DEV__: true,
      __PROD_DEVTOOLS__: false,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    test: {
      globals: true,
      environment: 'node'
    }
  }
})