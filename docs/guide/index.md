# Getting Started

RemObj is a modern monorepo library scaffolding that demonstrates complex library architecture with proper TypeScript support, build system, and testing infrastructure.

## Installation

```bash
npm install @remobj/core
```

## Basic Usage

```typescript
import { add, mul } from '@remobj/core'

const result = add(2, 3) // 5
const product = mul(4, 5) // 20
```

## Development

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd remobj
npm install
```

Build all packages:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Type check:

```bash
npm run typecheck
```