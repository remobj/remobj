import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RemObj',
  description: 'A powerful JavaScript library for transparent remote object access and RPC communication',
  base: '/remobj/',
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/remobj/remobj' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Architecture', link: '/guide/architecture' }
          ]
        }
      ],
      '/api/': [
        {
                text: 'Overview',
                link: '/api/'
        }
]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/user/remobj' }
    ]
  }
})