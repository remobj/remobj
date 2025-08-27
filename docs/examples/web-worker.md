# Web Worker Example

This example demonstrates how to use RemObj with Web Workers for offloading CPU-intensive tasks.

## Complete Example

### Project Structure

```
web-worker-example/
├── index.html
├── main.js
├── worker.js
├── types.ts
└── package.json
```

### Shared Types

```typescript
// types.ts
export interface ImageProcessor {
  blur: (imageData: ImageData, radius: number) => Promise<ImageData>
  resize: (imageData: ImageData, width: number, height: number) => Promise<ImageData>
  applyFilter: (imageData: ImageData, filter: Filter) => Promise<ImageData>
  detectEdges: (imageData: ImageData) => Promise<ImageData>
}

export type Filter = 'grayscale' | 'sepia' | 'invert' | 'brightness' | 'contrast'
```

### Worker Implementation

```javascript
// worker.js
import { provide } from '@remobj/core'
import { windowEndpoint } from '@remobj/web'

// Heavy computational functions
function processPixels(data, width, height, processor) {
  const pixels = new Uint8ClampedArray(data)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      processor(pixels, idx, x, y)
    }
  }
  
  return new ImageData(pixels, width, height)
}

const imageProcessor = {
  blur: async (imageData, radius) => {
    // Gaussian blur implementation
    return processPixels(
      imageData.data,
      imageData.width,
      imageData.height,
      (pixels, idx) => {
        // Blur algorithm
      }
    )
  },

  resize: async (imageData, newWidth, newHeight) => {
    // Bilinear interpolation
    const canvas = new OffscreenCanvas(newWidth, newHeight)
    const ctx = canvas.getContext('2d')
    
    const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height)
    const tempCtx = tempCanvas.getContext('2d')
    tempCtx.putImageData(imageData, 0, 0)
    
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)
    return ctx.getImageData(0, 0, newWidth, newHeight)
  },

  applyFilter: async (imageData, filter) => {
    return processPixels(
      imageData.data,
      imageData.width,
      imageData.height,
      (pixels, idx) => {
        const r = pixels[idx]
        const g = pixels[idx + 1]
        const b = pixels[idx + 2]
        
        switch (filter) {
          case 'grayscale': {
            const gray = r * 0.299 + g * 0.587 + b * 0.114
            pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = gray
            break
          }
          case 'sepia': {
            pixels[idx] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
            pixels[idx + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
            pixels[idx + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
            break
          }
          case 'invert': {
            pixels[idx] = 255 - r
            pixels[idx + 1] = 255 - g
            pixels[idx + 2] = 255 - b
            break
          }
        }
      }
    )
  },

  detectEdges: async (imageData) => {
    // Sobel edge detection
    const width = imageData.width
    const height = imageData.height
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    
    // Implementation...
    return imageData
  }
}

// Expose the API
const endpoint = windowEndpoint(self)
provide(imageProcessor, endpoint)

console.log('Image processor worker ready')
```

### Main Application

```javascript
// main.js
import { consume } from '@remobj/core'
import { windowEndpoint } from '@remobj/web'

// Create worker
const worker = new Worker('./worker.js', { type: 'module' })
const endpoint = windowEndpoint(worker)
const processor = consume(endpoint)

// UI setup
const fileInput = document.getElementById('file-input')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const processBtn = document.getElementById('process-btn')
const filterSelect = document.getElementById('filter-select')

let currentImageData = null

// Load image
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const bitmap = await createImageBitmap(file)
  
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  ctx.drawImage(bitmap, 0, 0)
  
  currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
})

// Process image
processBtn.addEventListener('click', async () => {
  if (!currentImageData) return
  
  const startTime = performance.now()
  processBtn.disabled = true
  processBtn.textContent = 'Processing...'
  
  try {
    const filter = filterSelect.value
    
    // Process in worker - UI remains responsive!
    let result = currentImageData
    
    // Apply filter
    if (filter !== 'none') {
      result = await processor.applyFilter(result, filter)
    }
    
    // Apply blur
    if (document.getElementById('blur-check').checked) {
      const radius = parseInt(document.getElementById('blur-radius').value)
      result = await processor.blur(result, radius)
    }
    
    // Detect edges
    if (document.getElementById('edge-check').checked) {
      result = await processor.detectEdges(result)
    }
    
    // Display result
    ctx.putImageData(result, 0, 0)
    
    const elapsed = performance.now() - startTime
    console.log(`Processing completed in ${elapsed.toFixed(2)}ms`)
    
  } catch (error) {
    console.error('Processing failed:', error)
    alert('Failed to process image')
  } finally {
    processBtn.disabled = false
    processBtn.textContent = 'Process Image'
  }
})

// Resize handling
document.getElementById('resize-btn').addEventListener('click', async () => {
  if (!currentImageData) return
  
  const width = parseInt(prompt('New width:', canvas.width))
  const height = parseInt(prompt('New height:', canvas.height))
  
  if (width && height) {
    const resized = await processor.resize(currentImageData, width, height)
    canvas.width = width
    canvas.height = height
    ctx.putImageData(resized, 0, 0)
    currentImageData = resized
  }
})
```

### HTML Interface

```html
<!DOCTYPE html>
<html>
<head>
  <title>RemObj Image Processor</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .controls { margin: 20px 0; }
    canvas { border: 1px solid #ccc; max-width: 100%; }
    button { padding: 10px 20px; margin: 5px; }
    select, input { padding: 5px; margin: 5px; }
  </style>
</head>
<body>
  <h1>Image Processor with Web Workers</h1>
  
  <div class="controls">
    <input type="file" id="file-input" accept="image/*">
    
    <div>
      <label>Filter: 
        <select id="filter-select">
          <option value="none">None</option>
          <option value="grayscale">Grayscale</option>
          <option value="sepia">Sepia</option>
          <option value="invert">Invert</option>
        </select>
      </label>
      
      <label>
        <input type="checkbox" id="blur-check"> Blur
        <input type="range" id="blur-radius" min="1" max="20" value="5">
      </label>
      
      <label>
        <input type="checkbox" id="edge-check"> Detect Edges
      </label>
    </div>
    
    <button id="process-btn">Process Image</button>
    <button id="resize-btn">Resize</button>
  </div>
  
  <canvas id="canvas"></canvas>
  
  <script type="module" src="./main.js"></script>
</body>
</html>
```

## Key Benefits

### 1. Non-Blocking UI
The main thread remains responsive while the worker processes images:

```javascript
// This runs in parallel without freezing the UI
const processed = await processor.blur(largeImage, 10)
```

### 2. Type Safety
With TypeScript, you get full IntelliSense:

```typescript
const processor = consume<ImageProcessor>(endpoint)
// TypeScript knows all available methods and their signatures
```

### 3. Clean Architecture
Separation of concerns - UI logic in main thread, processing in worker:

```javascript
// Main thread - UI only
canvas.onclick = async () => {
  const result = await processor.detectEdges(imageData)
  displayResult(result)
}

// Worker - processing only
const imageProcessor = {
  detectEdges: (data) => {
    // Complex algorithm here
  }
}
```

## Performance Considerations

### Transferable Objects

For large data like ImageData, use transferable objects:

```javascript
// In remobj, large typed arrays are automatically transferred when possible
const result = await processor.processLargeImage(imageBuffer)
// imageBuffer is transferred, not copied
```

### Worker Pool

For multiple concurrent operations:

```javascript
// Create multiple workers
const workers = Array.from({ length: 4 }, () => 
  new Worker('./worker.js', { type: 'module' })
)

const processors = workers.map(w => 
  consume(windowEndpoint(w))
)

// Round-robin distribution
let current = 0
function getProcessor() {
  const processor = processors[current]
  current = (current + 1) % processors.length
  return processor
}

// Use pool
const processor = getProcessor()
const result = await processor.blur(imageData, 5)
```

## Error Handling

```javascript
const processor = consume(endpoint, {
  timeout: 30000, // 30 second timeout for large images
  onError: (error) => {
    console.error('Worker error:', error)
    // Restart worker if needed
    worker.terminate()
    worker = new Worker('./worker.js', { type: 'module' })
    // Re-establish connection...
  }
})
```

## Try It Live

[Open in CodeSandbox](https://codesandbox.io/s/remobj-web-worker-example) | [View on GitHub](https://github.com/remobj/remobj/tree/main/examples/web-worker)