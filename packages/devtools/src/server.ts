import { createDevToolsServer } from "./index.js"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create DevTools server
const devtools = createDevToolsServer()

// Create HTTP server for client
const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" })
    const html = readFileSync(join(__dirname, "../client/index.html"), "utf8")
    res.end(html)
  } else {
    res.writeHead(404)
    res.end("Not found")
  }
})

httpServer.listen(3335, () => {
  console.log("DevTools client available at: http://localhost:3335")
})

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log(String.raw`\nShutting down DevTools server...`)
  devtools.shutdown()
  httpServer.close()
  process.exit(0)
})