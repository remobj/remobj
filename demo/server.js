import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
};

const server = createServer((req, res) => {
    console.log(`Request: ${req.url}`);
    
    let filePath;
    if (req.url === '/' || req.url === '/demo/' || req.url === '/demo') {
        filePath = join(__dirname, 'index.html');
    } else if (req.url.startsWith('/demo/')) {
        // Handle /demo/* requests
        filePath = join(__dirname, req.url.replace('/demo/', ''));
    } else if (req.url === '/index.js' || req.url === '/index.html') {
        // Handle root level demo files
        filePath = join(__dirname, req.url);
    } else {
        // Handle other files (packages, etc)
        filePath = join(__dirname, '..', req.url);
    }
    
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (err) {
        console.error(`404: ${filePath}`);
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Demo server running at http://localhost:${PORT}/demo/`);
});