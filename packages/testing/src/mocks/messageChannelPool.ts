import type { MockEndpoint, EndpointPair } from '../types'
import { MessageChannelEndpoints } from './messageChannel'

/**
 * Advanced MessageChannel connection pool for testing complex scenarios
 * Manages multiple channels, enables network topology simulation, and provides
 * comprehensive monitoring of cross-channel communication patterns.
 */
export class MessageChannelPool {
  private channels = new Map<string, MessageChannelEndpoints>()
  private connections = new Map<string, Set<string>>() // channelId -> connected channelIds
  private messageHistory: Array<{
    timestamp: number
    fromChannel: string
    toChannel: string
    data: any
    transferables?: Transferable[]
  }> = []
  private latencyMap = new Map<string, number>() // channelId -> latency in ms

  /**
   * Create a new MessageChannel with a unique identifier
   */
  createChannel(channelId: string): MessageChannelEndpoints {
    if (this.channels.has(channelId)) {
      throw new Error(`Channel ${channelId} already exists`)
    }

    const endpoints = new MessageChannelEndpoints()
    this.channels.set(channelId, endpoints)
    this.connections.set(channelId, new Set())

    // Enhanced endpoints with pool awareness
    const originalPostMessageA = endpoints.endpointA.postMessage.bind(endpoints.endpointA)
    const originalPostMessageB = endpoints.endpointB.postMessage.bind(endpoints.endpointB)

    endpoints.endpointA.postMessage = (data: any) => {
      // Extract transferables from data if present (testing pattern)
      let transferables: Transferable[] | undefined
      let actualData = data
      if (data && typeof data === 'object' && data.__remobj_transferables) {
        transferables = data.__remobj_transferables
        actualData = { ...data }
        delete actualData.__remobj_transferables
      }
      
      this.recordMessage(channelId, 'broadcast', actualData, transferables)
      
      // Apply latency if configured
      const latency = this.latencyMap.get(channelId) || 0
      if (latency > 0) {
        setTimeout(() => originalPostMessageA(actualData), latency)
      } else {
        originalPostMessageA(actualData)
      }
    }

    endpoints.endpointB.postMessage = (data: any) => {
      // Extract transferables from data if present (testing pattern)
      let transferables: Transferable[] | undefined
      let actualData = data
      if (data && typeof data === 'object' && data.__remobj_transferables) {
        transferables = data.__remobj_transferables
        actualData = { ...data }
        delete actualData.__remobj_transferables
      }
      
      this.recordMessage(channelId, 'broadcast', actualData, transferables)
      
      // Apply latency if configured
      const latency = this.latencyMap.get(channelId) || 0
      if (latency > 0) {
        setTimeout(() => originalPostMessageB(actualData), latency)
      } else {
        originalPostMessageB(actualData)
      }
    }

    return endpoints
  }

  /**
   * Get an existing channel by ID
   */
  getChannel(channelId: string): MessageChannelEndpoints | undefined {
    return this.channels.get(channelId)
  }

  /**
   * Connect two channels for cross-channel communication
   */
  connectChannels(channelAId: string, channelBId: string): void {
    const channelA = this.channels.get(channelAId)
    const channelB = this.channels.get(channelBId)

    if (!channelA || !channelB) {
      throw new Error(`One or both channels not found: ${channelAId}, ${channelBId}`)
    }

    // Add bidirectional connection
    this.connections.get(channelAId)?.add(channelBId)
    this.connections.get(channelBId)?.add(channelAId)

    // Set up message forwarding
    this.setupMessageForwarding(channelAId, channelBId, channelA, channelB)
  }

  private setupMessageForwarding(
    channelAId: string,
    channelBId: string,
    channelA: MessageChannelEndpoints,
    channelB: MessageChannelEndpoints
  ): void {
    // Forward messages from A to B
    channelA.endpointA.addEventListener('message', (event: MessageEvent) => {
      this.recordMessage(channelAId, channelBId, event.data)
      channelB.endpointB.simulateMessage(event.data)
    })

    // Forward messages from B to A
    channelB.endpointA.addEventListener('message', (event: MessageEvent) => {
      this.recordMessage(channelBId, channelAId, event.data)
      channelA.endpointB.simulateMessage(event.data)
    })
  }

  /**
   * Disconnect two channels
   */
  disconnectChannels(channelAId: string, channelBId: string): void {
    this.connections.get(channelAId)?.delete(channelBId)
    this.connections.get(channelBId)?.delete(channelAId)
  }

  /**
   * Set latency for a specific channel
   */
  setChannelLatency(channelId: string, latencyMs: number): void {
    this.latencyMap.set(channelId, latencyMs)
  }

  /**
   * Simulate network partition - disconnect a channel from all others
   */
  partitionChannel(channelId: string): void {
    const connections = this.connections.get(channelId)
    if (connections) {
      for (const connectedId of connections) {
        this.disconnectChannels(channelId, connectedId)
      }
    }
  }

  /**
   * Restore channel from partition
   */
  restoreChannel(channelId: string, connectToChannels: string[]): void {
    for (const otherChannelId of connectToChannels) {
      if (this.channels.has(otherChannelId)) {
        this.connectChannels(channelId, otherChannelId)
      }
    }
  }

  /**
   * Create a star topology (one central channel connected to all others)
   */
  createStarTopology(centralChannelId: string, leafChannelIds: string[]): void {
    for (const leafId of leafChannelIds) {
      if (this.channels.has(leafId)) {
        this.connectChannels(centralChannelId, leafId)
      }
    }
  }

  /**
   * Create a ring topology (each channel connected to the next)
   */
  createRingTopology(channelIds: string[]): void {
    for (let i = 0; i < channelIds.length; i++) {
      const currentId = channelIds[i]
      const nextId = channelIds[(i + 1) % channelIds.length]
      
      if (this.channels.has(currentId) && this.channels.has(nextId)) {
        this.connectChannels(currentId, nextId)
      }
    }
  }

  /**
   * Create a mesh topology (every channel connected to every other)
   */
  createMeshTopology(channelIds: string[]): void {
    for (let i = 0; i < channelIds.length; i++) {
      for (let j = i + 1; j < channelIds.length; j++) {
        const channelA = channelIds[i]
        const channelB = channelIds[j]
        
        if (this.channels.has(channelA) && this.channels.has(channelB)) {
          this.connectChannels(channelA, channelB)
        }
      }
    }
  }

  private recordMessage(
    fromChannel: string,
    toChannel: string,
    data: any,
    transferables?: Transferable[]
  ): void {
    this.messageHistory.push({
      timestamp: Date.now(),
      fromChannel,
      toChannel,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      transferables: transferables ? [...transferables] : undefined
    })
  }

  /**
   * Get complete message history across all channels
   */
  getMessageHistory(): Array<{
    timestamp: number
    fromChannel: string
    toChannel: string
    data: any
    transferables?: Transferable[]
  }> {
    return [...this.messageHistory].sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get message history for a specific channel
   */
  getChannelMessageHistory(channelId: string): Array<{
    timestamp: number
    fromChannel: string
    toChannel: string
    data: any
    transferables?: Transferable[]
  }> {
    return this.messageHistory
      .filter(msg => msg.fromChannel === channelId || msg.toChannel === channelId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Clear all message history
   */
  clearMessageHistory(): void {
    this.messageHistory.length = 0
  }

  /**
   * Get network topology information
   */
  getTopology(): Record<string, string[]> {
    const topology: Record<string, string[]> = {}
    
    for (const [channelId, connections] of this.connections) {
      topology[channelId] = Array.from(connections)
    }
    
    return topology
  }

  /**
   * Get comprehensive statistics about the pool
   */
  getPoolStats(): {
    totalChannels: number
    totalConnections: number
    totalMessages: number
    averageLatency: number
    channelStats: Record<string, {
      connections: number
      messagesSent: number
      messagesReceived: number
    }>
  } {
    const channelStats: Record<string, {
      connections: number
      messagesSent: number
      messagesReceived: number
    }> = {}

    // Initialize stats for all channels
    for (const channelId of this.channels.keys()) {
      channelStats[channelId] = {
        connections: this.connections.get(channelId)?.size || 0,
        messagesSent: 0,
        messagesReceived: 0
      }
    }

    // Count messages
    for (const msg of this.messageHistory) {
      if (channelStats[msg.fromChannel]) {
        channelStats[msg.fromChannel].messagesSent++
      }
      if (channelStats[msg.toChannel]) {
        channelStats[msg.toChannel].messagesReceived++
      }
    }

    const totalConnections = Array.from(this.connections.values())
      .reduce((sum, connections) => sum + connections.size, 0) / 2 // Divide by 2 for bidirectional

    const averageLatency = Array.from(this.latencyMap.values())
      .reduce((sum, latency) => sum + latency, 0) / this.latencyMap.size || 0

    return {
      totalChannels: this.channels.size,
      totalConnections,
      totalMessages: this.messageHistory.length,
      averageLatency,
      channelStats
    }
  }

  /**
   * Simulate a broadcast message to all connected channels
   */
  broadcast(fromChannelId: string, data: any, transferables?: Transferable[]): void {
    const fromChannel = this.channels.get(fromChannelId)
    const connections = this.connections.get(fromChannelId)

    if (!fromChannel || !connections) {
      throw new Error(`Channel ${fromChannelId} not found or has no connections`)
    }

    for (const toChannelId of connections) {
      const toChannel = this.channels.get(toChannelId)
      if (toChannel) {
        this.recordMessage(fromChannelId, toChannelId, data, transferables)
        
        // Apply latency if configured
        const latency = this.latencyMap.get(fromChannelId) || 0
        if (latency > 0) {
          setTimeout(() => toChannel.endpointB.simulateMessage(data), latency)
        } else {
          toChannel.endpointB.simulateMessage(data)
        }
      }
    }
  }

  /**
   * Remove a channel and all its connections
   */
  removeChannel(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      // Disconnect from all connected channels
      const connections = this.connections.get(channelId)
      if (connections) {
        for (const connectedId of connections) {
          this.disconnectChannels(channelId, connectedId)
        }
      }
      
      // Clean up
      channel.disconnect()
      this.channels.delete(channelId)
      this.connections.delete(channelId)
      this.latencyMap.delete(channelId)
    }
  }

  /**
   * Remove all channels and reset the pool
   */
  reset(): void {
    for (const channel of this.channels.values()) {
      channel.disconnect()
    }
    
    this.channels.clear()
    this.connections.clear()
    this.messageHistory.length = 0
    this.latencyMap.clear()
  }
}

/**
 * Create a new MessageChannel pool for testing
 */
export function createMessageChannelPool(): MessageChannelPool {
  return new MessageChannelPool()
}