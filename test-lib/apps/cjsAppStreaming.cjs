const { jsonrepairTransform } = require('../../lib/cjs/stream.js')
const { Readable } = require('node:stream')

const input = new Readable()
input.push("{name: 'John'}")
input.push(null)

input.pipe(jsonrepairTransform()).pipe(process.stdout)
