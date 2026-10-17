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

  test('should insert at an index', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('how you doing?')
    buffer.insertAt(4, 'are ')
    buffer.flush()
    expect(chunks).toEqual(['how are you doing?'])
  })

  test('should strip the last occurrence', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('[1,2,3,')
    buffer.push('  ')
    buffer.stripLastOccurrence(',')
    buffer.flush()
    expect(chunks).toEqual(['[1,2,3  '])
  })

  test('should strip the last occurrence and the remaining text', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('"hello" + "world"')
    buffer.stripLastOccurrence('"', true)
    buffer.flush()
    expect(chunks).toEqual(['"hello" + "world'])
  })

  test('should insert before the last whitespace', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('[1,2')
    buffer.push('\n  ')
    buffer.insertBeforeLastWhitespace(']')
    buffer.insertBeforeLastWhitespace('}')
    buffer.flush()
    expect(chunks).toEqual(['[1,2]}\n  '])
  })

  test('should insert at the end when there is no trailing whitespace', () => {
    const { chunks, buffer } = testOutputBuffer()

    buffer.push('[1,2')
    buffer.insertBeforeLastWhitespace(']')
    buffer.flush()
    expect(chunks).toEqual(['[1,2]'])
  })

  test('should throw when it cannot insert before the last whitespace', () => {
    const { buffer } = testOutputBuffer({ chunkSize: 2, bufferSize: 2 })

    buffer.push('[1,      ')
    expect(() => buffer.insertBeforeLastWhitespace(']')).toThrow(
      /Cannot insert: start of the output is already flushed from the buffer/
    )
  })

  test('should test whether the buffer ends with a character ignoring whitespace', () => {
    const { buffer } = testOutputBuffer()

    buffer.push('[1,2,')
    buffer.push(' \n ')
    expect(buffer.endsWithIgnoringWhitespace(',')).toBe(true)
    expect(buffer.endsWithIgnoringWhitespace('\n')).toBe(true)
    expect(buffer.endsWithIgnoringWhitespace(']')).toBe(false)
  })

  test('should not check the first character for endsWithIgnoringWhitespace', () => {
    const { buffer } = testOutputBuffer()

    buffer.push(',   ')
    expect(buffer.endsWithIgnoringWhitespace(',')).toBe(false)
  })

  describe('long output', () => {
    // these tests operate on output exceeding the small tail of the buffer
    // that is used to inspect the most recent output efficiently
    const text = 'x'.repeat(5000)
    const whitespace = ' '.repeat(2000)

    test('should strip the last occurrence located far back', () => {
      const { chunks, buffer } = testOutputBuffer()

      buffer.push(`,${text}`)
      buffer.push(text)
      buffer.stripLastOccurrence(',')
      buffer.flush()
      expect(chunks).toEqual([text + text])
    })

    test('should insert before long trailing whitespace', () => {
      const { chunks, buffer } = testOutputBuffer()

      buffer.push(text)
      for (const char of whitespace) {
        buffer.push(char)
      }
      buffer.insertBeforeLastWhitespace(']')
      buffer.flush()
      expect(chunks).toEqual([`${text}]${whitespace}`])
    })

    test('should test the end ignoring long trailing whitespace', () => {
      const { buffer } = testOutputBuffer()

      buffer.push(`${text},`)
      buffer.push(whitespace)
      expect(buffer.endsWithIgnoringWhitespace(',')).toBe(true)
      expect(buffer.endsWithIgnoringWhitespace(']')).toBe(false)
    })

    test('should remove and insert far back', () => {
      const { chunks, buffer } = testOutputBuffer()

      buffer.push(`ab${text}`)
      buffer.push(text)
      buffer.remove(1, 2)
      buffer.insertAt(1, 'c')
      buffer.remove(2 + text.length)
      buffer.flush()
      expect(chunks).toEqual([`ac${text}`])
    })

    test('should write chunks of long output', () => {
      const { chunks, buffer } = testOutputBuffer({ chunkSize: 1000, bufferSize: 1500 })

      buffer.push(text)
      buffer.insertBeforeLastWhitespace(']')
      expect(chunks).toEqual(['x'.repeat(1000), 'x'.repeat(1000), 'x'.repeat(1000)])
      buffer.flush()
      expect(chunks.join('')).toEqual(`${text}]`)
    })
  })
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
