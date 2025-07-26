import { describe, it, expect, beforeEach } from 'vitest'
import { createMonitor } from '../src'

// Mock PostMessage endpoint for testing
class MockEndpoint {
  private listeners: ((event: MessageEvent) => void)[] = []

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.push(listener)
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  postMessage(data: any) {
    // Simulate message posting - in real scenario this would go to another endpoint
  }

  // Helper to simulate receiving messages
  simulateMessage(data: any) {
    const event = { data } as MessageEvent
    this.listeners.forEach(listener => listener(event))
  }

  isConnected() {
    return true
  }

  disconnect() {
    this.listeners = []
  }
}

describe('@remobj/dev-core - Monitor', () => {
  let mockEndpoint: MockEndpoint
  let monitor: ReturnType<typeof createMonitor>

  beforeEach(() => {
    mockEndpoint = new MockEndpoint()
    monitor = createMonitor(mockEndpoint as any)
  })

  it('should create monitor with reactive properties', () => {
    expect(monitor.connections).toBeDefined()
    expect(monitor.messages).toBeDefined()
    expect(monitor.data).toBeDefined()
    expect(monitor.discover).toBeDefined()
    expect(monitor.clear).toBeDefined()

    // Check initial values
    expect(monitor.connections.value).toEqual([])
    expect(monitor.messages.value).toEqual([])
    expect(monitor.data.value).toEqual([])
  })

  it('should track connection discovery responses', () => {
    const detectionResponse = {
      senderID: 'endpoint-1',
      receiverID: 'endpoint-2',
      requestID: 'req-123'
    }

    mockEndpoint.simulateMessage(detectionResponse)

    expect(monitor.connections.value).toHaveLength(1)
    expect(monitor.connections.value[0]).toMatchObject({
      from: 'endpoint-1',
      to: 'endpoint-2'
    })
    expect(monitor.connections.value[0].timestamp).toBeGreaterThan(0)
  })

  it('should track EP_EVENT messages', () => {
    const sendEvent = {
      type: 'EP_EVENT_send',
      id: 'endpoint-1',
      timestamp: Date.now(),
      message: { test: 'data' }
    }

    const receiveEvent = {
      type: 'EP_EVENT_receive',
      id: 'endpoint-2',
      timestamp: Date.now(),
      message: { response: 'data' }
    }

    mockEndpoint.simulateMessage(sendEvent)
    mockEndpoint.simulateMessage(receiveEvent)

    expect(monitor.messages.value).toHaveLength(2)
    expect(monitor.messages.value[0]).toMatchObject({
      id: 'endpoint-1',
      type: 'EP_EVENT_send',
      message: { test: 'data' }
    })
    expect(monitor.messages.value[1]).toMatchObject({
      id: 'endpoint-2',
      type: 'EP_EVENT_receive',
      message: { response: 'data' }
    })
  })

  it('should store all data entries', () => {
    const testData1 = { type: 'test', value: 1 }
    const testData2 = { different: 'data' }

    mockEndpoint.simulateMessage(testData1)
    mockEndpoint.simulateMessage(testData2)

    expect(monitor.data.value).toHaveLength(2)
    expect(monitor.data.value[0]).toMatchObject(testData1)
    expect(monitor.data.value[1]).toMatchObject(testData2)
    
    // Should add timestamps
    expect(monitor.data.value[0].timestamp).toBeGreaterThan(0)
    expect(monitor.data.value[1].timestamp).toBeGreaterThan(0)
  })

  it('should clear all data when clear() is called', () => {
    // Add some data first
    mockEndpoint.simulateMessage({ senderID: 'test', receiverID: 'test2' })
    mockEndpoint.simulateMessage({ type: 'EP_EVENT_send', id: 'test', timestamp: Date.now(), message: {} })
    mockEndpoint.simulateMessage({ arbitrary: 'data' })

    expect(monitor.connections.value).toHaveLength(1)
    expect(monitor.messages.value).toHaveLength(1)
    expect(monitor.data.value).toHaveLength(3)

    monitor.clear()

    expect(monitor.connections.value).toEqual([])
    expect(monitor.messages.value).toEqual([])
    expect(monitor.data.value).toEqual([])
  })

  it('should call discover() without errors', () => {
    expect(() => monitor.discover()).not.toThrow()
  })
})