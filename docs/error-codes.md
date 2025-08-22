# Error Codes Reference

This document lists all error codes used in RemObj when running in production mode (`__DEV__ = false`).

## Error Code Mapping

| Code | Location | Description | Development Message |
|------|----------|-------------|-------------------|
| **E001** | `rpc-wrapper.ts:76` | Invalid channel ID type | `Invalid channel ID: expected string, got {type}` |
| **E002** | `rpc-consumer.ts:66` | RPC call timeout | `Promise not resolved after timeout of {timeout} seconds. RequestID: {requestID}` |
| **E003** | `rpc-provider.ts:76` | Invalid RPC message format | `ACCESS DENIED - Data operationType or args.` |
| **E004** | `rpc-provider.ts:89` | Attempt to set root object | `ACCESS DENIED - Root is not settable.` |
| **E005** | `rpc-provider.ts:96` | Access to forbidden property | `ACCESS DENIED - Access to property '{property}' is forbidden` |
| **E006** | *(Reserved)* | - | - |
| **E007** | `rpc-provider.ts:119` | Calling non-function value | `REMOTE IS NOT A FUNCTION - You tried to call a function this is not a function.` |
| **E008** | `rpc-provider.ts:126` | Forbidden property in set operation | `ACCESS DENIED - Access to property '{property}' is forbidden for security reasons` |
| **E009** | `rpc-provider.ts:134` | Write to readonly property | `ACCESS DENIED - WRITE TO READONLY NOT ALLOWED` |
| **E010** | `rpc-provider.ts:137` | Write operation not allowed | `ACCESS DENIED - WRITE NOT ALLOWED` |
| **E011** | `rpc-provider.ts:142` | Unknown RPC operation type | `Unknown operation type: {operationType}` |

## Common Scenarios

### E001 - Invalid Channel ID
Occurs when a non-string value is passed as channel ID during RPC setup.

### E002 - Timeout Error
The remote procedure call didn't respond within the configured timeout (default: 5 minutes).

### E003-E005 - Security Violations
These indicate attempts to access forbidden properties or perform unsafe operations:
- Accessing prototype chain properties
- Modifying the root object
- Invalid message structure

### E007 - Type Mismatch
Attempting to call a property that isn't a function.

### E008-E010 - Write Protection
Various levels of write protection violations:
- Writing to system properties
- Writing to readonly properties  
- General write access denied

### E011 - Protocol Error
The RPC message contains an unknown operation type.

## Debugging Tips

1. **Enable development mode** during debugging to see descriptive error messages
2. **Check the property path** when seeing E003-E005 errors
3. **Verify timeout settings** if encountering E002 frequently
4. **Review security constraints** for E008-E010 write errors

## Security Notes

Error codes E003-E010 are security-related and intentionally vague in production to avoid exposing system internals. These errors typically indicate:
- Attempted prototype pollution attacks
- Access to restricted system properties
- Unauthorized write operations

For development and debugging, set `__DEV__ = true` to get detailed error messages.