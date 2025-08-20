import { consume, provide } from '@remobj/core'
import { MessageChannel } from 'node:worker_threads'

export const name = 'RPC Throughput Scenarios'

// Simulate a real API
const api = {
  users: {
    get: (id: number) => ({ id, name: `User ${id}`, email: `user${id}@example.com` }),
    list: (limit: number) => Array(limit).fill(0).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`
    })),
    update: (id: number, data: any) => ({ id, ...data, updated: true })
  },
  posts: {
    create: (data: any) => ({ id: Math.random(), ...data, created: new Date() }),
    getComments: (postId: number) => Array(10).fill(0).map((_, i) => ({
      id: i,
      postId,
      text: `Comment ${i}`,
      author: `User ${i}`
    }))
  },
  analytics: {
    track: (event: string, props: any) => ({ success: true, event, props })
  }
}

let port1: any, port2: any, remote: any

// Setup before benchmarks
function setup() {
  const channel = new MessageChannel()
  port1 = channel.port1
  port2 = channel.port2
  provide(api, port1)
  remote = consume<typeof api>(port2)
}

// Benchmark: High frequency simple calls
export async function highFrequencySimple() {
  if (!remote) {setup()}
  
  const promises = []
  for (let i = 0; i < 100; i++) {
    promises.push(remote.users.get(i))
  }
  await Promise.all(promises)
}

// Benchmark: Mixed operation types
export async function mixedOperations() {
  if (!remote) {setup()}
  
  await Promise.all([
    remote.users.get(1),
    remote.users.list(10),
    remote.posts.create({ title: 'Test' }),
    remote.posts.getComments(1),
    remote.analytics.track('view', { page: 'home' })
  ])
}

// Benchmark: Large data transfer
export async function largeDataTransfer() {
  if (!remote) {setup()}
  
  // Get 1000 users
  await remote.users.list(1000)
}

// Benchmark: Nested async operations
export async function nestedAsyncOps() {
  if (!remote) {setup()}
  
  const user = await remote.users.get(1)
  const updated = await remote.users.update(user.id, { active: true })
  const post = await remote.posts.create({ 
    authorId: updated.id,
    title: 'Test Post' 
  })
  await remote.posts.getComments(post.id)
}

// Benchmark: Burst traffic pattern
export async function burstTraffic() {
  if (!remote) {setup()}
  
  // Simulate 3 bursts of 20 requests each
  for (let burst = 0; burst < 3; burst++) {
    const promises = []
    for (let i = 0; i < 20; i++) {
      promises.push(remote.analytics.track('event', { burst, i }))
    }
    await Promise.all(promises)
    // Small delay between bursts
    await new Promise(r => setTimeout(r, 10))
  }
}