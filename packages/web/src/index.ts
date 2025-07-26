/**
 * @fileoverview Web API adapters for browser communication mechanisms
 * 
 * This module provides adapters to convert various Web APIs into
 * standardized PostMessageEndpoint or StreamEndpoint interfaces,
 * enabling seamless integration with the remobj ecosystem.
 * 
 * Supported Web APIs:
 * - WebRTC DataChannels (RTCDataChannel)
 * - WebSockets (WebSocket)
 * 
 * @example WebSocket Usage
 * ```typescript
 * import { webSocketToPostMessage } from '@remobj/web'
 * import { consume } from '@remobj/core'
 * 
 * const ws = new WebSocket('ws://localhost:8080')
 * const endpoint = webSocketToPostMessage(ws)
 * const api = consume(endpoint)
 * ```
 * 
 * @example WebRTC DataChannel Usage
 * ```typescript
 * import { dataChannelToStream } from '@remobj/web'
 * import { streamToPostMessage } from '@remobj/stream'
 * 
 * const dataChannel = peerConnection.createDataChannel('data')
 * const stream = dataChannelToStream(dataChannel)
 * const endpoint = streamToPostMessage(stream)
 * ```
 */

import type { PostMessageEndpoint } from '@remobj/core'
import { createProxyEndpoint } from '@remobj/core'

// Stream types are imported from @remobj/stream when needed
/**
 * Stream-based communication interface using Web Streams API.
 * @public
 */
export type StreamEndpoint<T = any> = {
  input: WritableStream<T>
  output: ReadableStream<T>
}

// ============================================================================
// WebRTC DataChannel Adapters
// ============================================================================

/**
 * Creates a StreamEndpoint from a WebRTC DataChannel with automatic readyState checking.
 * @public
 */
export function dataChannelToStream(dataChannel: RTCDataChannel): StreamEndpoint {
  const inputTransform = new TransformStream()
  const outputTransform = new TransformStream()
  
  const outputWriter = outputTransform.writable.getWriter()
  
  dataChannel.addEventListener('message', (event) => {
    outputWriter.write(event.data).catch(() => {})
  })
  
  const reader = inputTransform.readable.getReader()
  const processInput = async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      if (dataChannel.readyState === 'open') {
        dataChannel.send(value)
      }
    }
  }
  processInput().catch(() => {})
  
  return {
    input: inputTransform.writable,
    output: outputTransform.readable
  }
}

/**
 * Creates a PostMessageEndpoint from a WebRTC DataChannel with readyState checking.
 * @public
 */
export function dataChannelToPostMessage(dataChannel: RTCDataChannel): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  dataChannel.addEventListener('message', (event) => {
    const messageEvent = new MessageEvent('message', { data: event.data })
    listeners.forEach(listener => listener(messageEvent))
  })
  
  const endpoint: PostMessageEndpoint = {
    postMessage: (data) => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(data)
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}

// ============================================================================
// WebSocket Adapters
// ============================================================================

/**
 * Creates a PostMessageEndpoint from a WebSocket with JSON serialization and error handling.
 * @public
 */
export function webSocketToPostMessage(webSocket: WebSocket): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  webSocket.addEventListener('message', (event) => {
    try {
      const messageEvent = new MessageEvent('message', { data: JSON.parse(event.data) })
      listeners.forEach(listener => listener(messageEvent))
    } catch (error) {
      console.warn('Failed to parse WebSocket message as JSON:', error)
    }
  })
  
  const endpoint: PostMessageEndpoint = {
    postMessage: (data) => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(data))
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}