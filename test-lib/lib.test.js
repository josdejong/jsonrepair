import cp from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('lib', () => {
  test('should load the library using CJS', async () => {
    const filename = join(__dirname, 'apps/cjsApp.cjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
  })

  test('should load the library using CJS (streaming)', async () => {
    const filename = join(__dirname, 'apps/cjsAppStreaming.cjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}')
  })

  test('should load the library using ESM', async () => {
    const filename = join(__dirname, 'apps/esmApp.mjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
  })

  test('should load the library using ESM (streaming)', async () => {
    const filename = join(__dirname, 'apps/esmAppStreaming.mjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}')
  })

  test('should load the library using UMD bundle', async () => {
    const filename = join(__dirname, 'apps/umdApp.cjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
  })

  test('should load the library using minified UMD bundle', async () => {
    const filename = join(__dirname, 'apps/umdAppMin.cjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
  })
})

function run(command) {
  return new Promise((resolve, reject) => {
    cp.exec(command, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}
