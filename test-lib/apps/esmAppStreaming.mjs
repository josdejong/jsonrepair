import { jsonrepairTransform } from '../../lib/esm/stream.js'
import { Readable } from 'node:stream'

const input = new Readable()
input.push('{name: \'John\'}')
input.push(null)

input
  .pipe(jsonrepairTransform())
  .pipe(process.stdout)
