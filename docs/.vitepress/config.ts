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
        },
        {
                text: '@remobj/core',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/core/src/'
                        },
                        {
                                text: 'version',
                                link: '/api/core/src/variables/version'
                        }
                ]
        },
        {
                text: '@remobj/shared',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/shared/src/'
                        },
                        {
                                text: 'hasOwnProperty',
                                link: '/api/shared/src/functions/hasOwnProperty'
                        },
                        {
                                text: 'isDate',
                                link: '/api/shared/src/functions/isDate'
                        },
                        {
                                text: 'isFunction',
                                link: '/api/shared/src/functions/isFunction'
                        },
                        {
                                text: 'isIntegerKey',
                                link: '/api/shared/src/functions/isIntegerKey'
                        },
                        {
                                text: 'isMap',
                                link: '/api/shared/src/functions/isMap'
                        },
                        {
                                text: 'isNumber',
                                link: '/api/shared/src/functions/isNumber'
                        },
                        {
                                text: 'isObject',
                                link: '/api/shared/src/functions/isObject'
                        },
                        {
                                text: 'isPlainObject',
                                link: '/api/shared/src/functions/isPlainObject'
                        },
                        {
                                text: 'isPromise',
                                link: '/api/shared/src/functions/isPromise'
                        },
                        {
                                text: 'isRegExp',
                                link: '/api/shared/src/functions/isRegExp'
                        },
                        {
                                text: 'isSet',
                                link: '/api/shared/src/functions/isSet'
                        },
                        {
                                text: 'isString',
                                link: '/api/shared/src/functions/isString'
                        },
                        {
                                text: 'isSymbol',
                                link: '/api/shared/src/functions/isSymbol'
                        },
                        {
                                text: 'looseEqual',
                                link: '/api/shared/src/functions/looseEqual'
                        },
                        {
                                text: 'looseIndexOf',
                                link: '/api/shared/src/functions/looseIndexOf'
                        },
                        {
                                text: 'NOOP',
                                link: '/api/shared/src/functions/NOOP'
                        },
                        {
                                text: 'removeFromArray',
                                link: '/api/shared/src/functions/removeFromArray'
                        },
                        {
                                text: 'toRawType',
                                link: '/api/shared/src/functions/toRawType'
                        }
                ]
        },
        {
                text: '@remobj/add',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/add/src/'
                        },
                        {
                                text: 'add',
                                link: '/api/add/src/functions/add'
                        }
                ]
        },
        {
                text: '@remobj/mul',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/mul/src/'
                        },
                        {
                                text: 'multiply',
                                link: '/api/mul/src/functions/multiply'
                        }
                ]
        }
]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/user/remobj' }
    ]
  }
})