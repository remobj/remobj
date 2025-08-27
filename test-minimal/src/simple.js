import { consume, provide } from '@remobj/core'

// Create a MessageChannel for communication
const channel = new MessageChannel()

// Provider side - expose a simple API
const api = {
  add: (a, b) => a + b
}
provide(api, channel.port1)

// Consumer side - call the remote function
const remote = consume(channel.port2)

// Make the call
async function run() {
  const result = await remote.add(5, 7)
  console.log('5 + 7 =', result)
}

run()