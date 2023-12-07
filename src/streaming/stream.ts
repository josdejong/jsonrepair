import { Transform } from 'node:stream'
import { jsonrepairCore } from './core.js'

export interface JsonRepairTransformOptions {
  chunkSize?: number
  bufferSize?: number
}

export function jsonrepairTransform(options?: JsonRepairTransformOptions): Transform {
  const repair = jsonrepairCore({
    onData: (chunk) => transform.push(chunk),
    bufferSize: options?.bufferSize,
    chunkSize: options?.chunkSize
  })

  const transform = new Transform({
    transform(chunk, encoding, callback) {
      try {
        repair.transform(chunk.toString())
      } catch (err) {
        this.emit('error', err)
      } finally {
        callback()
      }
    },

    flush(callback) {
      try {
        repair.flush()
      } catch (err) {
        this.emit('error', err)
      } finally {
        callback()
      }
    }
  })

  return transform
}
