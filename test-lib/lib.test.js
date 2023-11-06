import { describe, test, expect } from 'vitest'
import cp from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('lib', () => {
  test('should load the library using CJS', async () => {
    const filename = join(__dirname, 'apps/cjsApp.cjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
  })

  test('should load the library using ESM', async () => {
    const filename = join(__dirname, 'apps/esmApp.mjs')
    const result = await run(`node ${filename}`)
    expect(result).toBe('{"name": "John"}\n')
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
    cp.exec(command, function (error, result) {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}
