export { registerPlugin } from './rpc-wrapper.js'

// Constants
export { version, realmId } from './constants.js'

// Types
export type { 
  Listener,
  PostMessageEndpointBase, 
  PostMessageEndpointString, 
  PostMessageEndpoint 
} from './types.js'


// Endpoint functionality
export { wrapPostMessageEndpoint, createJsonEndpoint, connectEndpoints, createWebsocketEndpoint, createSendingEndpoint } from './wrap-endpoint.js'

// Multiplexing functionality
export { createMultiplexedEndpoint, type Channel } from './multiplex.js'

// RPC functionality
export { provide } from './rpc-provider.js'
export { consume } from './rpc-consumer.js'
export type { 
  Remote, 
  RemoteCallRequest, 
  RemoteCallResponse,
  ProvideConfig,
  ConsumeConfig,
  ForbiddenProperty 
} from './rpc-types.js'

export { devtools, getTraceID, setDevtoolsEP, wrapEndpointDevtools } from './devtools.js'
