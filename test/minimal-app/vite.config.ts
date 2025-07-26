import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  build: {
    target: 'es2024',
    cssMinify: true,
  },
  plugins: [
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  define: {
    __DEV__: false,
    __PROD_DEVTOOLS__: false,
  },
}))