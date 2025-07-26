import { describe, it, expect, beforeEach } from 'vitest'
import { createMonitor } from '../src'
import type { PostMessageEndpoint } from '@remobj/core'

// Test devtools integration with @remobj/core types
describe('@remobj/dev-core - Integration with @remobj/core', () => {
  it('should work with PostMessageEndpoint type from @remobj/core', () => {
    // Mock a PostMessageEndpoint
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: (data: any) => {},
      addEventListener: (type: string, listener: any) => {},
      removeEventListener: (type: string, listener: any) => {},
      isConnected: () => true,
      disconnect: () => {}
    }

    // Should create monitor without errors
    const monitor = createMonitor(mockEndpoint)
    
    expect(monitor).toBeDefined()
    expect(monitor.connections).toBeDefined()
    expect(monitor.messages).toBeDefined()
    expect(monitor.data).toBeDefined()
  })

  it('should handle devtools proxy messages', () => {
    const listeners: ((event: MessageEvent) => void)[] = []
    
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: (data: any) => {},
      addEventListener: (type: string, listener: any) => {
        if (type === 'message') listeners.push(listener)
      },
      removeEventListener: (type: string, listener: any) => {},
      isConnected: () => true,
      disconnect: () => {}
    }

    const monitor = createMonitor(mockEndpoint)

    // Simulate a devtools proxy message
    const proxyMessage = {
      type: 'EP_EVENT_send',
      id: 'test-endpoint',
      timestamp: Date.now(),
      message: { type: 'test', data: 'hello' },
      stackTrace: 'at test()',
      platform: 'test-platform',
      language: 'ts'
    }

    const event = { data: proxyMessage } as MessageEvent
    listeners.forEach(l => l(event))

    expect(monitor.messages.value).toHaveLength(1)
    expect(monitor.messages.value[0]).toMatchObject({
      id: 'test-endpoint',
      type: 'EP_EVENT_send',
      message: { type: 'test', data: 'hello' }
    })
  })

  it('should handle EP_DETECTION_REQUEST/RESPONSE flow', () => {
    const listeners: ((event: MessageEvent) => void)[] = []
    let lastPostedMessage: any = null
    
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: (data: any) => { lastPostedMessage = data },
      addEventListener: (type: string, listener: any) => {
        if (type === 'message') listeners.push(listener)
      },
      removeEventListener: (type: string, listener: any) => {},
      isConnected: () => true,
      disconnect: () => {}
    }

    const monitor = createMonitor(mockEndpoint)

    // Call discover to send detection request
    monitor.discover()
    
    expect(lastPostedMessage).toMatchObject({
      type: 'EP_DETECTION_REQUEST',
      id: expect.any(String)
    })

    // Simulate detection response
    const detectionResponse = {
      senderID: 'worker-1',
      receiverID: 'main-thread',
      requestID: lastPostedMessage.id,
      senderMeta: {
        id: 'worker-1',
        type: 'worker',
        name: 'Background Worker',
        created: Date.now()
      },
      receiverMeta: {
        id: 'main-thread',
        type: 'window',
        name: 'Main Window',
        created: Date.now()
      }
    }

    const event = { data: detectionResponse } as MessageEvent
    listeners.forEach(l => l(event))

    expect(monitor.connections.value).toHaveLength(1)
    expect(monitor.connections.value[0]).toMatchObject({
      from: 'worker-1',
      to: 'main-thread'
    })
  })
})