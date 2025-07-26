import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  
  worker: {
    format: 'es'
  },

  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'index.html',
        'iframe-child': 'iframe-child.html',
        'service-worker': 'service-worker.html'
      }
    }
  },

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
})