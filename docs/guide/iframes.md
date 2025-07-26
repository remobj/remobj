---
title: "Cross-Frame Communication"
description: "Guide to using Remobj for iframe communication"
---

# Cross-Frame Communication

Learn how to use Remobj for secure and type-safe communication between parent windows and iframes.

## Basic Setup

### Parent Window

```typescript
import { provide, consume } from '@remobj/core'

// API for iframe to call
const parentAPI = {
  showNotification: (message: string) => {
    console.log('Notification:', message)
  },
  
  getUserData: async (): Promise<UserData> => {
    return await fetchUserData()
  }
}

// Setup iframe communication
const iframe = document.getElementById('myFrame') as HTMLIFrameElement

// Provide parent API to iframe
provide(parentAPI, iframe.contentWindow!)

// Consume iframe API
interface IframeAPI {
  initialize(): Promise<void>
  processData(data: any[]): Promise<any[]>
}

const iframeAPI = consume<IframeAPI>(iframe.contentWindow!)
```

### Iframe Content

```typescript
import { provide, consume } from '@remobj/core'

// API for parent to call
const iframeAPI = {
  initialize: async (): Promise<void> => {
    await parentAPI.showNotification('Iframe initialized')
  },
  
  processData: async (data: any[]): Promise<any[]> => {
    return data.map(item => processItem(item))
  }
}

// Provide iframe API to parent
provide(iframeAPI, window.parent)

// Consume parent API
interface ParentAPI {
  showNotification(message: string): void
  getUserData(): Promise<UserData>
}

const parentAPI = consume<ParentAPI>(window.parent)
```

## Security Considerations

When working with iframes, security is crucial:

```typescript
// Always validate origins
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-domain.com') {
    return // Ignore messages from untrusted origins
  }
})

// Use same-origin or trusted origins only
const trustedOrigins = [
  'https://app.example.com',
  'https://api.example.com'
]
```

## Next Steps

- [Error Handling](./error-handling) - Handle errors in cross-frame communication
- [Core Concepts](./core-concepts) - Understanding Remobj fundamentals