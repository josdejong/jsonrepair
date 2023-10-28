import { strictEqual } from 'assert'
import { jsonRepairProxy } from './jsonRepairProxy.js'
import { createInputProxy, createOutputProxy } from './proxy.js'
import { textToInputStream } from './stream.js'

describe('jsonRepairStream', () => {
  it('', () => {
    const inputText = '"Repair invalid JSON documents"'
    const stream = textToInputStream(inputText)
    let output = ''

    jsonRepairProxy({
      input: createInputProxy({
        read: (size) => {
          return stream.read(size)
        },
        bufferSize: 20,
        chunkSize: 2
      }),
      output: createOutputProxy({
        write: (chunk) => (output += chunk)
      })
    })

    strictEqual(output, inputText)
  })
})
