import { jsonrepairTransform } from './transform.js'
export { jsonrepairTransform } from './transform.js'
export { JSONRepairError } from './JSONRepairError.js'

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
export function jsonrepair(text: string): string {
  let output = ''

  const { transform, flush } = jsonrepairTransform({
    onData: (chunk) => {
      output += chunk
    }
  })

  transform(text)
  flush()

  return output
}
