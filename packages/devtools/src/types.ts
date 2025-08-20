import type { WebSocketServer } from "ws"

export interface DevToolsMessage {
  traceID: string
  side: 'consumer' | 'provider'
  objectID: string
  realmId: string
  type: string
  subName?: string
  operationType?: string
  propertyPath?: string[]
  data: any
  timeStamp: number
  date: string
  timestamp?: number
  source?: string
}

export interface DevToolsServer {
  coreServer: WebSocketServer
  clientServer: WebSocketServer
  shutdown(): void
}

export interface DevToolsOptions {
  corePort?: number
  clientPort?: number
  verbose?: boolean
}