import { describe, expect, it } from "vitest"
import { createDevToolsServer } from "../src/index"

describe("devtools", () => {
  it("should create devtools server", () => {
    const server = createDevToolsServer()
    expect(server).toBeDefined()
    expect(server.coreServer).toBeDefined()
    expect(server.clientServer).toBeDefined()
    expect(typeof server.shutdown).toBe("function")
    
    // Clean up
    server.shutdown()
  })
})