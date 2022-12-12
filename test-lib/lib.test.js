import { strictEqual } from 'assert'
import cp from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('lib', () => {
  it('should load the library using CJS', (done) => {
    const filename = join(__dirname, 'apps/cjsApp.cjs')

    cp.exec(`node ${filename}`, function (error, result) {
      strictEqual(error, null)
      strictEqual(result, '{"name": "John"}\n')
      done()
    })
  })

  it('should load the library using ESM', (done) => {
    const filename = join(__dirname, 'apps/esmApp.mjs')

    cp.exec(`node ${filename}`, function (error, result) {
      strictEqual(error, null)
      strictEqual(result, '{"name": "John"}\n')
      done()
    })
  })

  it('should load the library using UMD bundle', (done) => {
    const filename = join(__dirname, 'apps/umdApp.cjs')

    cp.exec(`node ${filename}`, function (error, result) {
      strictEqual(error, null)
      strictEqual(result, '{"name": "John"}\n')
      done()
    })
  })

  it('should load the library using minified UMD bundle', (done) => {
    const filename = join(__dirname, 'apps/umdAppMin.cjs')

    cp.exec(`node ${filename}`, function (error, result) {
      strictEqual(error, null)
      strictEqual(result, '{"name": "John"}\n')
      done()
    })
  })
})
