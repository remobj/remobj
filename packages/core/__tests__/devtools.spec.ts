import { describe, it, expect, vi } from 'vitest'
import { setDevtoolsEP, devtools } from '../src/devtools'
import { PostMessageEndpoint } from '../src/types'

describe('devtools', () => {
  it('should set devtools endpoint', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    expect(() => setDevtoolsEP(mockEndpoint)).not.toThrow()
  })

  it('should call devtools with correct parameters', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    setDevtoolsEP(mockEndpoint)
    
    devtools('in', 'obj123', 'method', 'getData', { value: 42 })
    
    if (__DEV__ || __PROD_DEVTOOLS__) {
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        side: 'in',
        objectID: 'obj123',
        type: 'method',
        name: 'getData',
        data: { value: 42 }
      })
    }
  })

  it('should handle out side devtools call', () => {
    const mockEndpoint: PostMessageEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    setDevtoolsEP(mockEndpoint)
    
    devtools('out', 'obj456', 'property', 'name', 'test')
    
    if (__DEV__ || __PROD_DEVTOOLS__) {
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        side: 'out',
        objectID: 'obj456',
        type: 'property',
        name: 'name',
        data: 'test'
      })
    }
  })

  it('should handle devtools calls without endpoint set', () => {
    // Reset endpoint
    setDevtoolsEP(undefined as any)
    
    // Should not throw
    expect(() => devtools('in', 'obj789', 'method', 'test', null)).not.toThrow()
  })
})