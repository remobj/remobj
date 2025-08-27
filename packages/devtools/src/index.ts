import { WebSocket, WebSocketServer } from "ws"
import type { DevToolsMessage, DevToolsServer } from "./types"

export * from "./types"

export function createDevToolsServer(): DevToolsServer {
  // WebSocket server for core connections (port 3333)
  const coreServer = new WebSocketServer({ port: 3333 })
  
  // WebSocket server for web client connections (port 3334)
  const clientServer = new WebSocketServer({ port: 3334 })
  
  const coreConnections = new Set<WebSocket>()
  const clientConnections = new Set<WebSocket>()
  
  // Handle core connections
  coreServer.on("connection", (ws) => {
    console.log("Core connected to devtools")
    coreConnections.add(ws)
    
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as DevToolsMessage
        
        // Relay message to all connected clients
        for (const client of clientConnections) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              ...message,
              timestamp: Date.now(),
              source: "core"
            }))
          }
        }
      } catch (error) {
        console.error("Failed to parse core message:", error)
      }
    })
    
    ws.on("close", () => {
      coreConnections.delete(ws)
      console.log("Core disconnected from devtools")
    })
    
    ws.on("error", (error) => {
      console.error("Core connection error:", error)
    })
  })
  
  // Handle client connections
  clientServer.on("connection", (ws) => {
    console.log("Client connected to devtools")
    clientConnections.add(ws)
    
    // Send connection confirmation
    ws.send(JSON.stringify({
      type: "connection",
      data: { status: "connected" },
      timestamp: Date.now(),
      source: "devtools"
    }))
    
    ws.on("close", () => {
      clientConnections.delete(ws)
      console.log("Client disconnected from devtools")
    })
    
    ws.on("error", (error) => {
      console.error("Client connection error:", error)
    })
  })
  
  console.log("DevTools server started")
  console.log("- Core connection port: 3333")
  console.log("- Client connection port: 3334")
  
  return {
    coreServer,
    clientServer,
    shutdown() {
      coreServer.close()
      clientServer.close()
      
      // Close all active connections
      for (const ws of coreConnections) {
        ws.close()
      }
      for (const ws of clientConnections) {
        ws.close()
      }
      
      coreConnections.clear()
      clientConnections.clear()
    }
  }
}