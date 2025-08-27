import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RemObj',
  description: 'A powerful JavaScript library for transparent remote object access and RPC communication',
  base: '/remobj/',
  
  ignoreDeadLinks: false, // Dead link checking re-enabled after fixing links
  
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
            { text: 'Transports', link: '/guide/transports' }
          ]
        },
        {
          text: 'Coming Soon',
          items: [
            { text: 'TypeScript Guide' },
            { text: 'Error Handling' },
            { text: 'Advanced Patterns' },
            { text: 'Multiplexing' },
            { text: 'DevTools' },
            { text: 'Memory Management' },
            { text: 'Performance' }
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
            { text: 'Overview', link: '/api/core/src/README' },
            { text: 'provide()', link: '/api/core/src/functions/provide' },
            { text: 'consume()', link: '/api/core/src/functions/consume' },
            { text: 'createMultiplexedEndpoint()', link: '/api/core/src/functions/createMultiplexedEndpoint' },
            { text: 'createWebsocketEndpoint()', link: '/api/core/src/functions/createWebsocketEndpoint' },
            { text: 'createJsonEndpoint()', link: '/api/core/src/functions/createJsonEndpoint' },
            { text: 'connectEndpoints()', link: '/api/core/src/functions/connectEndpoints' }
          ]
        },
        {
          text: '@remobj/web',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/web/src/README' },
            { text: 'createRTCEndpoint()', link: '/api/web/src/functions/createRTCEndpoint' },
            { text: 'getServiceWorkerEndpoint()', link: '/api/web/src/functions/getServiceWorkerEndpoint' },
            { text: 'windowEndpoint', link: '/api/web/src/variables/windowEndpoint' }
          ]
        },
        {
          text: '@remobj/node',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/node/src/README' },
            { text: 'createNodeEndpoint()', link: '/api/node/src/functions/createNodeEndpoint' }
          ]
        },
        {
          text: '@remobj/shared',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/shared/src/README' },
            { text: 'isObject()', link: '/api/shared/src/functions/isObject' },
            { text: 'isFunction()', link: '/api/shared/src/functions/isFunction' },
            { text: 'NOOP', link: '/api/shared/src/functions/NOOP' },
            { text: 'LooseRequired', link: '/api/shared/src/type-aliases/LooseRequired' }
          ]
        },
        {
          text: '@remobj/weakbimap',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/weakbimap/src/README' },
            { text: 'WeakBiMap', link: '/api/weakbimap/src/classes/WeakBiMap' }
          ]
        },
        {
          text: '@remobj/devtools',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api/devtools/src/README' },
            { text: 'createDevToolsServer()', link: '/api/devtools/src/functions/createDevToolsServer' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Web Worker', link: '/examples/web-worker' }
          ]
        },
        {
          text: 'Coming Soon',
          items: [
            { text: 'Service Worker Example' },
            { text: 'WebSocket Example' },
            { text: 'Node.js Examples' },
            { text: 'React Integration' },
            { text: 'Vue Integration' }
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