import type { MockEndpoint, EndpointPair } from '../types'

/**
 * Global registry for BroadcastChannel instances to simulate real multi-instance behavior
 */
class BroadcastChannelRegistry {
  private static instance: BroadcastChannelRegistry
  private channels = new Map<string, Set<BroadcastChannelMock>>()
  private messageHistory: Array<{
    timestamp: number
    channelName: string
    data: any
    senderId: string
    receiverIds: string[]
  }> = []

  static getInstance(): BroadcastChannelRegistry {
    if (!BroadcastChannelRegistry.instance) {
      BroadcastChannelRegistry.instance = new BroadcastChannelRegistry()
    }
    return BroadcastChannelRegistry.instance
  }

  register(channelName: string, mock: BroadcastChannelMock): void {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set())
    }
    this.channels.get(channelName)!.add(mock)
  }

  unregister(channelName: string, mock: BroadcastChannelMock): void {
    this.channels.get(channelName)?.delete(mock)
    if (this.channels.get(channelName)?.size === 0) {
      this.channels.delete(channelName)
    }
  }

  broadcast(channelName: string, data: any, senderId: string): void {
    const instances = this.channels.get(channelName)
    if (!instances) return

    const receivers: string[] = []
    for (const instance of instances) {
      if (instance.id !== senderId) {
        instance.receiveMessage(data)
        receivers.push(instance.id)
      }
    }

    this.messageHistory.push({
      timestamp: Date.now(),
      channelName,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      senderId,
      receiverIds: receivers
    })
  }

  getMessageHistory(channelName?: string): Array<{
    timestamp: number
    channelName: string
    data: any
    senderId: string
    receiverIds: string[]
  }> {
    if (channelName) {
      return this.messageHistory.filter(msg => msg.channelName === channelName)
    }
    return [...this.messageHistory]
  }

  clearHistory(): void {
    this.messageHistory.length = 0
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  getChannelInstanceCount(channelName: string): number {
    return this.channels.get(channelName)?.size || 0
  }
}

/**
 * Enhanced BroadcastChannel mock that simulates real multi-instance behavior
 */
class BroadcastChannelMock {
  public readonly id: string
  private listeners = new Set<(event: MessageEvent) => void>()
  private errorHandlers = new Set<(error: ErrorEvent) => void>()
  private _closed = false
  private registry = BroadcastChannelRegistry.getInstance()

  constructor(public readonly name: string) {
    this.id = `bc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.registry.register(name, this)
  }

  postMessage(data: any): void {
    if (this._closed) {
      throw new Error('BroadcastChannel is closed')
    }
    
    try {
      // Simulate structured clone
      const clonedData = JSON.parse(JSON.stringify(data))
      this.registry.broadcast(this.name, clonedData, this.id)
    } catch (error) {
      // Simulate DataCloneError
      this.errorHandlers.forEach(handler => {
        handler(new ErrorEvent('error', { 
          error: new Error('DataCloneError: Failed to execute postMessage'), 
          message: 'Failed to execute postMessage' 
        }))
      })
      throw new Error('DataCloneError: Failed to execute postMessage')
    }
  }

  receiveMessage(data: any): void {
    if (this._closed) return
    
    const event = new MessageEvent('message', { data })
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        this.errorHandlers.forEach(handler => {
          handler(new ErrorEvent('error', { error }))
        })
      }
    })
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const eventHandler = typeof listener === 'function' ? listener : listener.handleEvent
    
    if (type === 'message') {
      this.listeners.add(eventHandler as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.errorHandlers.add(eventHandler as (error: ErrorEvent) => void)
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const eventHandler = typeof listener === 'function' ? listener : listener.handleEvent
    
    if (type === 'message') {
      this.listeners.delete(eventHandler as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.errorHandlers.delete(eventHandler as (error: ErrorEvent) => void)
    }
  }

  close(): void {
    if (this._closed) return
    
    this._closed = true
    this.registry.unregister(this.name, this)
    this.listeners.clear()
    this.errorHandlers.clear()
  }

  get closed(): boolean {
    return this._closed
  }
}

/**
 * Enhanced BroadcastChannel-based endpoint pair for testing with multi-instance support
 * This now properly simulates how BroadcastChannels work in real browsers with
 * multiple instances per channel name and proper message broadcasting.
 */
export class BroadcastChannelEndpoints implements EndpointPair {
  public readonly endpointA: MockEndpoint
  public readonly endpointB: MockEndpoint
  private readonly channelA: BroadcastChannelMock
  private readonly channelB: BroadcastChannelMock
  private connected = true
  private registry = BroadcastChannelRegistry.getInstance()

  constructor(channelNameA = 'remobj-test-a', channelNameB = 'remobj-test-b') {
    this.channelA = new BroadcastChannelMock(channelNameA)
    this.channelB = new BroadcastChannelMock(channelNameB)
    
    const sentMessagesA: any[] = []
    const sentMessagesB: any[] = []

    // Create cross-connected endpoints
    // EndpointA sends on channelA, receives on channelB
    this.endpointA = {
      postMessage: (data: any) => {
        if (!this.connected) return
        sentMessagesA.push(data)
        this.channelA.postMessage(data)
      },
      
      addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') {
          this.channelB.addEventListener('message', listener as EventListener)
        }
      },
      
      removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') {
          this.channelB.removeEventListener('message', listener as EventListener)
        }
      },

      getSentMessages: () => [...sentMessagesA],
      
      clearMessages: () => {
        sentMessagesA.length = 0
      },
      
      simulateMessage: (data: any) => {
        // Send message on channelB to simulate external message to endpointA
        this.channelB.postMessage(data)
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        this.channelA.close()
      }
    }

    // EndpointB sends on channelB, receives on channelA
    this.endpointB = {
      postMessage: (data: any) => {
        if (!this.connected) return
        sentMessagesB.push(data)
        this.channelB.postMessage(data)
      },
      
      addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') {
          this.channelA.addEventListener('message', listener as EventListener)
        }
      },
      
      removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') {
          this.channelA.removeEventListener('message', listener as EventListener)
        }
      },

      getSentMessages: () => [...sentMessagesB],
      
      clearMessages: () => {
        sentMessagesB.length = 0
      },
      
      simulateMessage: (data: any) => {
        // Send message on channelA to simulate external message to endpointB
        this.channelA.postMessage(data)
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        this.channelB.close()
      }
    }
  }

  disconnect(): void {
    this.connected = false
    this.endpointA.disconnect()
    this.endpointB.disconnect()
  }

  /**
   * Get message history for the channels used by this endpoint pair
   */
  getMessageHistory(): Array<{
    timestamp: number
    channelName: string
    data: any
    senderId: string
    receiverIds: string[]
  }> {
    const historyA = this.registry.getMessageHistory(this.channelA.name)
    const historyB = this.registry.getMessageHistory(this.channelB.name)
    return [...historyA, ...historyB].sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get the number of active instances for each channel
   */
  getChannelInstanceCounts(): { channelA: number; channelB: number } {
    return {
      channelA: this.registry.getChannelInstanceCount(this.channelA.name),
      channelB: this.registry.getChannelInstanceCount(this.channelB.name)
    }
  }

  /**
   * Create additional BroadcastChannel instances for testing multi-instance scenarios
   */
  createAdditionalInstance(channelName: string): BroadcastChannelMock {
    return new BroadcastChannelMock(channelName)
  }

  /**
   * Simulate a broadcast from an external instance
   */
  simulateExternalBroadcast(channelName: string, data: any): void {
    const externalInstance = new BroadcastChannelMock(channelName)
    externalInstance.postMessage(data)
    externalInstance.close() // Clean up immediately
  }

  /**
   * Clear all message history for the registry
   */
  clearGlobalMessageHistory(): void {
    this.registry.clearHistory()
  }

  /**
   * Get all active channels in the registry
   */
  getActiveChannels(): string[] {
    return this.registry.getActiveChannels()
  }
}

/**
 * Creates a pair of BroadcastChannel-based endpoints for testing
 */
export function createBroadcastChannelEndpoints(
  channelNameA?: string, 
  channelNameB?: string
): BroadcastChannelEndpoints {
  return new BroadcastChannelEndpoints(channelNameA, channelNameB)
}