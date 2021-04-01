// Only use native node.js API's and references to ./lib here, this file is not transpiled!
const assert = require('assert')
const path = require('path')
const cp = require('child_process')

function run (args, done) {
  cp.exec('node bin/cli.js ' + args, function (e, r) {
    done(e, r)
  })
}

describe('command line interface', function () {
  it('should repair a file', function (done) {
    const file = path.join(__dirname, 'data', 'invalid.json')

    run('"' + file + '"', function (e, result) {
      const resultWithoutReturn = result.replace(/[\n\r]/g, '')

      assert.strictEqual(resultWithoutReturn, '{"hello":"world"}')
      done()
    })
  })
})
