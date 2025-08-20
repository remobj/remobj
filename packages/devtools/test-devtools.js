import { WebSocket } from 'ws'

// Connect to devtools server on core port
const ws = new WebSocket('ws://localhost:3333')

ws.on('open', () => {
  console.log('Connected to devtools server')
  
  // Send test messages with new structure
  const testMessages = [
    // First trace - consumer side
    {
      traceID: 'trace-001',
      side: 'consumer',
      objectID: 'obj-consumer-123',
      realmId: 'realm-456',
      type: 'call',
      subName: 'getUserData',
      data: { userId: 42 },
      timeStamp: performance.now(),
      date: new Date().toISOString()
    },
    // First trace - provider side
    {
      traceID: 'trace-001',
      side: 'provider',
      objectID: 'obj-provider-789',
      realmId: 'realm-456',
      type: 'receive',
      subName: 'getUserData',
      data: { userId: 42, processing: true },
      timeStamp: performance.now() + 10,
      date: new Date().toISOString()
    },
    // First trace - provider response
    {
      traceID: 'trace-001',
      side: 'provider',
      objectID: 'obj-provider-789',
      realmId: 'realm-456',
      type: 'response',
      subName: 'getUserData',
      data: { result: { id: 42, name: 'John Doe', email: 'john@example.com' } },
      timeStamp: performance.now() + 50,
      date: new Date().toISOString()
    },
    // First trace - consumer receives response
    {
      traceID: 'trace-001',
      side: 'consumer',
      objectID: 'obj-consumer-123',
      realmId: 'realm-456',
      type: 'return',
      subName: 'getUserData',
      data: { result: { id: 42, name: 'John Doe', email: 'john@example.com' } },
      timeStamp: performance.now() + 60,
      date: new Date().toISOString()
    },
    // Second trace - different operation
    {
      traceID: 'trace-002',
      side: 'consumer',
      objectID: 'obj-consumer-456',
      realmId: 'realm-789',
      type: 'call',
      subName: 'updateSettings',
      data: { theme: 'dark', language: 'en' },
      timeStamp: performance.now() + 100,
      date: new Date().toISOString()
    },
    // Second trace - error case
    {
      traceID: 'trace-002',
      side: 'provider',
      objectID: 'obj-provider-999',
      realmId: 'realm-789',
      type: 'response',
      subName: 'updateSettings',
      data: { error: 'Permission denied', resultType: 'error' },
      timeStamp: performance.now() + 120,
      date: new Date().toISOString()
    }
  ]
  
  // Send messages with delays
  testMessages.forEach((msg, index) => {
    setTimeout(() => {
      ws.send(JSON.stringify(msg))
      console.log(`Sent message ${index + 1}:`, msg.type, msg.subName)
    }, index * 500)
  })
  
  // Close after all messages
  setTimeout(() => {
    ws.close()
    console.log('Test completed')
  }, testMessages.length * 500 + 1000)
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})

ws.on('close', () => {
  console.log('Disconnected from devtools server')
})