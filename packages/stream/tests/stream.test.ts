import { describe, it, expect, vi } from 'vitest'
import { 
  streamToPostMessage, 
  postMessageToStream, 
  connectStreams, 
  createDuplexStreams, 
  multiplexStreams 
} from '../src/index'

describe('@remobj/stream', () => {
  describe('streamToPostMessage', () => {
    it('should convert stream to PostMessage endpoint', () => {
      const stream = {
        input: new WritableStream(),
        output: new ReadableStream()
      }

      const endpoint = streamToPostMessage(stream)
      
      expect(endpoint).toHaveProperty('postMessage')
      expect(endpoint).toHaveProperty('addEventListener')
      expect(endpoint).toHaveProperty('removeEventListener')
      expect(typeof endpoint.postMessage).toBe('function')
    })
  })

  describe('postMessageToStream', () => {
    it('should convert PostMessage endpoint to stream', () => {
      const mockEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }

      const stream = postMessageToStream(mockEndpoint)
      
      expect(stream).toHaveProperty('input')
      expect(stream).toHaveProperty('output')
      expect(stream.input).toBeInstanceOf(WritableStream)
      expect(stream.output).toBeInstanceOf(ReadableStream)
    })
  })

  describe('createDuplexStreams', () => {
    it('should create two connected streams', () => {
      const [streamA, streamB] = createDuplexStreams()
      
      expect(streamA).toHaveProperty('input')
      expect(streamA).toHaveProperty('output')
      expect(streamB).toHaveProperty('input')
      expect(streamB).toHaveProperty('output')
      
      expect(streamA.input).toBeInstanceOf(WritableStream)
      expect(streamA.output).toBeInstanceOf(ReadableStream)
      expect(streamB.input).toBeInstanceOf(WritableStream)
      expect(streamB.output).toBeInstanceOf(ReadableStream)
    })
  })

  describe('connectStreams', () => {
    it('should return a disconnect function', () => {
      const streamA = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      const streamB = {
        input: new WritableStream(),
        output: new ReadableStream()
      }

      const disconnect = connectStreams(streamA, streamB)
      
      expect(typeof disconnect).toBe('function')
    })
  })

  describe('multiplexStreams', () => {
    it('should create a multiplexed stream from multiple streams', () => {
      const streams = [
        { input: new WritableStream(), output: new ReadableStream() },
        { input: new WritableStream(), output: new ReadableStream() }
      ]

      const multiplexed = multiplexStreams(streams)
      
      expect(multiplexed).toHaveProperty('input')
      expect(multiplexed).toHaveProperty('output')
      expect(multiplexed.input).toBeInstanceOf(WritableStream)
      expect(multiplexed.output).toBeInstanceOf(ReadableStream)
    })

    it('should accept addChannelId parameter', () => {
      const streams = [
        { input: new WritableStream(), output: new ReadableStream() }
      ]

      const multiplexed = multiplexStreams(streams, true)
      
      expect(multiplexed).toHaveProperty('input')
      expect(multiplexed).toHaveProperty('output')
    })
  })
})