import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RemObj',
  description: 'Modern monorepo library scaffolding inspired by Vue.js patterns',
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/user/remobj' }
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