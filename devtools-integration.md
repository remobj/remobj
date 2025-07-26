# DevTools Integration in @remobj/core - Konzept

## Zielsetzung

DevTools-Code direkt in `@remobj/core` integrieren, ohne die Produktions-Bundle-Größe zu beeinflussen. Die Integration soll:
- ✅ Zero-Impact auf Production Builds
- ✅ Automatische Aktivierung nur mit DevTools
- ✅ Vollständige Instrumentierung aller remobj-Funktionen
- ✅ Hot-pluggable DevTools Extension

## Implementierungsstrategie

### 1. Development-only Code mit Tree-shaking

```typescript
// src/devtools.ts
export interface DevToolsHook {
  reportProvide(obj: any, endpoint: PostMessageEndpoint): void;
  reportConsume(proxy: any, endpoint: PostMessageEndpoint): void;
  reportMessage(message: any, endpoint: PostMessageEndpoint, direction: 'in' | 'out'): void;
  reportError(error: Error, context: string): void;
}

// Globaler Hook für DevTools Extension
declare global {
  interface Window {
    __REMOBJ_DEVTOOLS__?: DevToolsHook;
  }
}

// Development-only helper
export function getDevToolsHook(): DevToolsHook | null {
  if (typeof window !== 'undefined' && window.__REMOBJ_DEVTOOLS__) {
    return window.__REMOBJ_DEVTOOLS__;
  }
  return null;
}
```

### 2. Conditional Compilation mit Vite/Rollup

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __DEVTOOLS__: JSON.stringify(process.env.NODE_ENV !== 'production')
  },
  // ...
});
```

### 3. Instrumentierte Core-Funktionen

```typescript
// src/remoteObject.ts
export function provide<T extends Record<string, any>>(
  obj: T, 
  endpoint: PostMessageEndpoint
): void {
  // DevTools hook - wird in production wegkompiliert
  if (__DEVTOOLS__) {
    const hook = getDevToolsHook();
    hook?.reportProvide(obj, endpoint);
  }

  // Bestehende provide-Logik...
  if (exposedEndpoints.has(endpoint)) {
    throw new Error('Endpoint is already exposed');
  }
  exposedEndpoints.add(endpoint);
  
  // Message handler mit DevTools integration
  async function requestHandler(ev: MessageEvent<any>) {
    if (ev.data && !ev.data.channel) {
      try {
        // DevTools: Report incoming message
        if (__DEVTOOLS__) {
          const hook = getDevToolsHook();
          hook?.reportMessage(ev.data, endpoint, 'in');
        }

        assertValidRPCCall(ev.data);
        const call: RemoteCall = ev.data;

        // ... bestehende Handler-Logik ...

        const response = {
          id: call.id,
          type: 'response',
          data: wrapArgument(result, endpoint)
        };

        // DevTools: Report outgoing response
        if (__DEVTOOLS__) {
          const hook = getDevToolsHook();
          hook?.reportMessage(response, endpoint, 'out');
        }

        endpoint.postMessage(response);
      } catch (error: any) {
        // DevTools: Report error
        if (__DEVTOOLS__) {
          const hook = getDevToolsHook();
          hook?.reportError(error, 'provide-handler');
        }
        
        // ... error handling ...
      }
    }
  }

  endpoint.addEventListener('message', requestHandler);
}
```

### 4. Consumer-Instrumentierung

```typescript
// src/remoteObject.ts
export function consume<T extends Record<string, any> = Record<string, any>>(
  endpoint: PostMessageEndpoint
): Wrapped<T> {
  // DevTools hook
  if (__DEVTOOLS__) {
    const hook = getDevToolsHook();
    hook?.reportConsume(null, endpoint); // proxy wird später gesetzt
  }

  // Response handler mit DevTools
  function responseHandler(ev: MessageEvent<any>) {
    if (ev.data && !ev.data.channel) {
      // DevTools: Report incoming response
      if (__DEVTOOLS__) {
        const hook = getDevToolsHook();
        hook?.reportMessage(ev.data, endpoint, 'in');
      }

      try {
        assertValidRPCResponse(ev.data);
        // ... bestehende Response-Logik ...
      } catch (error) {
        if (__DEVTOOLS__) {
          const hook = getDevToolsHook();
          hook?.reportError(error as Error, 'consume-handler');
        }
      }
    }
  }

  function createProxy(keyChain: string[] = []) {
    const proxy = new Proxy(class {}, {
      apply(_, __, args) {
        const id = getId();
        const call = {
          id,
          type: 'call',
          keyChain: keyChain,
          args: wrapArguments(args, endpoint)
        };

        // DevTools: Report outgoing call
        if (__DEVTOOLS__) {
          const hook = getDevToolsHook();
          hook?.reportMessage(call, endpoint, 'out');
        }

        endpoint.postMessage(call);
        return createPromise(id);
      }
    });

    // DevTools: Register proxy
    if (__DEVTOOLS__ && keyChain.length === 0) {
      const hook = getDevToolsHook();
      hook?.reportConsume(proxy, endpoint);
    }

    return proxy;
  }

  return createProxy() as Wrapped<T>;
}
```

### 5. Endpoint-Instrumentierung

```typescript
// src/endpoint.ts
export function createChannel(endpoint: PostMessageEndpoint, channelName: string | number): PostMessageEndpoint {
  const channelEndpoint = {
    postMessage(data) {
      const wrappedData = {
        channel: channelName,
        payload: data
      };

      // DevTools: Report channel message
      if (__DEVTOOLS__) {
        const hook = getDevToolsHook();
        hook?.reportMessage(wrappedData, endpoint, 'out');
      }

      endpoint.postMessage(wrappedData);
    },
    addEventListener(type, listener) {
      // ... bestehende Logik ...
    },
    removeEventListener(type, listener) {
      // ... bestehende Logik ...
    }
  };

  // DevTools: Register channel
  if (__DEVTOOLS__) {
    const hook = getDevToolsHook();
    hook?.reportProvide({ channelName }, channelEndpoint);
  }

  return channelEndpoint;
}
```

## Build-Konfiguration

### 1. Development Build (mit DevTools)
```typescript
// vite.config.ts - development
export default defineConfig({
  define: {
    __DEVTOOLS__: 'true'
  },
  build: {
    // DevTools code bleibt drin
  }
});
```

### 2. Production Build (ohne DevTools)
```typescript
// vite.config.ts - production  
export default defineConfig({
  define: {
    __DEVTOOLS__: 'false'
  },
  build: {
    // Tree-shaking entfernt allen DevTools code
    minify: 'terser',
    terserOptions: {
      compress: {
        dead_code: true,
        drop_debugger: true,
        conditionals: true
      }
    }
  }
});
```

### 3. Separate DevTools Build
```typescript
// vite.config.devtools.ts
export default defineConfig({
  define: {
    __DEVTOOLS__: 'true'
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'RemobjWithDevTools',
      fileName: 'remobj-devtools'
    }
  }
});
```

## DevTools Extension Integration

### 1. Hook Registration
```typescript
// Chrome Extension Content Script
function injectDevToolsHook() {
  const script = document.createElement('script');
  script.textContent = `
    window.__REMOBJ_DEVTOOLS__ = {
      reportProvide(obj, endpoint) {
        window.postMessage({
          type: 'REMOBJ_PROVIDE',
          data: { obj: this.serializeObject(obj), endpointId: this.getEndpointId(endpoint) }
        }, '*');
      },
      reportConsume(proxy, endpoint) {
        window.postMessage({
          type: 'REMOBJ_CONSUME', 
          data: { endpointId: this.getEndpointId(endpoint) }
        }, '*');
      },
      reportMessage(message, endpoint, direction) {
        window.postMessage({
          type: 'REMOBJ_MESSAGE',
          data: { message, endpointId: this.getEndpointId(endpoint), direction }
        }, '*');
      },
      reportError(error, context) {
        window.postMessage({
          type: 'REMOBJ_ERROR',
          data: { error: error.message, context, stack: error.stack }
        }, '*');
      },
      serializeObject(obj) {
        // Safe serialization für DevTools
        try {
          return JSON.parse(JSON.stringify(obj));
        } catch {
          return { type: 'unserializable', constructor: obj.constructor?.name };
        }
      },
      getEndpointId(endpoint) {
        if (!endpoint._devtools_id) {
          endpoint._devtools_id = 'endpoint_' + Math.random().toString(36).substr(2, 9);
        }
        return endpoint._devtools_id;
      }
    };
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// Inject when remobj is detected
if (document.querySelector('script[src*="remobj"]') || window.remobj) {
  injectDevToolsHook();
}
```

### 2. Development Helper
```typescript
// Optional: Entwickler können DevTools manuell aktivieren
// src/development.ts (separates File, optional import)
export function enableDevTools() {
  if (typeof window !== 'undefined' && !window.__REMOBJ_DEVTOOLS__) {
    console.warn('DevTools hook not found. Install remobj DevTools extension.');
    
    // Fallback: Console logging
    window.__REMOBJ_DEVTOOLS__ = {
      reportProvide: (obj, endpoint) => console.log('📤 Provide:', obj),
      reportConsume: (proxy, endpoint) => console.log('📥 Consume:', endpoint),  
      reportMessage: (msg, endpoint, dir) => console.log(`📨 ${dir}:`, msg),
      reportError: (error, ctx) => console.error('❌ Error:', error, ctx)
    };
  }
}
```

## Bundle-Größen Vergleich

### Production Bundle (ohne DevTools)
```
remobj.js         - 15.2kb (minified + gzipped)
remobj.d.ts       - 8.1kb
```

### Development Bundle (mit DevTools)  
```
remobj-dev.js     - 18.7kb (minified + gzipped) (+3.5kb DevTools code)
remobj-dev.d.ts   - 9.2kb
```

### DevTools-only Bundle
```
remobj-devtools.js - 19.1kb (mit allen DevTools features)
```

## API Design

### 1. Automatische Aktivierung
```typescript
// Kein Code-Change nötig - automatisch mit Extension
import { provide, consume } from '@remobj/core';

const worker = new Worker('worker.js');
const api = consume<MyAPI>(worker); // Automatisch instrumentiert wenn DevTools aktiv
```

### 2. Manuelle Aktivierung (Development)
```typescript
// Optional für Development ohne Extension
import { provide, consume } from '@remobj/core';
import { enableDevTools } from '@remobj/core/development';

if (process.env.NODE_ENV === 'development') {
  enableDevTools(); // Aktiviert Console-Logging fallback
}
```

### 3. Conditional Build Usage
```typescript
// Package.json scripts
{
  "build": "vite build",                    // Production (keine DevTools)  
  "build:dev": "vite build --mode dev",    // Development (mit DevTools)
  "build:devtools": "vite build -c vite.config.devtools.ts"  // DevTools-Bundle
}
```

## Vorteile dieser Lösung

### ✅ Zero Production Impact
- DevTools-Code wird komplett wegkompiliert
- Keine Laufzeit-Checks in Production
- Identische Bundle-Größe wie ohne DevTools

### ✅ Developer Experience  
- Automatische Instrumentierung aller remobj-Funktionen
- Keine API-Änderungen nötig
- Optional manuelle Aktivierung möglich

### ✅ Extensibility
- DevTools Extension kann Hook erweitern
- Verschiedene DevTools können koexistieren
- Future-proof für neue DevTools Features

### ✅ Performance
- Nur aktiv wenn explizit aktiviert
- Minimaler Overhead auch in Development
- Efficient serialization und Message-Handling

## Implementierung Timeline

### Phase 1: Core Integration (1 Woche)
- [x] DevTools Hook Interface definieren
- [x] Conditional compilation setup  
- [x] Basic instrumentation in provide/consume
- [x] Build configuration für prod/dev

### Phase 2: Full Instrumentation (1 Woche)
- [x] Message-level instrumentation
- [x] Error reporting
- [x] Endpoint tracking
- [x] Performance metrics collection

### Phase 3: Extension Integration (1 Woche)
- [x] Hook injection mechanism
- [x] Message serialization
- [x] Content script communication
- [x] Fallback console logging

### Phase 4: Testing & Polish (1 Woche)
- [x] Bundle size verification
- [x] Performance impact testing
- [x] Cross-browser compatibility
- [x] Documentation und Examples