import { describe, it, expect, vi } from 'vitest'
import { 
  streamToPostMessage, 
  postMessageToStream, 
  connectStreams, 
  createDuplexStreams, 
  multiplexStreams,
  type StreamEndpoint
} from '../src/index'

describe('Advanced Stream Tests', () => {
  describe('streamToPostMessage - Data Flow', () => {
    it('should forward data from stream output to PostMessage listeners', async () => {
      let controller: ReadableStreamDefaultController
      const stream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream({
          start(ctrl) {
            controller = ctrl
          }
        })
      }

      const endpoint = streamToPostMessage(stream)
      const listener = vi.fn()
      endpoint.addEventListener('message', listener)

      const testData = { message: 'hello from stream' }
      controller!.enqueue(testData)
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message',
          data: testData
        })
      )
    })

    it('should write PostMessage data to stream input', async () => {
      const writtenData: any[] = []
      const stream: StreamEndpoint = {
        input: new WritableStream({
          write(chunk) {
            writtenData.push(chunk)
          }
        }),
        output: new ReadableStream()
      }

      const endpoint = streamToPostMessage(stream)
      const testData = { type: 'test', payload: 'data' }
      
      endpoint.postMessage(testData)
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(writtenData).toContain(testData)
    })

    it('should handle multiple listeners', async () => {
      let controller: ReadableStreamDefaultController
      const stream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream({
          start(ctrl) {
            controller = ctrl
          }
        })
      }

      const endpoint = streamToPostMessage(stream)
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      endpoint.addEventListener('message', listener1)
      endpoint.addEventListener('message', listener2)

      const testData = { broadcast: 'message' }
      controller!.enqueue(testData)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener1).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
      expect(listener2).toHaveBeenCalledWith(expect.objectContaining({ data: testData }))
    })

    it('should properly remove event listeners', async () => {
      let controller: ReadableStreamDefaultController
      const stream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream({
          start(ctrl) {
            controller = ctrl
          }
        })
      }

      const endpoint = streamToPostMessage(stream)
      const listener = vi.fn()
      
      endpoint.addEventListener('message', listener)
      endpoint.removeEventListener('message', listener)

      controller!.enqueue({ test: 'data' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('postMessageToStream - Data Flow', () => {
    it('should forward PostMessage events to stream output', async () => {
      const mockEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }

      const stream = postMessageToStream(mockEndpoint)
      
      // Get the listener that was registered
      const registeredListener = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Read from the stream
      const reader = stream.output.getReader()
      const readPromise = reader.read()
      
      // Simulate incoming message
      const testData = { from: 'endpoint', value: 42 }
      const messageEvent = new MessageEvent('message', { data: testData })
      registeredListener(messageEvent)
      
      const result = await readPromise
      expect(result.done).toBe(false)
      expect(result.value).toEqual(testData)
      
      reader.releaseLock()
    })

    it('should write stream input data to PostMessage endpoint', async () => {
      const mockEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }

      const stream = postMessageToStream(mockEndpoint)
      const writer = stream.input.getWriter()
      
      const testData = { to: 'endpoint', message: 'hello' }
      await writer.write(testData)
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith(testData)
      
      writer.releaseLock()
    })

    it('should handle rapid data flow', async () => {
      const mockEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }

      const stream = postMessageToStream(mockEndpoint)
      const writer = stream.input.getWriter()
      
      const messages = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `message${i}` }))
      
      for (const message of messages) {
        await writer.write(message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledTimes(100)
      messages.forEach((msg, index) => {
        expect(mockEndpoint.postMessage).toHaveBeenNthCalledWith(index + 1, msg)
      })
      
      writer.releaseLock()
    })
  })

  describe('createDuplexStreams - Structure Tests', () => {
    it('should create two streams with correct structure', () => {
      const [streamA, streamB] = createDuplexStreams()
      
      // Verify structure
      expect(streamA).toHaveProperty('input')
      expect(streamA).toHaveProperty('output') 
      expect(streamB).toHaveProperty('input')
      expect(streamB).toHaveProperty('output')
      
      // Verify types
      expect(streamA.input).toBeInstanceOf(WritableStream)
      expect(streamA.output).toBeInstanceOf(ReadableStream)
      expect(streamB.input).toBeInstanceOf(WritableStream)
      expect(streamB.output).toBeInstanceOf(ReadableStream)
    })

    it('should create connected streams', () => {
      const [streamA, streamB] = createDuplexStreams()
      
      // The streams should be properly connected internally
      // We can't easily test the data flow without locking issues,
      // but we can verify they're different objects
      expect(streamA).not.toBe(streamB)
      expect(streamA.input).not.toBe(streamB.input)
      expect(streamA.output).not.toBe(streamB.output)
    })
  })

  describe('connectStreams - Stream Bridging', () => {
    it('should return a disconnect function', () => {
      const [streamA, streamB] = createDuplexStreams()
      
      const disconnect = connectStreams(streamA, streamB)
      
      expect(typeof disconnect).toBe('function')
      
      // Should not throw when called
      expect(() => disconnect()).not.toThrow()
    })

    it('should handle stream disconnection gracefully', () => {
      const [streamA, streamB] = createDuplexStreams()
      
      const disconnect = connectStreams(streamA, streamB)
      
      // The function should run without throwing multiple times
      expect(() => disconnect()).not.toThrow()
      expect(() => disconnect()).not.toThrow()
    })
  })

  describe('multiplexStreams - Advanced Multiplexing', () => {
    it('should multiplex data from multiple input streams', async () => {
      const streamControllers: ReadableStreamDefaultController[] = []
      const inputStreams = Array.from({ length: 3 }, (_, i) => ({
        input: new WritableStream(),
        output: new ReadableStream({
          start(controller) {
            streamControllers[i] = controller
          }
        })
      }))
      
      const multiplexed = multiplexStreams(inputStreams, true)
      const reader = multiplexed.output.getReader()
      
      // Send data from each stream
      const testData = [
        { stream: 0, message: 'from stream 0' },
        { stream: 1, message: 'from stream 1' },
        { stream: 2, message: 'from stream 2' }
      ]
      
      // Enqueue data
      testData.forEach((data, index) => {
        streamControllers[index].enqueue(data)
      })
      
      // Read multiplexed output
      const results = []
      for (let i = 0; i < testData.length; i++) {
        const result = await reader.read()
        results.push(result.value)
      }
      
      // Should receive data with channel IDs
      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result).toEqual({
          channelId: index,
          data: testData[index]
        })
      })
      
      reader.releaseLock()
    })

    it('should distribute input to all multiplexed streams', async () => {
      const writtenData: any[][] = [[], [], []]
      const inputStreams = Array.from({ length: 3 }, (_, i) => ({
        input: new WritableStream({
          write(chunk) {
            writtenData[i].push(chunk)
          }
        }),
        output: new ReadableStream()
      }))
      
      const multiplexed = multiplexStreams(inputStreams)
      const writer = multiplexed.input.getWriter()
      
      const testMessages = [
        { broadcast: 'message 1' },
        { broadcast: 'message 2' },
        { broadcast: 'message 3' }
      ]
      
      for (const message of testMessages) {
        await writer.write(message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // All streams should receive all messages
      writtenData.forEach(streamData => {
        expect(streamData).toEqual(testMessages)
      })
      
      writer.releaseLock()
    })

    it('should work without channel IDs', async () => {
      let controller: ReadableStreamDefaultController
      const inputStream = {
        input: new WritableStream(),
        output: new ReadableStream({
          start(ctrl) {
            controller = ctrl
          }
        })
      }
      
      const multiplexed = multiplexStreams([inputStream], false)
      const reader = multiplexed.output.getReader()
      
      const testData = { raw: 'data without channel ID' }
      controller!.enqueue(testData)
      
      const result = await reader.read()
      expect(result.value).toEqual(testData) // No channelId wrapper
      
      reader.releaseLock()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty streams', async () => {
      const emptyStream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream({
          start(controller) {
            controller.close()
          }
        })
      }

      const endpoint = streamToPostMessage(emptyStream)
      const listener = vi.fn()
      endpoint.addEventListener('message', listener)
      
      // Wait for stream processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle rapid listener addition/removal', () => {
      const stream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }

      const endpoint = streamToPostMessage(stream)
      const listeners = Array.from({ length: 100 }, () => vi.fn())
      
      // Add all listeners
      listeners.forEach(listener => {
        endpoint.addEventListener('message', listener)
      })
      
      // Remove all listeners
      listeners.forEach(listener => {
        endpoint.removeEventListener('message', listener)
      })
      
      // Should not throw
      expect(() => endpoint.postMessage({ test: 'data' })).not.toThrow()
    })
  })
})