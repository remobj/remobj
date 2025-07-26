# Remobj Minimal App - Bundle Size Monitor

This minimal app serves as a bundle size monitor for the remobj library. It creates the smallest possible app using `@remobj/core` to track the library's bundle size over time.

## Features

- **Real-time bundle analysis**: Tracks raw, gzip, and brotli compressed sizes
- **Historical tracking**: Maintains size history for trend analysis
- **CI/CD integration**: Automatic alerts when bundle size increases significantly
- **Detailed reporting**: Generates markdown reports and JSON stats

## Usage

### Local Development

```bash
# Build and analyze bundle size
npm run build:stats

# Just build (without analysis)
npm run build

# Build with bundle analyzer
npm run build:analyze
```

### Bundle Size Reports

After running `npm run build:stats`, you'll find:

- `.bundle-stats/current.json` - Current build statistics
- `.bundle-stats/history.json` - Historical data (last 100 builds)
- `.bundle-stats/report.md` - Markdown report with trends

### CI/CD Integration

The GitHub Action `.github/workflows/bundle-size.yml` automatically:

1. **Monitors every push/PR** for bundle size changes
2. **Fails CI** if bundle size increases more than 10%
3. **Comments on PRs** with detailed size reports
4. **Stores artifacts** for historical comparison

### Current Bundle Size

As of the latest build:
- **Raw**: ~5KB
- **Gzip**: ~2KB  
- **Brotli**: ~1.6KB

This represents the minimal overhead of using remobj for cross-context communication.

## What's Included

The minimal app demonstrates:

```typescript
import { consume, provide } from '@remobj/core'

const mc = new MessageChannel()
provide({ add: (a: number, b: number) => a + b }, mc.port1)
const c = consume<{add(a: number, b: number): number}>(mc.port2)
console.log(await c.add(5,3)) // 8
```

This is the smallest possible remobj implementation, making it perfect for bundle size monitoring.

## Configuration

### Alert Thresholds

Edit `scripts/bundle-stats.js` to adjust the alert threshold:

```javascript
const ALERT_THRESHOLD = 0.1 // 10% increase triggers alert
```

### Build Flags

The minimal app builds with development features disabled:

```javascript
define: {
  __DEV__: false,
  __PROD_DEVTOOLS__: false,
}
```

This ensures the bundle represents production usage.

## Bundle Analysis Tools

- **Rollup Visualizer**: `npm run build:analyze` opens an interactive bundle analyzer
- **Stats Script**: `npm run build:stats` provides detailed size breakdown
- **Historical Tracking**: View trends in `.bundle-stats/history.json`

## Monitoring Strategy

1. **Every commit** to main branch establishes a new baseline
2. **Pull requests** are compared against the target branch baseline  
3. **Significant increases** (>10%) trigger CI failures and require justification
4. **Historical data** helps identify gradual size creep over time

This ensures the remobj library maintains its zero-dependency, minimal footprint promise.