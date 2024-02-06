import { Transform } from 'node:stream'
import { jsonrepairGenerator } from './generator.js'

export interface JsonRepairTransformOptions {
  chunkSize?: number
  bufferSize?: number
}

/**
 * FIXME: The generator version does not actually limit memory, and is very slow.
 *  Figure out why.
 */
export function jsonrepairGeneratorTransform(options?: JsonRepairTransformOptions): Transform {
  const repair = jsonrepairGenerator({
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
