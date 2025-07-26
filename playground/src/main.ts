import { consume, provide } from '@remobj/core'
import { dataChannelToPostMessage, webSocketToPostMessage } from '@remobj/web'
import { postMessageToStream, streamToPostMessage } from '@remobj/stream'

// =============================================================================
// Utility Functions
// =============================================================================

function updateOutput(elementId: string, message: string, status?: 'connected' | 'disconnected' | 'connecting') {
  const element = document.getElementById(elementId)
  if (!element) return

  const indicator = element.querySelector('.status-indicator')
  if (indicator && status) {
    indicator.className = `status-indicator status-${status}`
  }

  const timestamp = new Date().toLocaleTimeString()
  element.textContent = `[${timestamp}] ${message}`
}

function appendOutput(elementId: string, message: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const timestamp = new Date().toLocaleTimeString()
  element.textContent += `\n[${timestamp}] ${message}`
  element.scrollTop = element.scrollHeight
}

// =============================================================================
// Web Worker Demo
// =============================================================================

interface WorkerAPI {
  add(a: number, b: number): Promise<number>
  fibonacci(n: number): Promise<number>
  findPrimes(max: number): Promise<number[]>
}

let workerAPI: WorkerAPI | null = null

async function initWorker() {
  if (workerAPI) return workerAPI

  try {
    const worker = new Worker('./src/workers/calculator.ts', { type: 'module' })
    workerAPI = consume<WorkerAPI>(worker)
    
    updateOutput('worker-output', 'Worker initialized successfully', 'connected')
    return workerAPI
  } catch (error) {
    updateOutput('worker-output', `Worker initialization failed: ${error}`, 'disconnected')
    throw error
  }
}

// Web Worker Event Handlers
document.getElementById('worker-add')?.addEventListener('click', async () => {
  try {
    const api = await initWorker()
    updateOutput('worker-output', 'Calculating 42 + 58...', 'connecting')
    const result = await api.add(42, 58)
    updateOutput('worker-output', `42 + 58 = ${result}`, 'connected')
  } catch (error) {
    updateOutput('worker-output', `Error: ${error}`, 'disconnected')
  }
})

document.getElementById('worker-fibonacci')?.addEventListener('click', async () => {
  try {
    const api = await initWorker()
    updateOutput('worker-output', 'Calculating fibonacci(25)...', 'connecting')
    const result = await api.fibonacci(25)
    updateOutput('worker-output', `fibonacci(25) = ${result}`, 'connected')
  } catch (error) {
    updateOutput('worker-output', `Error: ${error}`, 'disconnected')
  }
})

document.getElementById('worker-prime')?.addEventListener('click', async () => {
  try {
    const api = await initWorker()
    updateOutput('worker-output', 'Finding primes up to 100...', 'connecting')
    const primes = await api.findPrimes(100)
    updateOutput('worker-output', `Found ${primes.length} primes: [${primes.slice(0, 10).join(', ')}...]`, 'connected')
  } catch (error) {
    updateOutput('worker-output', `Error: ${error}`, 'disconnected')
  }
})

// =============================================================================
// Iframe Communication Demo
// =============================================================================

interface IframeAPI {
  setTheme(theme: 'light' | 'dark'): Promise<void>
  getData(): Promise<{ message: string; timestamp: number }>
  calculate(expression: string): Promise<number>
}

interface ParentAPI {
  showNotification(message: string): Promise<void>
  logMessage(message: string): Promise<void>
}

let iframeAPI: IframeAPI | null = null

// Provide API for iframe to use
const parentAPI: ParentAPI = {
  async showNotification(message: string) {
    appendOutput('iframe-output', `Notification from iframe: ${message}`)
  },
  
  async logMessage(message: string) {
    appendOutput('iframe-output', `Iframe log: ${message}`)
  }
}

// Initialize iframe communication
const iframe = document.getElementById('child-iframe') as HTMLIFrameElement
iframe.addEventListener('load', () => {
  try {
    if (!iframe.contentWindow) throw new Error('No content window')
    
    iframeAPI = consume<IframeAPI>(iframe.contentWindow)
    provide(parentAPI, iframe.contentWindow)
    
    updateOutput('iframe-output', 'Iframe communication established', 'connected')
  } catch (error) {
    updateOutput('iframe-output', `Iframe setup failed: ${error}`, 'disconnected')
  }
})

// Iframe Event Handlers
document.getElementById('iframe-send')?.addEventListener('click', async () => {
  if (!iframeAPI) return
  
  try {
    await parentAPI.showNotification('Hello from parent window!')
    appendOutput('iframe-output', 'Message sent to iframe')
  } catch (error) {
    appendOutput('iframe-output', `Send error: ${error}`)
  }
})

document.getElementById('iframe-request')?.addEventListener('click', async () => {
  if (!iframeAPI) return
  
  try {
    const data = await iframeAPI.getData()
    appendOutput('iframe-output', `Received: ${data.message} (${new Date(data.timestamp).toLocaleTimeString()})`)
  } catch (error) {
    appendOutput('iframe-output', `Request error: ${error}`)
  }
})

document.getElementById('iframe-theme')?.addEventListener('click', async () => {
  if (!iframeAPI) return
  
  try {
    const theme = Math.random() > 0.5 ? 'dark' : 'light'
    await iframeAPI.setTheme(theme)
    appendOutput('iframe-output', `Changed iframe theme to: ${theme}`)
  } catch (error) {
    appendOutput('iframe-output', `Theme change error: ${error}`)
  }
})

// =============================================================================
// WebRTC Demo
// =============================================================================

interface PeerAPI {
  sendMessage(message: string): Promise<void>
  getStats(): Promise<{ sent: number; received: number }>
  echo(message: string): Promise<string>
}

let peerConnection: RTCPeerConnection | null = null
let dataChannel: RTCDataChannel | null = null
let peerAPI: PeerAPI | null = null

async function setupWebRTC() {
  try {
    updateOutput('webrtc-output', 'Setting up WebRTC connection...', 'connecting')
    
    // Create peer connection
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    // Create data channel
    dataChannel = peerConnection.createDataChannel('remobj-demo', {
      ordered: true
    })
    
    // Convert to PostMessage endpoint
    const endpoint = dataChannelToPostMessage(dataChannel)
    
    // Set up API
    let messageCount = 0
    const localAPI: PeerAPI = {
      async sendMessage(message: string) {
        messageCount++
        appendOutput('webrtc-output', `Received: ${message}`)
        document.getElementById('peer-a-info')!.textContent = `Messages sent: ${messageCount}`
      },
      
      async getStats() {
        return { sent: messageCount, received: messageCount }
      },
      
      async echo(message: string) {
        return `Echo: ${message}`
      }
    }
    
    provide(localAPI, endpoint)
    peerAPI = consume<PeerAPI>(endpoint)
    
    // Handle data channel events
    dataChannel.onopen = () => {
      updateOutput('webrtc-output', 'WebRTC data channel opened', 'connected')
      document.getElementById('peer-a-info')!.textContent = 'Connected - Ready to send'
      document.getElementById('peer-b-info')!.textContent = 'Connected - Ready to receive'
    }
    
    dataChannel.onclose = () => {
      updateOutput('webrtc-output', 'WebRTC data channel closed', 'disconnected')
    }
    
    // For demo purposes, simulate a loopback connection
    // In a real app, you'd exchange offers/answers with another peer
    setTimeout(() => {
      if (dataChannel && dataChannel.readyState === 'connecting') {
        // Simulate connection success
        dataChannel.dispatchEvent(new Event('open'))
      }
    }, 1000)
    
  } catch (error) {
    updateOutput('webrtc-output', `WebRTC setup failed: ${error}`, 'disconnected')
  }
}

// WebRTC Event Handlers
document.getElementById('webrtc-connect')?.addEventListener('click', setupWebRTC)

document.getElementById('webrtc-send')?.addEventListener('click', async () => {
  if (!peerAPI || !dataChannel || dataChannel.readyState !== 'open') {
    appendOutput('webrtc-output', 'WebRTC not connected')
    return
  }
  
  try {
    const message = `Hello from ${new Date().toLocaleTimeString()}`
    await peerAPI.sendMessage(message)
    appendOutput('webrtc-output', `Sent: ${message}`)
  } catch (error) {
    appendOutput('webrtc-output', `Send error: ${error}`)
  }
})

document.getElementById('webrtc-stream')?.addEventListener('click', async () => {
  if (!peerAPI || !dataChannel || dataChannel.readyState !== 'open') {
    appendOutput('webrtc-output', 'WebRTC not connected')
    return
  }
  
  try {
    for (let i = 0; i < 5; i++) {
      const echo = await peerAPI.echo(`Message ${i + 1}`)
      appendOutput('webrtc-output', echo)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    appendOutput('webrtc-output', `Stream error: ${error}`)
  }
})

// =============================================================================
// BroadcastChannel Demo
// =============================================================================

interface BroadcastAPI {
  sendGlobalMessage(message: string): Promise<void>
  incrementCounter(): Promise<number>
  getTabId(): Promise<string>
}

const tabId = Math.random().toString(36).substr(2, 9)
let broadcastChannel: BroadcastChannel | null = null
let globalCounter = 0

function initBroadcastChannel() {
  if (broadcastChannel) return

  broadcastChannel = new BroadcastChannel('remobj-demo')
  
  const broadcastAPI: BroadcastAPI = {
    async sendGlobalMessage(message: string) {
      appendOutput('broadcast-output', `Received from another tab: ${message}`)
    },
    
    async incrementCounter() {
      globalCounter++
      appendOutput('broadcast-output', `Counter incremented to: ${globalCounter}`)
      return globalCounter
    },
    
    async getTabId() {
      return tabId
    }
  }
  
  // Note: BroadcastChannel doesn't directly support PostMessage protocol
  // This is a simplified demo showing the concept
  broadcastChannel.addEventListener('message', (event) => {
    if (event.data.type === 'remobj-message') {
      appendOutput('broadcast-output', `Broadcast received: ${event.data.message}`)
    }
  })
  
  updateOutput('broadcast-output', `BroadcastChannel initialized (Tab: ${tabId})`, 'connected')
}

initBroadcastChannel()

// BroadcastChannel Event Handlers
document.getElementById('broadcast-send')?.addEventListener('click', () => {
  if (!broadcastChannel) return
  
  const message = `Hello from tab ${tabId} at ${new Date().toLocaleTimeString()}`
  broadcastChannel.postMessage({
    type: 'remobj-message',
    message: message
  })
  appendOutput('broadcast-output', `Broadcast sent: ${message}`)
})

document.getElementById('broadcast-counter')?.addEventListener('click', () => {
  if (!broadcastChannel) return
  
  globalCounter++
  const message = `Counter: ${globalCounter} (from tab ${tabId})`
  broadcastChannel.postMessage({
    type: 'remobj-message',
    message: message
  })
  appendOutput('broadcast-output', `Counter incremented and broadcast: ${globalCounter}`)
})

document.getElementById('broadcast-new-tab')?.addEventListener('click', () => {
  window.open(window.location.href, '_blank')
  appendOutput('broadcast-output', 'New tab opened - try the broadcast features!')
})

// =============================================================================
// ServiceWorker Demo
// =============================================================================

interface ServiceWorkerAPI {
  cacheResources(urls: string[]): Promise<void>
  backgroundSync(data: any): Promise<void>
  getStatus(): Promise<{ registered: boolean; active: boolean }>
}

let serviceWorkerAPI: ServiceWorkerAPI | null = null

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    updateOutput('sw-output', 'ServiceWorker not supported', 'disconnected')
    return
  }

  try {
    updateOutput('sw-output', 'Registering ServiceWorker...', 'connecting')
    
    const registration = await navigator.serviceWorker.register('./src/workers/service-worker.ts')
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready
    
    if (registration.active) {
      serviceWorkerAPI = consume<ServiceWorkerAPI>(registration.active)
      updateOutput('sw-output', 'ServiceWorker registered and active', 'connected')
    }
  } catch (error) {
    updateOutput('sw-output', `ServiceWorker registration failed: ${error}`, 'disconnected')
  }
}

// ServiceWorker Event Handlers
document.getElementById('sw-register')?.addEventListener('click', registerServiceWorker)

document.getElementById('sw-cache')?.addEventListener('click', async () => {
  if (!serviceWorkerAPI) {
    appendOutput('sw-output', 'ServiceWorker not registered')
    return
  }
  
  try {
    const urls = ['/', '/src/main.ts', '/iframe-child.html']
    await serviceWorkerAPI.cacheResources(urls)
    appendOutput('sw-output', `Cached ${urls.length} resources`)
  } catch (error) {
    appendOutput('sw-output', `Cache error: ${error}`)
  }
})

document.getElementById('sw-sync')?.addEventListener('click', async () => {
  if (!serviceWorkerAPI) {
    appendOutput('sw-output', 'ServiceWorker not registered')
    return
  }
  
  try {
    const data = { action: 'sync', timestamp: Date.now() }
    await serviceWorkerAPI.backgroundSync(data)
    appendOutput('sw-output', 'Background sync initiated')
  } catch (error) {
    appendOutput('sw-output', `Sync error: ${error}`)
  }
})

// =============================================================================
// Streaming Demo
// =============================================================================

let streamController: AbortController | null = null
let streamActive = false
let streamPaused = false

async function startStream() {
  if (streamActive) return

  streamActive = true
  streamPaused = false
  streamController = new AbortController()
  
  updateOutput('stream-output', 'Starting data stream...', 'connecting')
  
  try {
    // Create a worker for streaming
    const worker = new Worker('./src/workers/stream-worker.ts', { type: 'module' })
    const workerEndpoint = worker
    
    // Convert to stream
    const stream = postMessageToStream(workerEndpoint)
    const reader = stream.getReader()
    
    let itemCount = 0
    const startTime = Date.now()
    
    updateOutput('stream-output', 'Stream started', 'connected')
    
    while (streamActive && !streamController.signal.aborted) {
      if (streamPaused) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      
      const { done, value } = await reader.read()
      
      if (done) break
      
      itemCount++
      const elapsed = (Date.now() - startTime) / 1000
      const rate = Math.round(itemCount / elapsed)
      
      // Update progress
      document.getElementById('stream-items')!.textContent = itemCount.toString()
      document.getElementById('stream-rate')!.textContent = `${rate} items/sec`
      document.getElementById('stream-progress')!.textContent = `${Math.min(100, (itemCount / 1000) * 100).toFixed(1)}%`
      
      if (itemCount % 100 === 0) {
        appendOutput('stream-output', `Processed ${itemCount} items (${rate} items/sec)`)
      }
      
      if (itemCount >= 1000) {
        break
      }
    }
    
    reader.releaseLock()
    updateOutput('stream-output', `Stream completed: ${itemCount} items processed`, 'connected')
    
  } catch (error) {
    updateOutput('stream-output', `Stream error: ${error}`, 'disconnected')
  } finally {
    streamActive = false
  }
}

// Streaming Event Handlers
document.getElementById('stream-start')?.addEventListener('click', startStream)

document.getElementById('stream-pause')?.addEventListener('click', () => {
  if (!streamActive) return
  
  streamPaused = !streamPaused
  const button = document.getElementById('stream-pause') as HTMLButtonElement
  button.textContent = streamPaused ? 'Resume' : 'Pause'
  
  appendOutput('stream-output', streamPaused ? 'Stream paused' : 'Stream resumed')
})

document.getElementById('stream-stop')?.addEventListener('click', () => {
  if (!streamActive) return
  
  streamActive = false
  streamController?.abort()
  
  const button = document.getElementById('stream-pause') as HTMLButtonElement
  button.textContent = 'Pause/Resume'
  
  updateOutput('stream-output', 'Stream stopped', 'disconnected')
  
  // Reset progress
  document.getElementById('stream-items')!.textContent = '0'
  document.getElementById('stream-rate')!.textContent = '0 items/sec'
  document.getElementById('stream-progress')!.textContent = '0%'
})

// =============================================================================
// Initialize
// =============================================================================

console.log('🚀 Remobj Playground initialized')
updateOutput('worker-output', 'Click "Add Numbers" to initialize worker', 'disconnected')
updateOutput('iframe-output', 'Loading iframe...', 'connecting')
updateOutput('webrtc-output', 'Click "Create Connection" to start', 'disconnected')
updateOutput('sw-output', 'Click "Register ServiceWorker" to start', 'disconnected')
updateOutput('stream-output', 'Click "Start Stream" to begin', 'disconnected')