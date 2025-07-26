import type { MockEndpoint, EndpointPair } from '../types'

/**
 * Enhanced MessageChannel-based endpoint pair for testing
 * This uses real MessageChannel/MessagePort objects but adds comprehensive testing utilities
 * and better integration with remobj communication patterns.
 */
export class MessageChannelEndpoints implements EndpointPair {
  public readonly endpointA: MockEndpoint
  public readonly endpointB: MockEndpoint
  private readonly channel: MessageChannel
  private connected = true
  private transferHistory: Array<{ port: 'A' | 'B'; data: any; timestamp: number; transferables?: Transferable[] }> = []
  private errorHandlers = new Map<MessagePort, Set<(error: ErrorEvent) => void>>()

  constructor() {
    this.channel = new MessageChannel()
    const sentMessagesA: any[] = []
    const sentMessagesB: any[] = []

    // Setup error handling for ports
    this.errorHandlers.set(this.channel.port1, new Set())
    this.errorHandlers.set(this.channel.port2, new Set())

    // Wrap port1 as endpointA
    this.endpointA = {
      postMessage: (data: any) => {
        if (!this.connected) return
        
        // Extract transferables from data if present (testing pattern)
        let transferables: Transferable[] | undefined
        let actualData = data
        if (data && typeof data === 'object' && data.__remobj_transferables) {
          transferables = data.__remobj_transferables
          actualData = { ...data }
          delete actualData.__remobj_transferables
        }
        
        const transferRecord = {
          port: 'A' as const,
          data: JSON.parse(JSON.stringify(actualData)), // Deep clone for history
          timestamp: Date.now(),
          transferables: transferables ? [...transferables] : undefined
        }
        
        sentMessagesA.push(actualData)
        this.transferHistory.push(transferRecord)
        
        try {
          if (transferables && transferables.length > 0) {
            this.channel.port1.postMessage(actualData, transferables)
          } else {
            this.channel.port1.postMessage(actualData)
          }
        } catch (error) {
          // Simulate MessagePort error event
          this.errorHandlers.get(this.channel.port1)?.forEach(handler => {
            handler(new ErrorEvent('error', { error, message: error instanceof Error ? error.message : String(error) }))
          })
          throw error
        }
      },
      
      addEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'message') {
          this.channel.port1.addEventListener('message', listener as EventListener)
          this.channel.port1.start() // Ensure port is started
        } else if (type === 'error') {
          this.errorHandlers.get(this.channel.port1)?.add(listener as (error: ErrorEvent) => void)
        } else if (type === 'messageerror') {
          this.channel.port1.addEventListener('messageerror', listener as EventListener)
        }
      },
      
      removeEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'message') {
          this.channel.port1.removeEventListener('message', listener as EventListener)
        } else if (type === 'error') {
          this.errorHandlers.get(this.channel.port1)?.delete(listener as (error: ErrorEvent) => void)
        } else if (type === 'messageerror') {
          this.channel.port1.removeEventListener('messageerror', listener as EventListener)
        }
      },

      getSentMessages: () => [...sentMessagesA],
      
      clearMessages: () => {
        sentMessagesA.length = 0
      },
      
      simulateMessage: (data: any) => {
        // Send message from the other port to simulate external message
        this.channel.port2.postMessage(data)
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        this.channel.port1.close()
        this.errorHandlers.get(this.channel.port1)?.clear()
      },

      // Enhanced testing utilities
      getTransferHistory: () => this.transferHistory.filter(t => t.port === 'A'),
      
      getLastTransfer: () => {
        const transfers = this.transferHistory.filter(t => t.port === 'A')
        return transfers[transfers.length - 1]
      },
      
      simulateError: (error: Error) => {
        this.errorHandlers.get(this.channel.port1)?.forEach(handler => {
          handler(new ErrorEvent('error', { error, message: error.message }))
        })
      },

      simulateMessageError: (data: any) => {
        const event = new MessageEvent('messageerror', { data })
        this.channel.port1.dispatchEvent(event)
      },

      // MessagePort specific methods for compatibility
      start: () => this.channel.port1.start(),
      close: () => this.disconnect(),
      
      // Access to underlying port for advanced testing
      _getPort: () => this.channel.port1
    }

    // Wrap port2 as endpointB
    this.endpointB = {
      postMessage: (data: any) => {
        if (!this.connected) return
        
        // Extract transferables from data if present (testing pattern)
        let transferables: Transferable[] | undefined
        let actualData = data
        if (data && typeof data === 'object' && data.__remobj_transferables) {
          transferables = data.__remobj_transferables
          actualData = { ...data }
          delete actualData.__remobj_transferables
        }
        
        const transferRecord = {
          port: 'B' as const,
          data: JSON.parse(JSON.stringify(actualData)), // Deep clone for history
          timestamp: Date.now(),
          transferables: transferables ? [...transferables] : undefined
        }
        
        sentMessagesB.push(actualData)
        this.transferHistory.push(transferRecord)
        
        try {
          if (transferables && transferables.length > 0) {
            this.channel.port2.postMessage(actualData, transferables)
          } else {
            this.channel.port2.postMessage(actualData)
          }
        } catch (error) {
          // Simulate MessagePort error event
          this.errorHandlers.get(this.channel.port2)?.forEach(handler => {
            handler(new ErrorEvent('error', { error, message: error instanceof Error ? error.message : String(error) }))
          })
          throw error
        }
      },
      
      addEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'message') {
          this.channel.port2.addEventListener('message', listener as EventListener)
          this.channel.port2.start() // Ensure port is started
        } else if (type === 'error') {
          this.errorHandlers.get(this.channel.port2)?.add(listener as (error: ErrorEvent) => void)
        } else if (type === 'messageerror') {
          this.channel.port2.addEventListener('messageerror', listener as EventListener)
        }
      },
      
      removeEventListener: (type: string, listener: (event: any) => void) => {
        if (type === 'message') {
          this.channel.port2.removeEventListener('message', listener as EventListener)
        } else if (type === 'error') {
          this.errorHandlers.get(this.channel.port2)?.delete(listener as (error: ErrorEvent) => void)
        } else if (type === 'messageerror') {
          this.channel.port2.removeEventListener('messageerror', listener as EventListener)
        }
      },

      getSentMessages: () => [...sentMessagesB],
      
      clearMessages: () => {
        sentMessagesB.length = 0
      },
      
      simulateMessage: (data: any) => {
        // Send message from the other port to simulate external message
        this.channel.port1.postMessage(data)
      },
      
      isConnected: () => this.connected,
      
      disconnect: () => {
        this.connected = false
        this.channel.port2.close()
        this.errorHandlers.get(this.channel.port2)?.clear()
      },

      // Enhanced testing utilities
      getTransferHistory: () => this.transferHistory.filter(t => t.port === 'B'),
      
      getLastTransfer: () => {
        const transfers = this.transferHistory.filter(t => t.port === 'B')
        return transfers[transfers.length - 1]
      },
      
      simulateError: (error: Error) => {
        this.errorHandlers.get(this.channel.port2)?.forEach(handler => {
          handler(new ErrorEvent('error', { error, message: error.message }))
        })
      },

      simulateMessageError: (data: any) => {
        const event = new MessageEvent('messageerror', { data })
        this.channel.port2.dispatchEvent(event)
      },

      // MessagePort specific methods for compatibility
      start: () => this.channel.port2.start(),
      close: () => this.disconnect(),
      
      // Access to underlying port for advanced testing
      _getPort: () => this.channel.port2
    }
  }

  disconnect(): void {
    this.connected = false
    this.endpointA.disconnect()
    this.endpointB.disconnect()
  }

  /**
   * Get complete transfer history for both ports
   */
  getAllTransfers(): Array<{ port: 'A' | 'B'; data: any; timestamp: number; transferables?: Transferable[] }> {
    return [...this.transferHistory].sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Clear all transfer history
   */
  clearTransferHistory(): void {
    this.transferHistory.length = 0
  }

  /**
   * Get transfer statistics
   */
  getTransferStats(): {
    totalTransfers: number
    portATransfers: number
    portBTransfers: number
    averageMessageSize: number
    transfersWithTransferables: number
  } {
    const portA = this.transferHistory.filter(t => t.port === 'A').length
    const portB = this.transferHistory.filter(t => t.port === 'B').length
    const withTransferables = this.transferHistory.filter(t => t.transferables && t.transferables.length > 0).length
    
    const totalSize = this.transferHistory.reduce((sum, transfer) => {
      return sum + JSON.stringify(transfer.data).length
    }, 0)
    
    return {
      totalTransfers: this.transferHistory.length,
      portATransfers: portA,
      portBTransfers: portB,
      averageMessageSize: this.transferHistory.length > 0 ? totalSize / this.transferHistory.length : 0,
      transfersWithTransferables: withTransferables
    }
  }

  /**
   * Simulate network latency by delaying message delivery
   */
  setLatencySimulation(latencyMs: number): void {
    // Override our endpoint postMessage methods (not the underlying MessagePort)
    const originalPostMessageA = this.endpointA.postMessage
    const originalPostMessageB = this.endpointB.postMessage

    this.endpointA.postMessage = (data: any) => {
      setTimeout(() => originalPostMessageA(data), latencyMs)
    }

    this.endpointB.postMessage = (data: any) => {
      setTimeout(() => originalPostMessageB(data), latencyMs)
    }
  }

  /**
   * Create additional MessagePorts for advanced testing scenarios
   */
  createAdditionalPort(): MessagePort {
    const additionalChannel = new MessageChannel()
    // Transfer one port to create a detached port scenario
    this.channel.port1.postMessage({ type: 'port-transfer' }, [additionalChannel.port1])
    return additionalChannel.port2
  }

  /**
   * Test if ports are properly started
   */
  arePortsStarted(): { portA: boolean; portB: boolean } {
    // This is a heuristic - MessagePort doesn't expose started state directly
    // We simulate by checking if we can post a message without error
    try {
      this.channel.port1.postMessage({ test: 'ping' })
      this.channel.port2.postMessage({ test: 'ping' })
      return { portA: true, portB: true }
    } catch {
      return { portA: false, portB: false }
    }
  }
}

/**
 * Creates a pair of MessageChannel-based endpoints for testing
 */
export function createMessageChannelEndpoints(): MessageChannelEndpoints {
  return new MessageChannelEndpoints()
}