import { describe, it, expect, vi } from 'vitest'
import { createChannel, PostMessageEndpoint } from '../src/endpoint'

describe('createChannel', () => {
  function createMockEndpoint(): PostMessageEndpoint & { 
    listeners: Set<(event: MessageEvent) => void>
    lastMessage: any 
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
      }
    }
  }

  function simulateMessage(endpoint: ReturnType<typeof createMockEndpoint>, data: any) {
    const event = new MessageEvent('message', { data })
    endpoint.listeners.forEach(listener => listener(event))
  }

  it('should only receive messages for its specific channel', () => {
    const sharedEndpoint = createMockEndpoint()
    
    const channel1 = createChannel(sharedEndpoint, 'channel1')
    const channel2 = createChannel(sharedEndpoint, 'channel2')
    
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    channel1.addEventListener('message', listener1)
    channel2.addEventListener('message', listener2)
    
    // Simulate messages for different channels
    simulateMessage(sharedEndpoint, { channel: 'channel1', payload: 'hello channel1' })
    simulateMessage(sharedEndpoint, { channel: 'channel2', payload: 'hello channel2' })
    simulateMessage(sharedEndpoint, { channel: 'channel3', payload: 'hello channel3' })
    
    // Check that each listener only received its channel's messages
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener1).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'hello channel1' })
    )
    
    expect(listener2).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'hello channel2' })
    )
  })

  it('should wrap outgoing messages with channel information', () => {
    const sharedEndpoint = createMockEndpoint()
    const channel = createChannel(sharedEndpoint, 'myChannel')
    
    const testData = { foo: 'bar', num: 42 }
    channel.postMessage(testData)
    
    expect(sharedEndpoint.lastMessage).toEqual({
      channel: 'myChannel',
      payload: testData
    })
  })

  it('should support numeric channel names', () => {
    const sharedEndpoint = createMockEndpoint()
    const channel = createChannel(sharedEndpoint, 123)
    
    const listener = vi.fn()
    channel.addEventListener('message', listener)
    
    // Send message with numeric channel
    simulateMessage(sharedEndpoint, { channel: 123, payload: 'numeric channel' })
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'numeric channel' })
    )
  })

  it('should allow multiple listeners on the same channel', () => {
    const sharedEndpoint = createMockEndpoint()
    const channel = createChannel(sharedEndpoint, 'multi')
    
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const listener3 = vi.fn()
    
    channel.addEventListener('message', listener1)
    channel.addEventListener('message', listener2)
    channel.addEventListener('message', listener3)
    
    simulateMessage(sharedEndpoint, { channel: 'multi', payload: 'broadcast' })
    
    expect(listener1).toHaveBeenCalledWith(expect.objectContaining({ data: 'broadcast' }))
    expect(listener2).toHaveBeenCalledWith(expect.objectContaining({ data: 'broadcast' }))
    expect(listener3).toHaveBeenCalledWith(expect.objectContaining({ data: 'broadcast' }))
  })

  it('should properly remove listeners', () => {
    const sharedEndpoint = createMockEndpoint()
    const channel = createChannel(sharedEndpoint, 'remove-test')
    
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    channel.addEventListener('message', listener1)
    channel.addEventListener('message', listener2)
    
    // Remove one listener
    channel.removeEventListener('message', listener1)
    
    simulateMessage(sharedEndpoint, { channel: 'remove-test', payload: 'after removal' })
    
    expect(listener1).not.toHaveBeenCalled()
    expect(listener2).toHaveBeenCalledWith(expect.objectContaining({ data: 'after removal' }))
  })

  it('should handle multiple channels on the same endpoint without interference', () => {
    const sharedEndpoint = createMockEndpoint()
    
    const channels = [
      createChannel(sharedEndpoint, 'api'),
      createChannel(sharedEndpoint, 'logging'),
      createChannel(sharedEndpoint, 'metrics'),
      createChannel(sharedEndpoint, 42)
    ]
    
    const listeners = channels.map(() => vi.fn())
    channels.forEach((channel, i) => {
      channel.addEventListener('message', listeners[i])
    })
    
    // Send many messages to different channels
    simulateMessage(sharedEndpoint, { channel: 'api', payload: { method: 'get', path: '/users' } })
    simulateMessage(sharedEndpoint, { channel: 'logging', payload: { level: 'info', msg: 'test' } })
    simulateMessage(sharedEndpoint, { channel: 'unknown', payload: 'should be ignored' })
    simulateMessage(sharedEndpoint, { channel: 42, payload: { count: 100 } })
    simulateMessage(sharedEndpoint, { channel: 'metrics', payload: { cpu: 0.5, memory: 0.8 } })
    
    // Verify each channel only received its messages
    expect(listeners[0]).toHaveBeenCalledTimes(1)
    expect(listeners[0]).toHaveBeenCalledWith(
      expect.objectContaining({ data: { method: 'get', path: '/users' } })
    )
    
    expect(listeners[1]).toHaveBeenCalledTimes(1)
    expect(listeners[1]).toHaveBeenCalledWith(
      expect.objectContaining({ data: { level: 'info', msg: 'test' } })
    )
    
    expect(listeners[2]).toHaveBeenCalledTimes(1)
    expect(listeners[2]).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cpu: 0.5, memory: 0.8 } })
    )
    
    expect(listeners[3]).toHaveBeenCalledTimes(1)
    expect(listeners[3]).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 100 } })
    )
  })

  it('should ignore messages without channel information', () => {
    const sharedEndpoint = createMockEndpoint()
    const channel = createChannel(sharedEndpoint, 'filtered')
    
    const listener = vi.fn()
    channel.addEventListener('message', listener)
    
    // Send various invalid messages
    simulateMessage(sharedEndpoint, null)
    simulateMessage(sharedEndpoint, undefined)
    simulateMessage(sharedEndpoint, 'plain string')
    simulateMessage(sharedEndpoint, 123)
    simulateMessage(sharedEndpoint, { someData: 'no channel field' })
    
    expect(listener).not.toHaveBeenCalled()
  })

  it('should handle edge cases for channel names', () => {
    const sharedEndpoint = createMockEndpoint()
    
    // Test various channel name types
    const edgeCases = [
      '',              // empty string
      0,               // zero
      -1,              // negative number
      'channel-with-special-chars!@#$%',
      'very long channel name '.repeat(100)
    ]
    
    edgeCases.forEach(channelName => {
      const channel = createChannel(sharedEndpoint, channelName)
      const listener = vi.fn()
      channel.addEventListener('message', listener)
      
      simulateMessage(sharedEndpoint, { channel: channelName, payload: `test ${channelName}` })
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ data: `test ${channelName}` })
      )
    })
  })
})