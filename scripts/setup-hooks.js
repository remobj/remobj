#!/usr/bin/env node

import { chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform } from 'node:os'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')
const huskyDir = join(rootDir, '.husky')

async function makeHooksExecutable() {
  // Only needed on Unix-like systems
  if (platform() === 'win32') {
    console.log('✅ Windows detected - no chmod needed')
    return
  }

  const hooks = ['pre-commit', 'commit-msg', 'pre-push']
  
  for (const hook of hooks) {
    const hookPath = join(huskyDir, hook)
    try {
      await chmod(hookPath, 0o755)
      console.log(`✅ Made ${hook} executable`)
    } catch (error) {
      console.warn(`⚠️ Could not chmod ${hook}:`, error.message)
    }
  }
}

makeHooksExecutable().catch(console.error)