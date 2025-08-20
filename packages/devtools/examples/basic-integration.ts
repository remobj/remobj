import { getDevTools } from "@remobj/devtools/core-integration"

// Example: Integrating DevTools with RemObj Core

// Get the devtools instance (auto-connects in development)
const devtools = getDevTools()

// Example 1: Log RPC calls
export function logRpcCall(method: string, args: any[], realmId: string, channelId: string) {
  devtools.send({
    type: "rpc-call",
    method,
    args,
    realmId,
    channelId,
    timestamp: Date.now()
  })
}

// Example 2: Log RPC results
export function logRpcResult(method: string, result: any, realmId: string, channelId: string) {
  devtools.send({
    type: "rpc-result",
    method,
    result,
    realmId,
    channelId,
    timestamp: Date.now()
  })
}

// Example 3: Log RPC errors
export function logRpcError(method: string, error: any, realmId: string, channelId: string) {
  devtools.send({
    type: "rpc-error",
    method,
    error: error.message || error,
    stack: error.stack?.split("\n") || [],
    realmId,
    channelId,
    timestamp: Date.now()
  })
}

// Example 4: Log multiplex operations
export function logMultiplexOperation(operation: string, channelId: string, data?: any) {
  devtools.send({
    type: "multiplex",
    data: {
      operation,
      channelId,
      ...data
    },
    timestamp: Date.now()
  })
}

// Example usage in your application:
if (__DEV__) {
  // Log when creating a new channel
  logMultiplexOperation("channel-created", "channel-123", { endpoint: "worker" })
  
  // Log RPC call
  logRpcCall("calculateSum", [5, 10], "realm-main", "channel-123")
  
  // Log RPC result
  logRpcResult("calculateSum", 15, "realm-main", "channel-123")
}