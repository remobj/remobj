import { describe, expect, it, vi } from 'vitest'
import type { PostMessageEndpoint } from '../src/index';
import { wrapPostMessageEndpoint } from '../src/index'
import { removeStackInfo, removeTraceID } from './test-utils'

describe('wrapPostMessageEndpoint', () => {
  it('should wrap a basic endpoint', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const wrapped = wrapPostMessageEndpoint(mockEndpoint)
    
    expect(wrapped).toBeDefined()
    expect(wrapped.postMessage).toBeDefined()
    expect(wrapped.addEventListener).toBeDefined()
    expect(wrapped.removeEventListener).toBeDefined()
  })

  it('should transform outgoing messages', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const outTransform = vi.fn((data) => ({ transformed: data }))
    const wrapped = wrapPostMessageEndpoint(mockEndpoint, outTransform)
    
    const testData = { message: 'test' }
    wrapped.postMessage(testData)
    
    expect(outTransform).toHaveBeenCalledWith(testData)
    expect(mockEndpoint.postMessage).toHaveBeenCalled()
    const call = mockEndpoint.postMessage.mock.calls[0][0]
    // Remove traceID before comparison
    const cleanCall = removeTraceID(call)
    expect(cleanCall).toEqual({ transformed: { message: 'test' } })
  })

  it('should transform incoming messages', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const inTransform = vi.fn((data) => ({ transformed: data }))
    const wrapped = wrapPostMessageEndpoint(mockEndpoint, undefined, inTransform)
    
    const listener = vi.fn()
    wrapped.addEventListener('message', listener)
    
    // Get the actual listener that was registered
    const registeredListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Simulate incoming message
    const event = new MessageEvent('message', { data: { original: 'data' } })
    registeredListener(event)
    
    // Transform was called with data that includes traceID
    const transformCallArg = inTransform.mock.calls[0][0]
    const cleanTransformArg = removeTraceID(transformCallArg)
    expect(cleanTransformArg).toEqual({ original: 'data' })
    expect(listener).toHaveBeenCalled()
    const receivedEvent = listener.mock.calls[0][0]
    // Remove traceID before comparison
    const cleanData = removeTraceID(receivedEvent.data)
    expect(cleanData).toEqual({ transformed: { original: 'data' } })
  })

  it('should handle both transforms', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const outTransform = vi.fn((data) => ({ out: data }))
    const inTransform = vi.fn((data) => ({ in: data }))
    const wrapped = wrapPostMessageEndpoint(mockEndpoint, outTransform, inTransform)
    
    // Test outgoing
    wrapped.postMessage({ test: 'out' })
    expect(mockEndpoint.postMessage).toHaveBeenCalled()
    const sentData = mockEndpoint.postMessage.mock.calls[0][0]
    // Remove traceID before comparison
    const cleanOutData = removeTraceID(sentData)
    expect(cleanOutData).toEqual({ out: { test: 'out' } })
    
    // Test incoming
    const listener = vi.fn()
    wrapped.addEventListener('message', listener)
    const registeredListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    registeredListener(new MessageEvent('message', { data: { test: 'in' } }))
    expect(listener).toHaveBeenCalled()
    const incomingEvent = listener.mock.calls[0][0]
    // Remove traceID before comparison
    const cleanInData = removeTraceID(incomingEvent.data)
    expect(cleanInData).toEqual({ in: { test: 'in' } })
  })

  it('should remove event listeners correctly', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    const wrapped = wrapPostMessageEndpoint(mockEndpoint)
    const listener = vi.fn()
    
    wrapped.addEventListener('message', listener)
    wrapped.removeEventListener('message', listener)
    
    // Get the main listener
    const mainListener = mockEndpoint.addEventListener.mock.calls[0][1]
    
    // Send a message after removal
    mainListener(new MessageEvent('message', {
      data: { test: 'data' }
    }))
    
    // Listener should not be called after removal
    expect(listener).not.toHaveBeenCalled()
  })

  it('should handle MessageChannel ports', () => {
    // This test validates that wrapPostMessageEndpoint works with real MessagePort objects
    const { port1, port2 } = new MessageChannel()
    
    // Should not throw
    expect(() => wrapPostMessageEndpoint(port1)).not.toThrow()
    expect(() => wrapPostMessageEndpoint(port2)).not.toThrow()
  })
})