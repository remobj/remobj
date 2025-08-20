# Performance Comparison: RemObj vs Raw MessageChannel

## Executive Summary

Comparing RemObj RPC performance against raw MessageChannel baseline in Node.js.

## Key Findings

### 1. **Channel Creation Overhead**

| Metric | Raw MessageChannel | RemObj | Overhead |
|--------|-------------------|---------|----------|
| New Channel + Call | 0.047ms | 30ms | **638x** |
| Reused Channel | 0.016ms | 0.6ms | **37.5x** |

### 2. **Breakdown of RemObj Overhead**

The 30ms initial call includes:
- MessageChannel creation: ~0.05ms
- Multiplexing setup: ~0.07ms (from benchmark)
- Proxy creation: ~0.01ms
- **Unknown overhead: ~29.87ms** 🚨

### 3. **Reused Channel Performance**

| Operation | Raw | RemObj | Overhead Factor |
|-----------|-----|---------|-----------------|
| Simple call | 16μs | 600μs | 37.5x |
| After warmup | 16μs | 200μs | 12.5x |

### 4. **Where Time is Spent (per call)**

Raw MessageChannel (16μs):
- Message serialization: ~2μs
- Event loop scheduling: ~10μs
- Handler execution: ~4μs

RemObj (600μs):
- Raw message passing: ~16μs (2.7%)
- Serialization/wrapping: ~100μs (16.7%)
- Proxy handling: ~50μs (8.3%)
- Multiplexing: ~50μs (8.3%)
- **Unknown overhead: ~384μs (64%)** 🚨

## Conclusions

1. **RemObj has 37.5x overhead on reused channels**
   - This is significant but may be acceptable for the features provided

2. **Initial connection has massive 638x overhead**
   - The 30ms delay is problematic for short-lived connections
   - Need to investigate what causes this delay

3. **64% of per-call time is unaccounted for**
   - Suggests optimization opportunities
   - Likely in promise creation, UUID generation, or message routing

## Recommendations

1. **Profile the 30ms initial delay** - This is the biggest issue
2. **Optimize the hot path** - 600μs per call can be improved
3. **Consider connection pooling** for short-lived use cases
4. **Batch operations** when possible to amortize overhead