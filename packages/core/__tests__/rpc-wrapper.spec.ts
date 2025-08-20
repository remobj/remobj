import { describe, it, expect } from 'vitest'
import { createArgumentWrappingEndpoint } from '../src/rpc-wrapper'
import { PostMessageEndpoint } from '../src/types'

describe('rpc-wrapper', () => {
  it('should create argument wrapping endpoint', () => {
    const mockChannel = {
      postMessage: (data: any) => {},
      addEventListener: (type: string, listener: any) => {},
      removeEventListener: (type: string, listener: any) => {},
      createSubChannel: (id: string) => mockChannel,
      close: () => {}
    }

    const endpoint = createArgumentWrappingEndpoint(mockChannel)
    expect(endpoint).toBeDefined()
    expect(endpoint.postMessage).toBeInstanceOf(Function)
  })

  it('should handle addEventListener and removeEventListener', () => {
    const mockChannel = {
      postMessage: (data: any) => {},
      addEventListener: (type: string, listener: any) => {},
      removeEventListener: (type: string, listener: any) => {},
      createSubChannel: (id: string) => mockChannel,
      close: () => {}
    }

    const endpoint = createArgumentWrappingEndpoint(mockChannel)
    const listener = () => {}
    
    // Should delegate to underlying channel
    expect(() => {
      endpoint.addEventListener('message', listener)
      endpoint.removeEventListener('message', listener)
    }).not.toThrow()
  })

  it('should handle postMessage', () => {
    let capturedData: any
    const mockChannel = {
      postMessage: (data: any) => { capturedData = data },
      addEventListener: (type: string, listener: any) => {},
      removeEventListener: (type: string, listener: any) => {},
      createSubChannel: (id: string) => mockChannel,
      close: () => {}
    }

    const endpoint = createArgumentWrappingEndpoint(mockChannel)
    
    const testData = {
      type: 'call',
      id: '123',
      method: 'test',
      args: []
    }

    endpoint.postMessage(testData)
    expect(capturedData).toBeDefined()
  })
})