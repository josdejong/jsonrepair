// Node.js streaming API
import { Transform } from 'node:stream'
import { jsonrepairCore } from './core.js'

export function jsonrepairTransform(): Transform {
  const repair = jsonrepairCore({
    onData: (chunk) => transform.push(chunk)
  })

  const transform = new Transform({
    // TODO: support Buffer and encoding
    transform(data, encoding, callback) {
      repair.transform(data)
      callback()
    },
    flush(callback) {
      repair.flush()
      callback()
    }
  })

  return transform
}
