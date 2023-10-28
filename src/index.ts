import { jsonRepairProxy as _jsonRepairProxy } from './jsonRepairProxy.js'
import { createOutputProxy, createTextInputProxy } from './proxy.js'
export { jsonRepairProxy } from './jsonRepairProxy.js'
export { jsonRepairStream } from './jsonRepairStream.js'
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

  _jsonRepairProxy({
    input: createTextInputProxy(text),
    output: createOutputProxy({
      write: (text) => {
        output += text
      },
      chunkSize: text.length,
      bufferSize: text.length + 1
    })
  })

  return output
}
