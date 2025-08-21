import { describe, expect, it, vi } from 'vitest'
import type { PostMessageEndpoint } from '../src/index';
import { createMultiplexedEndpoint } from '../src/index'
import { removeStackInfo, removeTraceID } from './test-utils'

describe('createMultiplexedEndpoint', () => {
  it('should create a multiplexed endpoint', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    
    expect(mux).toBeDefined()
    expect(mux.postMessage).toBeDefined()
    expect(mux.addEventListener).toBeDefined()
    expect(mux.removeEventListener).toBeDefined()
    expect(mux.createSubChannel).toBeDefined()
  })

  it('should send messages with channel ID', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    const testData = { message: 'test' }
    
    mux.postMessage(testData)
    
    expect(mockEndpoint.postMessage).toHaveBeenCalled()
    const call = mockEndpoint.postMessage.mock.calls[0][0]
    expect(call.channelId).toBe('')
    expect(call.data.message).toBe('test')
    // traceID is added at the wrapper level
    if (__DEV__ || __PROD_DEVTOOLS__) {
      expect(call.data.traceID || call.traceID).toBeDefined()
    }
  })

  it('should create sub-channels', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    const subChannel = mux.createSubChannel('sub1')
    
    expect(subChannel).toBeDefined()
    expect(subChannel.postMessage).toBeDefined()
    
    const testData = { test: 'subchannel' }
    subChannel.postMessage(testData)
    
    expect(mockEndpoint.postMessage).toHaveBeenCalled()
    const call = mockEndpoint.postMessage.mock.calls[0][0]
    expect(call.channelId).toContain('sub1')
    
    // Just check that the data contains our test data
    expect(call.data.test).toBe('subchannel')
  })

  it('should route messages to correct sub-channels', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    
    // Create two sub-channels
    const sub1 = mux.createSubChannel('channel1')
    const sub2 = mux.createSubChannel('channel2')
    
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    sub1.addEventListener('message', listener1)
    sub2.addEventListener('message', listener2)
    
    // Get the main listener
    const mainListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Send message to channel1
    mainListener(new MessageEvent('message', {
      data: { channelId: '/channel1', data: { msg: 'for channel 1' } }
    }))
    
    // Send message to channel2
    mainListener(new MessageEvent('message', {
      data: { channelId: '/channel2', data: { msg: 'for channel 2' } }
    }))
    
    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
    
    // Check the data received (may have traceID added)
    const data1 = listener1.mock.calls[0][0].data
    const data2 = listener2.mock.calls[0][0].data
    expect(data1.msg).toBe('for channel 1')
    expect(data2.msg).toBe('for channel 2')
    
    // Each listener should only receive its own messages
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })

  it('should handle nested sub-channels', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    const sub1 = mux.createSubChannel('level1')
    const sub2 = sub1.createSubChannel('level2')
    
    sub2.postMessage({ nested: 'data' })
    
    // Should send with the sub-channel's ID
    expect(mockEndpoint.postMessage).toHaveBeenCalled()
    const call = mockEndpoint.postMessage.mock.calls[0][0]
    expect(call.channelId).toBeTruthy()
    expect(call.channelId).toContain('level2')
    
    // Check the nested data (may have traceID)
    expect(call.data.nested).toBe('data')
  })

  it('should remove listeners correctly', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    const listener = vi.fn()
    
    mux.addEventListener('message', listener)
    mux.removeEventListener('message', listener)
    
    // Get the main listener
    const mainListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Send a message
    mainListener(new MessageEvent('message', {
      data: { channelId: '', data: { test: 'data' } }
    }))
    
    // Listener should not be called after removal
    expect(listener).not.toHaveBeenCalled()
  })

  it('should close sub-channels', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    const sub = mux.createSubChannel('closeable')
    const listener = vi.fn()
    
    sub.addEventListener('message', listener)
    sub.close()
    
    // Get the main listener
    const mainListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Send message to closed channel
    mainListener(new MessageEvent('message', {
      data: { channelId: 'closeable', data: { test: 'data' } }
    }))
    
    // Should not receive messages after close
    expect(listener).not.toHaveBeenCalled()
  })

  it('should work with MessageChannel', async () => {
    const { port1, port2 } = new MessageChannel()
    
    const mux1 = createMultiplexedEndpoint(port1)
    const mux2 = createMultiplexedEndpoint(port2)
    
    const sub1 = mux1.createSubChannel('test')
    const sub2 = mux2.createSubChannel('test')
    
    const listener = vi.fn()
    sub2.addEventListener('message', listener)
    
    sub1.postMessage({ hello: 'world' })
    
    // Wait for async message
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(listener).toHaveBeenCalled()
    const receivedData = listener.mock.calls[0][0].data
    expect(receivedData.hello).toBe('world')
  })

  it('should handle multiple listeners on same channel', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const mux = createMultiplexedEndpoint(mockEndpoint)
    
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    mux.addEventListener('message', listener1)
    mux.addEventListener('message', listener2)
    
    const mainListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    mainListener(new MessageEvent('message', {
      data: { channelId: '', data: { test: 'data' } }
    }))
    
    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
  })
})