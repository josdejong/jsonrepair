import { jsonRepairProxy } from './jsonRepairProxy.js'
import { createInputProxy, createOutputProxy } from './proxy.js'
import { InputStream, OutputStream } from './stream.js'

export function jsonRepairStream({ input, output }: { input: InputStream; output: OutputStream }) {
  jsonRepairProxy({
    input: createInputProxy({
      read: (count) => input.read(count)
    }),
    output: createOutputProxy({
      write: (chunk) => output.write(chunk)
    })
  })
}
