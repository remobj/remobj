import { ref, RefSymbol } from '@vue/reactivity'
import type { PostMessageEndpoint } from '@remobj/core'

/**
 * Endpoint connection discovered through EP_DETECTION_REQUEST
 */
interface Connection {
  from: string
  to: string
  timestamp: number
}

/**
 * Tracked EP_EVENT_send/receive message
 */
interface Message {
  id: string
  type: 'EP_EVENT_send' | 'EP_EVENT_receive'
  timestamp: number
  message: any
}

/**
 * Raw data entry from endpoint
 */
interface DataEntry {
  timestamp: number
  [key: string]: any
}

/**
 * EP_DETECTION_REQUEST message structure
 */
interface DetectionRequest {
  type: 'EP_DETECTION_REQUEST'
  id: string
}

/**
 * Detection response with endpoint metadata
 */
interface DetectionResponse {
  senderID: string
  requestID: string
  receiverID: string
  receiverMeta?: {
    id: string
    type?: string
    name?: string
    created: number
  }
  senderMeta?: {
    id: string
    type?: string
    name?: string
    created: number
  }
}

/**
 * Proxy message from devtools
 */
interface ProxyMessage {
  type: 'EP_EVENT_send' | 'EP_EVENT_receive'
  id: string
  timestamp: number
  message: any
}

export function createMonitor(endpoint: PostMessageEndpoint) {
  const connections = ref<Connection[]>([])
  const messages = ref<Message[]>([])
  const data = ref<DataEntry[]>([])

  function handleMessage(event: MessageEvent<DetectionRequest | DetectionResponse | ProxyMessage | any>) {
    const eventData = event.data
    
    // Store all data
    data.value.push({
      timestamp: Date.now(),
      ...eventData
    })
    
    // Discovery response (DetectionResponse)
    if (eventData.senderID && eventData.receiverID) {
      connections.value.push({
        from: eventData.senderID,
        to: eventData.receiverID,
        timestamp: Date.now()
      })
    }
    
    // Message event (ProxyMessage)
    if (eventData.type === 'EP_EVENT_send' || eventData.type === 'EP_EVENT_receive') {
      messages.value.push({
        id: eventData.id,
        type: eventData.type,
        timestamp: eventData.timestamp,
        message: eventData.message
      })
      
    }
  }

  function discover() {
    endpoint.postMessage({
      type: 'EP_DETECTION_REQUEST',
      id: crypto.randomUUID()
    })
  }

  function clear() {
    connections.value = []
    messages.value = []
    data.value = []
  }

  // Start listening
  endpoint.addEventListener('message', handleMessage)

  return {
    connections,
    messages,
    data,
    discover,
    clear
  }
}
