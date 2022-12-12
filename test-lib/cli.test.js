// Only use native node.js API's and references to ./lib here, this file is not transpiled!
import { strictEqual } from 'assert'
import cp from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function run (args, done) {
  cp.exec('node bin/cli.js ' + args, function (e, r) {
    done(e, r)
  })
}

describe('command line interface', function () {
  it('should repair a file', function (done) {
    const file = join(__dirname, 'data', 'invalid.json')

    run('"' + file + '"', function (e, result) {
      const resultWithoutReturn = result.replace(/[\n\r]/g, '')

      strictEqual(resultWithoutReturn, '{"hello":"world"}')
      done()
    })
  })
})
