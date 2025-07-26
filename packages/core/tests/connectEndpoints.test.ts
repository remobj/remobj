import { describe, it, expect, vi } from 'vitest'
import { connectEndpoints, PostMessageEndpoint } from '../src/endpoint'

describe('connectEndpoints', () => {
  function createMockEndpoint(): PostMessageEndpoint & { 
    listeners: Set<(event: MessageEvent) => void>
    lastMessage: any 
    simulateMessage: (data: any) => void
  } {
    const listeners = new Set<(event: MessageEvent) => void>()
    return {
      listeners,
      lastMessage: undefined,
      postMessage(data: any) {
        this.lastMessage = data
      },
      addEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        listeners.add(listener)
      },
      removeEventListener(type: 'message', listener: (event: MessageEvent) => void) {
        listeners.delete(listener)
      },
      simulateMessage(data: any) {
        const event = new MessageEvent('message', { data })
        // Trigger all listeners including the ones added via addEventListener
        listeners.forEach(listener => listener(event))
      }
    }
  }

  it('should forward messages from endpointA to endpointB', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    connectEndpoints(endpointA, endpointB)
    
    const testData = { message: 'hello from A' }
    endpointA.simulateMessage(testData)
    
    expect(endpointB.lastMessage).toEqual(testData)
  })

  it('should forward messages from endpointB to endpointA', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    connectEndpoints(endpointA, endpointB)
    
    const testData = { message: 'hello from B' }
    endpointB.simulateMessage(testData)
    
    expect(endpointA.lastMessage).toEqual(testData)
  })

  it('should enable bidirectional communication', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    connectEndpoints(endpointA, endpointB)
    
    // A -> B
    const messageFromA = { sender: 'A', content: 'Hello B' }
    endpointA.simulateMessage(messageFromA)
    expect(endpointB.lastMessage).toEqual(messageFromA)
    
    // B -> A
    const messageFromB = { sender: 'B', content: 'Hello A' }
    endpointB.simulateMessage(messageFromB)
    expect(endpointA.lastMessage).toEqual(messageFromB)
  })

  it('should properly disconnect endpoints when cleanup function is called', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    const disconnect = connectEndpoints(endpointA, endpointB)
    
    // Verify connection works
    const testMessage = { test: 'message' }
    endpointA.simulateMessage(testMessage)
    expect(endpointB.lastMessage).toEqual(testMessage)
    
    // Clear previous messages
    endpointA.lastMessage = undefined
    endpointB.lastMessage = undefined
    
    // Disconnect
    disconnect()
    
    // Verify no more forwarding
    endpointA.simulateMessage({ after: 'disconnect' })
    expect(endpointB.lastMessage).toBeUndefined()
    
    endpointB.simulateMessage({ after: 'disconnect' })
    expect(endpointA.lastMessage).toBeUndefined()
  })

  it('should handle multiple bridges without interference', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    const endpointC = createMockEndpoint()
    const endpointD = createMockEndpoint()
    
    // Create two separate bridges: A-B and C-D
    const disconnectAB = connectEndpoints(endpointA, endpointB)
    const disconnectCD = connectEndpoints(endpointC, endpointD)
    
    // Test A-B bridge
    const messageAB = { bridge: 'A-B' }
    endpointA.simulateMessage(messageAB)
    expect(endpointB.lastMessage).toEqual(messageAB)
    expect(endpointC.lastMessage).toBeUndefined()
    expect(endpointD.lastMessage).toBeUndefined()
    
    // Test C-D bridge
    const messageCD = { bridge: 'C-D' }
    endpointC.simulateMessage(messageCD)
    expect(endpointD.lastMessage).toEqual(messageCD)
    expect(endpointA.lastMessage).toBeUndefined() // Should not affect A
    expect(endpointB.lastMessage).toEqual(messageAB) // Should still have previous message
    
    // Cleanup
    disconnectAB()
    disconnectCD()
  })

  it('should handle endpoints connected to themselves (edge case)', () => {
    const endpoint = createMockEndpoint()
    
    const disconnect = connectEndpoints(endpoint, endpoint)
    
    // This creates a potential infinite loop, but should be handled gracefully
    // The message should be forwarded from the endpoint to itself
    const testMessage = { self: 'reference' }
    endpoint.simulateMessage(testMessage)
    
    // Should receive the message (forwarded to itself)
    expect(endpoint.lastMessage).toEqual(testMessage)
    
    disconnect()
  })

  it('should handle complex data types', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    connectEndpoints(endpointA, endpointB)
    
    const complexData = {
      null: null,
      boolean: true,
      number: 42,
      string: 'test',
      array: [1, 2, 3],
      object: { nested: { deep: 'value' } },
      date: new Date().toISOString(),
      buffer: new ArrayBuffer(8)
    }
    
    endpointA.simulateMessage(complexData)
    expect(endpointB.lastMessage).toEqual(complexData)
  })

  it('should handle rapid message forwarding', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    connectEndpoints(endpointA, endpointB)
    
    // Send many messages rapidly
    const messageCount = 100
    const lastMessages: any[] = []
    
    for (let i = 0; i < messageCount; i++) {
      endpointA.simulateMessage({ id: i, content: `Message ${i}` })
      // Store the last message that was forwarded to B
      lastMessages.push(endpointB.lastMessage)
    }
    
    // Check that messages were properly forwarded
    expect(lastMessages).toHaveLength(messageCount)
    for (let i = 0; i < messageCount; i++) {
      expect(lastMessages[i]).toEqual({ id: i, content: `Message ${i}` })
    }
  })

  it('should handle concurrent connections', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    const endpointC = createMockEndpoint()
    
    // Connect A to both B and C
    const disconnectAB = connectEndpoints(endpointA, endpointB)
    const disconnectAC = connectEndpoints(endpointA, endpointC)
    
    const testMessage = { broadcast: 'message' }
    endpointA.simulateMessage(testMessage)
    
    // Both B and C should receive the message
    expect(endpointB.lastMessage).toEqual(testMessage)
    expect(endpointC.lastMessage).toEqual(testMessage)
    
    // Messages from B should go to A (but not affect C's lastMessage)
    const messageFromB = { from: 'B' }
    endpointB.simulateMessage(messageFromB)
    expect(endpointA.lastMessage).toEqual(messageFromB)
    expect(endpointC.lastMessage).toEqual(testMessage) // Unchanged
    
    disconnectAB()
    disconnectAC()
  })

  it('should work with different message event listeners', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    // Add custom listeners to both endpoints
    const listenerA = vi.fn()
    const listenerB = vi.fn()
    
    endpointA.addEventListener('message', listenerA)
    endpointB.addEventListener('message', listenerB)
    
    connectEndpoints(endpointA, endpointB)
    
    const testMessage = { test: 'listeners' }
    endpointA.simulateMessage(testMessage)
    
    // Original listener on A should be called
    expect(listenerA).toHaveBeenCalledWith(
      expect.objectContaining({ data: testMessage })
    )
    
    // Message should be forwarded to B
    expect(endpointB.lastMessage).toEqual(testMessage)
    
    // Test that B receives the forwarded message by sending something to B
    const messageFromB = { from: 'B' }
    endpointB.simulateMessage(messageFromB)
    
    expect(listenerB).toHaveBeenCalledWith(
      expect.objectContaining({ data: messageFromB })
    )
    
    // Verify A received the message from B
    expect(endpointA.lastMessage).toEqual(messageFromB)
  })

  it('should handle listener removal after connection', () => {
    const endpointA = createMockEndpoint()
    const endpointB = createMockEndpoint()
    
    const disconnect = connectEndpoints(endpointA, endpointB)
    
    // Verify connection works
    endpointA.simulateMessage({ initial: 'test' })
    expect(endpointB.lastMessage).toEqual({ initial: 'test' })
    
    // Add and then remove a custom listener
    const customListener = vi.fn()
    endpointA.addEventListener('message', customListener)
    endpointA.removeEventListener('message', customListener)
    
    // Connection should still work
    endpointA.simulateMessage({ after: 'listener removal' })
    expect(endpointB.lastMessage).toEqual({ after: 'listener removal' })
    expect(customListener).not.toHaveBeenCalled()
    
    disconnect()
  })
})