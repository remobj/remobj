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
                        {
                                text: 'Overview',
                                link: '/api/core/src/README'
                        },
                        {
                                text: 'Functions',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'connectEndpoints',
                                                link: '/api/core/src/functions/connectEndpoints'
                                        },
                                        {
                                                text: 'consume',
                                                link: '/api/core/src/functions/consume'
                                        },
                                        {
                                                text: 'createJsonEndpoint',
                                                link: '/api/core/src/functions/createJsonEndpoint'
                                        },
                                        {
                                                text: 'createMultiplexedEndpoint',
                                                link: '/api/core/src/functions/createMultiplexedEndpoint'
                                        },
                                        {
                                                text: 'createSendingEndpoint',
                                                link: '/api/core/src/functions/createSendingEndpoint'
                                        },
                                        {
                                                text: 'createWebsocketEndpoint',
                                                link: '/api/core/src/functions/createWebsocketEndpoint'
                                        },
                                        {
                                                text: 'devtools',
                                                link: '/api/core/src/functions/devtools'
                                        },
                                        {
                                                text: 'getTraceID',
                                                link: '/api/core/src/functions/getTraceID'
                                        },
                                        {
                                                text: 'provide',
                                                link: '/api/core/src/functions/provide'
                                        },
                                        {
                                                text: 'registerPlugin',
                                                link: '/api/core/src/functions/registerPlugin'
                                        },
                                        {
                                                text: 'setDevtoolsEP',
                                                link: '/api/core/src/functions/setDevtoolsEP'
                                        },
                                        {
                                                text: 'wrapEndpointDevtools',
                                                link: '/api/core/src/functions/wrapEndpointDevtools'
                                        },
                                        {
                                                text: 'wrapPostMessageEndpoint',
                                                link: '/api/core/src/functions/wrapPostMessageEndpoint'
                                        }
                                ]
                        },
                        {
                                text: 'Interfaces',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'Channel',
                                                link: '/api/core/src/interfaces/Channel'
                                        },
                                        {
                                                text: 'ConsumeConfig',
                                                link: '/api/core/src/interfaces/ConsumeConfig'
                                        },
                                        {
                                                text: 'PostMessageEndpointBase',
                                                link: '/api/core/src/interfaces/PostMessageEndpointBase'
                                        },
                                        {
                                                text: 'ProvideConfig',
                                                link: '/api/core/src/interfaces/ProvideConfig'
                                        },
                                        {
                                                text: 'RemoteCallRequest',
                                                link: '/api/core/src/interfaces/RemoteCallRequest'
                                        },
                                        {
                                                text: 'RemoteCallResponse',
                                                link: '/api/core/src/interfaces/RemoteCallResponse'
                                        }
                                ]
                        },
                        {
                                text: 'Type Aliases',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'ForbiddenProperty',
                                                link: '/api/core/src/type-aliases/ForbiddenProperty'
                                        },
                                        {
                                                text: 'Listener',
                                                link: '/api/core/src/type-aliases/Listener'
                                        },
                                        {
                                                text: 'PostMessageEndpoint',
                                                link: '/api/core/src/type-aliases/PostMessageEndpoint'
                                        },
                                        {
                                                text: 'PostMessageEndpointString',
                                                link: '/api/core/src/type-aliases/PostMessageEndpointString'
                                        },
                                        {
                                                text: 'Remote',
                                                link: '/api/core/src/type-aliases/Remote'
                                        }
                                ]
                        },
                        {
                                text: 'Variables',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'realmId',
                                                link: '/api/core/src/variables/realmId'
                                        },
                                        {
                                                text: 'version',
                                                link: '/api/core/src/variables/version'
                                        }
                                ]
                        }
                ]
        },
        {
                text: '@remobj/web',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/web/src/README'
                        },
                        {
                                text: 'Functions',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'createRTCEndpoint',
                                                link: '/api/web/src/functions/createRTCEndpoint'
                                        },
                                        {
                                                text: 'getServiceWorkerEndpoint',
                                                link: '/api/web/src/functions/getServiceWorkerEndpoint'
                                        }
                                ]
                        },
                        {
                                text: 'Variables',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'getServiceWorkerInternalEndpoint',
                                                link: '/api/web/src/variables/getServiceWorkerInternalEndpoint'
                                        },
                                        {
                                                text: 'windowEndpoint',
                                                link: '/api/web/src/variables/windowEndpoint'
                                        }
                                ]
                        }
                ]
        },
        {
                text: '@remobj/node',
                collapsed: false,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/node/src/README'
                        },
                        {
                                text: 'Functions',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'createNodeEndpoint',
                                                link: '/api/node/src/functions/createNodeEndpoint'
                                        }
                                ]
                        },
                        {
                                text: 'Interfaces',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'NodeEndpoint',
                                                link: '/api/node/src/interfaces/NodeEndpoint'
                                        }
                                ]
                        }
                ]
        },
        {
                text: '@remobj/shared',
                collapsed: true,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/shared/src/README'
                        },
                        {
                                text: 'Functions',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'hasOnlyPlainObjects',
                                                link: '/api/shared/src/functions/hasOnlyPlainObjects'
                                        },
                                        {
                                                text: 'hasOwnProperty',
                                                link: '/api/shared/src/functions/hasOwnProperty'
                                        },
                                        {
                                                text: 'isClonable',
                                                link: '/api/shared/src/functions/isClonable'
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
                                        },
                                        {
                                                text: 'unregisterGarbageCollection',
                                                link: '/api/shared/src/functions/unregisterGarbageCollection'
                                        }
                                ]
                        },
                        {
                                text: 'Type Aliases',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'IfAny',
                                                link: '/api/shared/src/type-aliases/IfAny'
                                        },
                                        {
                                                text: 'IsKeyValues',
                                                link: '/api/shared/src/type-aliases/IsKeyValues'
                                        },
                                        {
                                                text: 'LooseRequired',
                                                link: '/api/shared/src/type-aliases/LooseRequired'
                                        },
                                        {
                                                text: 'OverloadParameters',
                                                link: '/api/shared/src/type-aliases/OverloadParameters'
                                        },
                                        {
                                                text: 'Prettify',
                                                link: '/api/shared/src/type-aliases/Prettify'
                                        },
                                        {
                                                text: 'UnionToIntersection',
                                                link: '/api/shared/src/type-aliases/UnionToIntersection'
                                        }
                                ]
                        },
                        {
                                text: 'Variables',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'camelize',
                                                link: '/api/shared/src/variables/camelize'
                                        },
                                        {
                                                text: 'capitalize',
                                                link: '/api/shared/src/variables/capitalize'
                                        },
                                        {
                                                text: 'EMPTY_ARR',
                                                link: '/api/shared/src/variables/EMPTY_ARR'
                                        },
                                        {
                                                text: 'EMPTY_OBJ',
                                                link: '/api/shared/src/variables/EMPTY_OBJ'
                                        },
                                        {
                                                text: 'hyphenate',
                                                link: '/api/shared/src/variables/hyphenate'
                                        },
                                        {
                                                text: 'isArray',
                                                link: '/api/shared/src/variables/isArray'
                                        },
                                        {
                                                text: 'onGarbageCollected',
                                                link: '/api/shared/src/variables/onGarbageCollected'
                                        }
                                ]
                        }
                ]
        },
        {
                text: '@remobj/weakbimap',
                collapsed: true,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/weakbimap/src/README'
                        },
                        {
                                text: 'Classes',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'WeakBiMap',
                                                link: '/api/weakbimap/src/classes/WeakBiMap'
                                        }
                                ]
                        }
                ]
        },
        {
                text: '@remobj/devtools',
                collapsed: true,
                items: [
                        {
                                text: 'Overview',
                                link: '/api/devtools/src/README'
                        },
                        {
                                text: 'Functions',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'createDevToolsServer',
                                                link: '/api/devtools/src/functions/createDevToolsServer'
                                        }
                                ]
                        },
                        {
                                text: 'Interfaces',
                                collapsed: true,
                                items: [
                                        {
                                                text: 'DevToolsMessage',
                                                link: '/api/devtools/src/interfaces/DevToolsMessage'
                                        },
                                        {
                                                text: 'DevToolsOptions',
                                                link: '/api/devtools/src/interfaces/DevToolsOptions'
                                        },
                                        {
                                                text: 'DevToolsServer',
                                                link: '/api/devtools/src/interfaces/DevToolsServer'
                                        }
                                ]
                        }
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