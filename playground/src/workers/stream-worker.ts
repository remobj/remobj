import { streamToPostMessage } from '@remobj/stream'

// Create a readable stream that generates data
const dataStream = new ReadableStream({
  start(controller) {
    console.log('🌊 Stream worker started')
    
    let counter = 0
    const maxItems = 1000
    
    const generateData = () => {
      if (counter >= maxItems) {
        controller.close()
        return
      }
      
      // Generate some sample data
      const data = {
        id: counter,
        timestamp: Date.now(),
        data: Math.random(),
        message: `Item ${counter + 1} generated at ${new Date().toISOString()}`
      }
      
      controller.enqueue(data)
      counter++
      
      // Schedule next item with some variability
      const delay = 10 + Math.random() * 20 // 10-30ms delay
      setTimeout(generateData, delay)
    }
    
    // Start generating data
    generateData()
  },
  
  cancel() {
    console.log('🌊 Stream worker cancelled')
  }
})

// Convert the stream to PostMessage endpoint
const endpoint = streamToPostMessage(dataStream)

// Forward messages between the stream endpoint and the main thread
self.addEventListener('message', (event) => {
  if (endpoint.postMessage) {
    endpoint.postMessage(event.data)
  }
})

// Handle worker lifecycle
self.addEventListener('error', (error) => {
  console.error('Stream worker error:', error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Stream worker unhandled rejection:', event.reason)
})