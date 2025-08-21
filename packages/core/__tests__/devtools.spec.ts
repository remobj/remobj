import { describe, expect, it, vi } from 'vitest'
import { devtools, setDevtoolsEP } from '../src/devtools'

describe('devtools', () => {
  it('should set devtools endpoint', () => {
    const mockWebSocket = {
      send: vi.fn(),
      close: vi.fn()
    } as unknown as WebSocket

    expect(() => setDevtoolsEP(mockWebSocket)).not.toThrow()
  })

  it('should call devtools with correct parameters', () => {
    const mockWebSocket = {
      send: vi.fn(),
      close: vi.fn()
    } as unknown as WebSocket

    setDevtoolsEP(mockWebSocket)
    
    const traceID = 'test-trace-123:1'
    devtools(traceID, 'in', 'obj123', 'method', 'getData', 'subName', { value: 42 })
    
    if (__DEV__ || __PROD_DEVTOOLS__) {
      expect(mockWebSocket.send).toHaveBeenCalled()
      const callArgs = (mockWebSocket.send as any).mock.calls[0][0]
      const parsed = JSON.parse(callArgs)
      
      expect(parsed).toMatchObject({
        traceID,
        side: 'in',
        objectID: 'obj123',
        type: 'method',
        subName: 'subName',
        data: { value: 42 }
      })
      expect(parsed.realmId).toBeDefined()
      expect(parsed.timeStamp).toBeDefined()
      expect(parsed.date).toBeDefined()
    }
  })

  it('should handle out side devtools call', () => {
    const mockWebSocket = {
      send: vi.fn(),
      close: vi.fn()
    } as unknown as WebSocket

    setDevtoolsEP(mockWebSocket)
    
    const traceID = 'test-trace-456:2'
    devtools(traceID, 'out', 'obj456', 'property', 'name', 'test', 'testData')
    
    if (__DEV__ || __PROD_DEVTOOLS__) {
      expect(mockWebSocket.send).toHaveBeenCalled()
      const callArgs = (mockWebSocket.send as any).mock.calls[0][0]
      const parsed = JSON.parse(callArgs)
      
      expect(parsed).toMatchObject({
        traceID,
        side: 'out',
        objectID: 'obj456',
        type: 'property',
        subName: 'test',
        data: 'testData'
      })
    }
  })

  it('should handle devtools calls without endpoint set', () => {
    // Reset endpoint
    setDevtoolsEP(undefined as any)
    
    // Should not throw even without endpoint
    const traceID = 'test-trace-789:3'
    expect(() => devtools(traceID, 'in', 'obj789', 'method', 'test', 'subtest', null)).not.toThrow()
  })
})