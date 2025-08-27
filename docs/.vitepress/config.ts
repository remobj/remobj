import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RemObj',
  description: 'A powerful JavaScript library for transparent remote object access and RPC communication',
  base: '/remobj/',
  
  ignoreDeadLinks: true, // Temporarily ignore dead links for pages being added
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'GitHub', link: 'https://github.com/remobj/remobj' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Transports', link: '/guide/transports' },
            { text: 'TypeScript', link: '/guide/typescript' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Advanced Patterns', link: '/guide/advanced' }
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Multiplexing', link: '/guide/multiplexing' },
            { text: 'DevTools', link: '/guide/devtools' },
            { text: 'Memory Management', link: '/guide/memory' },
            { text: 'Performance', link: '/guide/performance' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'Overview',
          link: '/api/'
        },
        {
          text: '@remobj/core',
          collapsed: false,
          items: [
            { text: 'Functions', link: '/api/core/src/' },
            { text: 'provide', link: '/api/core/src/functions/provide' },
            { text: 'consume', link: '/api/core/src/functions/consume' },
            { text: 'createMultiplexedEndpoint', link: '/api/core/src/functions/createMultiplexedEndpoint' },
            { text: 'createWebsocketEndpoint', link: '/api/core/src/functions/createWebsocketEndpoint' },
            { text: 'createJsonEndpoint', link: '/api/core/src/functions/createJsonEndpoint' },
            { text: 'connectEndpoints', link: '/api/core/src/functions/connectEndpoints' },
            { text: 'Types', link: '/api/core/src/interfaces/ConsumeConfig' }
          ]
        },
        {
          text: '@remobj/web',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/web/src/' },
            { text: 'createRTCEndpoint', link: '/api/web/src/functions/createRTCEndpoint' },
            { text: 'getServiceWorkerEndpoint', link: '/api/web/src/functions/getServiceWorkerEndpoint' },
            { text: 'windowEndpoint', link: '/api/web/src/variables/windowEndpoint' }
          ]
        },
        {
          text: '@remobj/node',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/node/src/' },
            { text: 'createNodeEndpoint', link: '/api/node/src/functions/createNodeEndpoint' }
          ]
        },
        {
          text: '@remobj/shared',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/shared/src/' },
            { text: 'Type Guards', link: '/api/shared/src/functions/isObject' },
            { text: 'Utilities', link: '/api/shared/src/functions/NOOP' },
            { text: 'Types', link: '/api/shared/src/type-aliases/LooseRequired' }
          ]
        },
        {
          text: '@remobj/weakbimap',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/weakbimap/src/' },
            { text: 'WeakBiMap', link: '/api/weakbimap/src/classes/WeakBiMap' }
          ]
        },
        {
          text: '@remobj/devtools',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/devtools/src/' },
            { text: 'createDevToolsServer', link: '/api/devtools/src/functions/createDevToolsServer' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Web Worker', link: '/examples/web-worker' },
            { text: 'Service Worker', link: '/examples/service-worker' },
            { text: 'WebSocket', link: '/examples/websocket' },
            { text: 'Node.js', link: '/examples/nodejs' },
            { text: 'React Integration', link: '/examples/react' },
            { text: 'Vue Integration', link: '/examples/vue' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/remobj/remobj' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 RemObj Contributors'
    }
  }
})