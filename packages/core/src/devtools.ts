import { PostMessageEndpoint } from './endpoint';

declare const __DEV__: boolean
declare const __PROD_DEVTOOLS__: boolean

/**
 * Message structure for devtools communication
 * @public
 */
export interface ProxyMessage {
  type: `EP_EVENT_${'send' | 'receive'}`;
  id: string;
  timestamp: number;
  message: any;
  stackTrace?: string;
  messageId?: string;          // ID from the actual message for request/response tracking
  platform?: string;          // Browser UserAgent or Node/Deno/Bun version
  language?: string;           // Programming language (e.g., 'js', 'ts')
}

/**
 * Options for configuring proxy endpoints
 * @public
 */
export interface ProxyEndpointOptions {
  type?: string;
  name?: string;
}

/**
 * Metadata associated with an endpoint
 * @public
 */
export interface EndpointMetadata {
  id: string;
  type?: string;
  name?: string;
  created: number;
}

let monitorEndpoint: PostMessageEndpoint | null = null;

/**
 * Captures current stack trace for debugging purposes
 */
function captureStackTrace(): string | undefined {
  try {
    const error = new Error();
    const stack = error.stack;
    
    if (!stack) return undefined;
    
    // Clean up stack trace - remove devtools internal calls
    const lines = stack.split('\n');
    const relevantLines = lines.filter((line, index) => {
      // Skip Error creation and forwardToMonitor calls
      if (index === 0) return false; // "Error" line
      if (line.includes('forwardToMonitor')) return false;
      if (line.includes('createProxyEndpoint')) return false;
      if (line.includes('messageInterceptor')) return false;
      
      return true;
    });
    
    return relevantLines.join('\n');
  } catch (error) {
    return undefined;
  }
}

/**
 * Detects the current platform (browser UserAgent or Node/Deno/Bun version)
 */
function detectPlatform(): string {
  try {
    // Browser environment
    if (typeof window !== 'undefined' && navigator?.userAgent) {
      return navigator.userAgent;
    }
    
    // Node.js environment
    if (typeof process !== 'undefined' && process.versions?.node) {
      return `Node.js ${process.versions.node}`;
    }
    
    // Deno environment
    if (typeof globalThis !== 'undefined' && 'Deno' in globalThis) {
      const deno = (globalThis as any).Deno;
      return `Deno ${deno.version?.deno || 'unknown'}`;
    }
    
    // Bun environment
    if (typeof globalThis !== 'undefined' && 'Bun' in globalThis) {
      const bun = (globalThis as any).Bun;
      return `Bun ${bun.version || 'unknown'}`;
    }
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

function forwardToMonitor(
  id: string,
  type: 'send' | 'receive',
  message: any
): void {
  if (!monitorEndpoint) {
    console.warn('[Remobj Devtools] No monitor endpoint set. Call setMonitorEndpoint() first.');
    return;
  }

  // Extract message ID from the actual message for request/response tracking
  let messageId: string | undefined;
  if (message && typeof message === 'object' && message.id) {
    messageId = message.id;
  }

  const proxyMessage: ProxyMessage = {
    id,
    type: `EP_EVENT_${type}`,
    timestamp: Date.now(),
    message,
    stackTrace: captureStackTrace(),
    messageId,
    platform: detectPlatform(),
    language: 'js' // Could be enhanced to detect TypeScript
  };
  
  try {
    monitorEndpoint.postMessage(proxyMessage);
  } catch (err) {
    console.error('[Remobj Devtools] Failed to forward message to monitor:', err);
  }
}

/**
 * Sets the monitor endpoint for devtools communication
 * @public
 */
export function setMonitorEndpoint(endpoint: PostMessageEndpoint): void {
  if(!__DEV__ && !__PROD_DEVTOOLS__) return

  monitorEndpoint = endpoint;

  endpoint.addEventListener('message', (ev: MessageEvent) => {
    if (ev.data && typeof ev.data === 'object' && ev.data.type === 'EP_DETECTION_REQUEST') {
      trackedEndpoints.forEach(endpointRef => {
        const endpoint = endpointRef.deref()
        if(endpoint) {
          endpoint.postMessage({
            type: 'EP_DETECTION_REQUEST',
            senderID: endpointIds.get(endpoint)!,
            requestID: ev.data.id,
            senderMeta: endpointMetadata.get(endpoint)
          })
        }
      })
    }
  })
}

const endpointIds = new WeakMap<PostMessageEndpoint, string>()
const endpointMetadata = new WeakMap<PostMessageEndpoint, EndpointMetadata>()
const trackedEndpoints = new Set<WeakRef<PostMessageEndpoint>>()


/**
 * Creates a proxy endpoint that wraps another endpoint for devtools monitoring
 * @public
 */
export function createProxyEndpoint(
  targetEndpoint: PostMessageEndpoint,
  options: ProxyEndpointOptions = {}
): PostMessageEndpoint {
  if(!__DEV__ && !__PROD_DEVTOOLS__) return targetEndpoint

  const endpointId = crypto.randomUUID();
  const metadata: EndpointMetadata = {
    id: endpointId,
    type: options.type,
    name: options.name,
    created: Date.now()
  };

  trackedEndpoints.add(new WeakRef(targetEndpoint))
  endpointIds.set(targetEndpoint, endpointId)
  endpointMetadata.set(targetEndpoint, metadata)

  // Listen to all incoming messages on the target endpoint
  const messageInterceptor = (event: MessageEvent) => {
    forwardToMonitor(endpointId, 'receive', event.data);

    if(event.data && typeof event.data === 'object' && event.data.type === 'EP_DETECTION_REQUEST') {
      const meta = endpointMetadata.get(targetEndpoint)
      const response = {
        senderID: event.data.senderID,
        requestID: event.data.requestID,
        receiverID: endpointId,
        receiverMeta: meta,
        senderMeta: event.data.senderMeta
      }

      monitorEndpoint?.postMessage(response)
    }
  };
  
  targetEndpoint.addEventListener('message', messageInterceptor);

  return {
    postMessage(message: any): void {
      forwardToMonitor(endpointId, 'send', message);
      targetEndpoint.postMessage(message);
    },

    addEventListener(eventType: 'message', listener: EventListener): void {
      targetEndpoint.addEventListener(eventType, listener);
    },

    removeEventListener(eventType: 'message', listener: EventListener): void {
      targetEndpoint.removeEventListener(eventType, listener);
    }
  } as PostMessageEndpoint;
}