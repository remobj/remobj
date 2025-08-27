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