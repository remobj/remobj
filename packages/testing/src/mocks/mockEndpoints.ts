import type { MockEndpoint, EndpointPair } from '../types'

/**
 * Basic mock endpoint implementation for testing
 */
export class MockEndpointPair implements EndpointPair {
  public readonly endpointA: MockEndpoint
  public readonly endpointB: MockEndpoint
  private connected = true

  constructor() {
    const sentMessagesA: any[] = []
    const sentMessagesB: any[] = []
    const listenersA = new Set<(event: MessageEvent) => void>()
    const listenersB = new Set<(event: MessageEvent) => void>()

    this.endpointA = {
      postMessage: (data: any) => {
        if (!this.connected) return
        sentMessagesA.push(data)
        // Simulate async message delivery
        setTimeout(() => {
          const event = new MessageEvent('message', { data })
          listenersB.forEach(listener => listener(event))
        }, 0)
      },
      
      addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') listenersA.add(listener)
      },
      
      removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') listenersA.delete(listener)
      },

      getSentMessages: () => [...sentMessagesA],
      
      clearMessages: () => {
        sentMessagesA.length = 0
      },
      
      simulateMessage: (data: any) => {
        const event = new MessageEvent('message', { data })
        listenersA.forEach(listener => listener(event))
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        listenersA.clear()
      }
    }

    this.endpointB = {
      postMessage: (data: any) => {
        if (!this.connected) return
        sentMessagesB.push(data)
        // Simulate async message delivery
        setTimeout(() => {
          const event = new MessageEvent('message', { data })
          listenersA.forEach(listener => listener(event))
        }, 0)
      },
      
      addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') listenersB.add(listener)
      },
      
      removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => {
        if (type === 'message') listenersB.delete(listener)
      },

      getSentMessages: () => [...sentMessagesB],
      
      clearMessages: () => {
        sentMessagesB.length = 0
      },
      
      simulateMessage: (data: any) => {
        const event = new MessageEvent('message', { data })
        listenersB.forEach(listener => listener(event))
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        listenersB.clear()
      }
    }
  }

  disconnect(): void {
    this.connected = false
    this.endpointA.disconnect()
    this.endpointB.disconnect()
  }
}

/**
 * Creates a pair of mock endpoints for testing
 */
export function createMockEndpointPair(): MockEndpointPair {
  return new MockEndpointPair()
}