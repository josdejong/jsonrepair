import { strictEqual } from 'assert'
import { textToInputStream } from './stream.js'

describe('streamUtils', () => {
  it('textToReadableStream', () => {
    const stream = textToInputStream('hello world')

    strictEqual(stream.read(5), 'hello')
    strictEqual(stream.read(1), ' ')
    strictEqual(stream.read(5), 'world')
    strictEqual(stream.read(1), null)
  })

  it('textToReadableStream (too large size)', () => {
    const stream = textToInputStream('hello world')

    strictEqual(stream.read(20), 'hello world')
    strictEqual(stream.read(1), null)
  })
})
