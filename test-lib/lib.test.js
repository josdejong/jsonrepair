import { describe, test } from 'vitest'
import { strictEqual } from 'assert'
import cp from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('lib', () => {
  test('should load the library using CJS', () =>
    new Promise((resolve) => {
      const filename = join(__dirname, 'apps/cjsApp.cjs')

      cp.exec(`node ${filename}`, function (error, result) {
        strictEqual(error, null)
        strictEqual(result, '{"name": "John"}\n')
        resolve()
      })
    }))

  test('should load the library using ESM', () =>
    new Promise((resolve) => {
      const filename = join(__dirname, 'apps/esmApp.mjs')

      cp.exec(`node ${filename}`, function (error, result) {
        strictEqual(error, null)
        strictEqual(result, '{"name": "John"}\n')
        resolve()
      })
    }))

  test('should load the library using UMD bundle', () =>
    new Promise((resolve) => {
      const filename = join(__dirname, 'apps/umdApp.cjs')

      cp.exec(`node ${filename}`, function (error, result) {
        strictEqual(error, null)
        strictEqual(result, '{"name": "John"}\n')
        resolve()
      })
    }))

  test('should load the library using minified UMD bundle', () =>
    new Promise((resolve) => {
      const filename = join(__dirname, 'apps/umdAppMin.cjs')

      cp.exec(`node ${filename}`, function (error, result) {
        strictEqual(error, null)
        strictEqual(result, '{"name": "John"}\n')
        resolve()
      })
    }))
})
