import { jsonrepairCore } from './core.js'

export interface JsonRepairOptions {
  chunkSize?: number
  bufferSize?: number
}

/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     try {
 *       const json = "{name: 'John'}"
 *       const repaired = jsonrepair(json)
 *       console.log(repaired)
 *       // '{"name": "John"}'
 *     } catch (err) {
 *       console.error(err)
 *     }
 *
 */
export function jsonrepair(text: string, options?: JsonRepairOptions): string {
  let output = ''

  const { transform, flush } = jsonrepairCore({
    onData: (chunk) => {
      output += chunk
    },
    chunkSize: options?.chunkSize,
    bufferSize: options?.bufferSize
  })

  transform(text)
  flush()

  return output
}
