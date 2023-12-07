import { deepStrictEqual, throws } from 'assert'
import { describe, test } from 'vitest'
import { createOutputBuffer } from './OutputBuffer'

describe('OutputBuffer', () => {
  test('should write chunks into an output buffer', () => {
    const { chunks, buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push('0')
    buffer.push('1')
    buffer.push('2')
    deepStrictEqual(chunks, [])
    buffer.push('3')
    buffer.push('4')
    deepStrictEqual(chunks, ['01'])
    buffer.push('5')
    deepStrictEqual(chunks, ['01', '23'])
    buffer.push('6')
    buffer.flush()
    deepStrictEqual(chunks, ['01', '23', '45', '6'])
  })

  test('should push to the output buffer', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('test')
    buffer.flush()
    deepStrictEqual(chunks, ['test'])
  })

  test('should get current length', () => {
    const { buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push(':) ')
    deepStrictEqual(buffer.length(), 3)

    buffer.push('hello world')
    deepStrictEqual(buffer.length(), 14)
  })

  test('should unshift', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('hello world')
    buffer.unshift(':) ')
    buffer.flush()
    deepStrictEqual(chunks, [':) hello world'])
  })

  test('should throw when it cannot unshift', () => {
    const { chunks, buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push('hello world')
    throws(
      () => buffer.unshift(':) '),
      /Error: Cannot unshift: start of the output is already flushed from the buffer/
    )
    buffer.flush()
    deepStrictEqual(chunks, ['he', 'll', 'o ', 'wo', 'rl', 'd'])
  })

  test('should remove without end', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('hello world')
    buffer.remove(5)
    buffer.flush()
    deepStrictEqual(chunks, ['hello'])
  })

  test('should remove with end', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('how are you doing?')
    buffer.remove(4, 8)
    buffer.flush()
    deepStrictEqual(chunks, ['how you doing?'])
  })

  // TODO: TEST stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void
  // TODO: TEST insertBeforeLastWhitespace: (textToInsert: string) => void
  // TODO: TEST endsWithCommaOrNewline: () => boolean
  // TODO: TEST length: () => number
  // TODO: TEST close: () => void
})

function testOutputBuffer(options?: { chunkSize: number; bufferSize: number }) {
  const chunks: string[] = []
  const buffer = createOutputBuffer({
    write: (chunk) => {
      chunks.push(chunk)
    },
    ...options
  })

  return { chunks, buffer }
}
