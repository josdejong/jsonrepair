import { strictEqual, throws } from 'assert'
import { describe, test } from 'vitest'
import { createInputBuffer } from './InputBuffer'

describe('createInputBuffer', () => {
  test('should read bytes via charAt', () => {
    const { buffer } = testInputBuffer('0123456789')

    strictEqual(buffer.charAt(3), '3')
    strictEqual(buffer.charAt(4), '4')
    strictEqual(buffer.charAt(6), '6')
    strictEqual(buffer.charAt(9), '9')
    strictEqual(buffer.charAt(10), '')
    strictEqual(buffer.charAt(100), '')
  })

  test('should throw when using charAt when the index is already flushed', () => {
    const { buffer } = testInputBuffer('0123456789')

    buffer.flush(2)
    throws(() => buffer.charAt(1), /Error: Index out of range \(index: 1, offset: 2\)/)
    strictEqual(buffer.charAt(2), '2')
  })

  test('should read bytes via charCodeAt', () => {
    const { buffer } = testInputBuffer('0123456789')

    strictEqual(buffer.charCodeAt(3), '3'.charCodeAt(0))
    strictEqual(buffer.charCodeAt(8), '8'.charCodeAt(0))
    strictEqual(buffer.charCodeAt(12), NaN)
  })

  test('should get a substring', () => {
    const { buffer } = testInputBuffer('0123456789')

    strictEqual(buffer.substring(3, 5), '34')
  })

  test('should get a substring with limited buffer size', () => {
    const { buffer } = testInputBuffer('0123456789')

    strictEqual(buffer.substring(3, 5), '34')
    buffer.flush(5)
    throws(() => buffer.substring(0, 1), /Error: Index out of range \(index: 0, offset: 5\)/)
    throws(() => buffer.substring(4, 9), /Error: Index out of range \(index: 4, offset: 5\)/)
  })

  test('should get the length', () => {
    const { buffer } = testInputBuffer('0123456789')

    throws(() => buffer.length(), /Error: Cannot get length: input is not yet closed/)
    buffer.close()
    strictEqual(buffer.length(), 10)
  })

  test('should get the currentBufferSize', () => {
    const { buffer } = testInputBuffer('')
    strictEqual(buffer.currentBufferSize(), 0)

    buffer.push('0123456789')
    strictEqual(buffer.currentBufferSize(), 10)

    buffer.flush(4)
    strictEqual(buffer.currentBufferSize(), 6)
  })

  test('should flush', () => {
    const { buffer } = testInputBuffer('0123456789')
    strictEqual(buffer.currentBufferSize(), 10)

    buffer.flush(3)
    strictEqual(buffer.currentBufferSize(), 7)
  })

  test('should check whether we have reached the end', () => {
    const { buffer } = testInputBuffer('0123456789')

    strictEqual(buffer.isEnd(0), false)
    strictEqual(buffer.isEnd(2), false)
    strictEqual(buffer.isEnd(6), false)
    strictEqual(buffer.isEnd(9), false)
    strictEqual(buffer.isEnd(10), true)
    strictEqual(buffer.isEnd(11), true)
  })
})

function testInputBuffer(text: string) {
  const chunks: string[] = []
  const buffer = createInputBuffer()
  buffer.push(text)

  return { chunks, buffer }
}
