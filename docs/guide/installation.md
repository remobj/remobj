# Installation

## Prerequisites

- Node.js 18.0.0 or higher
- PNPM (recommended) or npm

## Installing RemObj

### Using npm

```bash
npm install @remobj/core
```

### Using PNPM

```bash
pnpm add @remobj/core
```

### Using yarn

```bash
yarn add @remobj/core
```

## Development Installation

If you want to contribute to RemObj or run it locally:

1. Clone the repository:
```bash
git clone <repository-url>
cd remobj
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Package Imports

### All-in-One Import (Recommended)

```typescript
import { add, mul, isNumber } from '@remobj/core'
```

### Individual Package Imports

```typescript
import { add } from '@remobj/add'
import { mul } from '@remobj/mul'
import { isNumber } from '@remobj/shared'
```