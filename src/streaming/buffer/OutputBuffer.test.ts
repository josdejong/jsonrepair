import { describe, expect, test } from 'vitest'
import { createOutputBuffer } from './OutputBuffer'

describe('OutputBuffer', () => {
  test('should write chunks into an output buffer', () => {
    const { chunks, buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push('0')
    buffer.push('1')
    buffer.push('2')
    expect(chunks).toEqual([])
    buffer.push('3')
    buffer.push('4')
    expect(chunks).toEqual(['01'])
    buffer.push('5')
    expect(chunks).toEqual(['01', '23'])
    buffer.push('6')
    buffer.flush()
    expect(chunks).toEqual(['01', '23', '45', '6'])
  })

  test('should push to the output buffer', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('test')
    buffer.flush()
    expect(chunks).toEqual(['test'])
  })

  test('should get current length', () => {
    const { buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push(':) ')
    expect(buffer.length()).toEqual(3)

    buffer.push('hello world')
    expect(buffer.length()).toEqual(14)
  })

  test('should unshift', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('hello world')
    buffer.unshift(':) ')
    buffer.flush()
    expect(chunks).toEqual([':) hello world'])
  })

  test('should throw when it cannot unshift', () => {
    const { chunks, buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push('hello world')
    expect(() => buffer.unshift(':) ')).toThrow(
      /Cannot unshift: start of the output is already flushed from the buffer/
    )
    buffer.flush()
    expect(chunks).toEqual(['he', 'll', 'o ', 'wo', 'rl', 'd'])
  })

  test('should remove without end', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('hello world')
    buffer.remove(5)
    buffer.flush()
    expect(chunks).toEqual(['hello'])
  })

  test('should remove with end', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('how are you doing?')
    buffer.remove(4, 8)
    buffer.flush()
    expect(chunks).toEqual(['how you doing?'])
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
