import type { DevToolsMessage } from "./types"

let ws: WebSocket | null = null
let messageQueue: DevToolsMessage[] = []
let isConnected = false

export interface DevToolsIntegration {
  connect(): void
  disconnect(): void
  send(message: DevToolsMessage): void
  isConnected(): boolean
}

export function createDevToolsIntegration(): DevToolsIntegration {
  const connect = () => {
    if (typeof WebSocket === "undefined") {
      console.warn("WebSocket not available in this environment")
      return
    }
    
    try {
      ws = new WebSocket("ws://localhost:3333")
      
      ws.onopen = () => {
        isConnected = true
        console.log("Connected to RemObj DevTools")
        
        // Send queued messages
        while (messageQueue.length > 0) {
          const message = messageQueue.shift()
          if (message) {
            ws!.send(JSON.stringify(message))
          }
        }
      }
      
      ws.onclose = () => {
        isConnected = false
        ws = null
        console.log("Disconnected from RemObj DevTools")
        
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000)
      }
      
      ws.onerror = (error) => {
        console.error("DevTools connection error:", error)
      }
    } catch (error) {
      console.error("Failed to connect to DevTools:", error)
    }
  }
  
  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
      isConnected = false
    }
  }
  
  const send = (message: DevToolsMessage) => {
    if (!message.timestamp) {
      message.timestamp = Date.now()
    }
    
    if (isConnected && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    } else {
      // Queue message for later
      messageQueue.push(message)
      
      // Limit queue size
      if (messageQueue.length > 1000) {
        messageQueue.shift()
      }
    }
  }
  
  return {
    connect,
    disconnect,
    send,
    isConnected: () => isConnected
  }
}

// Global devtools instance
let devtools: DevToolsIntegration | null = null

export function getDevTools(): DevToolsIntegration {
  if (!devtools) {
    devtools = createDevToolsIntegration()
    
    // Auto-connect in development
    if (__DEV__) {
      devtools.connect()
    }
  }
  
  return devtools
}