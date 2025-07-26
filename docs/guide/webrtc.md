---
title: "WebRTC Integration"
description: "Guide to using Remobj with WebRTC data channels"
---

# WebRTC Integration

Learn how to use Remobj for peer-to-peer communication over WebRTC data channels.

## Basic Setup

Convert WebRTC data channels to PostMessage endpoints:

```typescript
import { provide, consume } from '@remobj/core'
import { dataChannelToPostMessage } from '@remobj/web'

// Create WebRTC connection
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
})

// Create data channel
const dataChannel = peerConnection.createDataChannel('remobj', {
  ordered: true
})

// Convert to PostMessage endpoint
const endpoint = dataChannelToPostMessage(dataChannel)

// Use with Remobj
const peerAPI = {
  sendMessage: (message: string) => {
    console.log('Received message:', message)
  },
  
  shareData: async (data: any[]): Promise<any[]> => {
    return data.map(item => processItem(item))
  }
}

provide(peerAPI, endpoint)

interface RemotePeerAPI {
  sendMessage(message: string): void
  shareData(data: any[]): Promise<any[]>
}

const remotePeer = consume<RemotePeerAPI>(endpoint)
```

## Peer-to-Peer File Sharing

Share files directly between peers:

```typescript
// Sender
const peerAPI = {
  requestFile: async (filename: string): Promise<FileChunk[]> => {
    const file = await getFile(filename)
    const chunks = await chunkFile(file, 16 * 1024) // 16KB chunks
    return chunks
  },
  
  getFileInfo: async (filename: string): Promise<FileInfo> => {
    const file = await getFile(filename)
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  }
}

// Receiver
const fileTransfer = {
  downloadFile: async (filename: string): Promise<File> => {
    const fileInfo = await remotePeer.getFileInfo(filename)
    const chunks = await remotePeer.requestFile(filename)
    
    const blob = new Blob(
      chunks.map(chunk => chunk.data),
      { type: fileInfo.type }
    )
    
    return new File([blob], fileInfo.name)
  }
}
```

## Real-time Collaboration

Implement collaborative features:

```typescript
interface CollaborationAPI {
  sendEdit(edit: DocumentEdit): void
  sendCursor(position: CursorPosition): void
  syncDocument(): Promise<Document>
}

// Collaborative editor
class CollaborativeEditor {
  private remotePeers: RemotePeer[] = []
  
  async addPeer(dataChannel: RTCDataChannel) {
    const endpoint = dataChannelToPostMessage(dataChannel)
    
    const peerAPI = {
      receiveEdit: (edit: DocumentEdit) => {
        this.applyEdit(edit)
      },
      
      receiveCursor: (cursor: CursorPosition, peerId: string) => {
        this.updateCursor(peerId, cursor)
      },
      
      syncDocument: (): Document => {
        return this.getCurrentDocument()
      }
    }
    
    provide(peerAPI, endpoint)
    
    const remotePeer = consume<CollaborationAPI>(endpoint)
    this.remotePeers.push(remotePeer)
    
    // Sync with new peer
    await remotePeer.syncDocument()
  }
  
  private applyEdit(edit: DocumentEdit) {
    this.document.applyEdit(edit)
    
    // Broadcast to other peers
    this.remotePeers.forEach(peer => {
      peer.sendEdit(edit)
    })
  }
}
```

## Stream Over WebRTC

Combine with streaming for continuous data:

```typescript
import { dataChannelToStream } from '@remobj/web'

// Convert data channel to streams
const { readable, writable } = dataChannelToStream(dataChannel)

// Stream large data
const writer = writable.getWriter()

for (const chunk of largeDataChunks) {
  await writer.write(chunk)
  await new Promise(resolve => setTimeout(resolve, 10)) // Rate limiting
}

await writer.close()

// Receive streamed data
const reader = readable.getReader()
const receivedChunks = []

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  receivedChunks.push(value)
}
```

## Next Steps

- [Streaming Data](./streaming) - Advanced streaming techniques
- [Performance Optimization](./performance) - Optimize WebRTC performance