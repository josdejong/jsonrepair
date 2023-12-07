import { describe, test, expect } from 'vitest'
import { createInputBuffer } from './InputBuffer'

describe('InputBuffer', () => {
  test('should read bytes via charAt', () => {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.charAt(3)).toBe('3')
    expect(buffer.charAt(4)).toBe('4')
    expect(buffer.charAt(6)).toBe('6')
    expect(buffer.charAt(9)).toBe('9')
    expect(buffer.charAt(10)).toBe('')
    expect(buffer.charAt(100)).toBe('')
  })

  test('should throw when using charAt when the index is already flushed', () => {
    const { buffer } = testInputBuffer('0123456789')

    buffer.flush(2)
    expect(() => buffer.charAt(1)).toThrow(/Index out of range \(index: 1, offset: 2\)/)
    expect(buffer.charAt(2)).toBe('2')
  })

  test('should read bytes via charCodeAt', () => {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.charCodeAt(3)).toBe('3'.charCodeAt(0))
    expect(buffer.charCodeAt(8)).toBe('8'.charCodeAt(0))
    expect(buffer.charCodeAt(12)).toBe(NaN)
  })

  test('should get a substring', () => {
    const { buffer } = testInputBuffer('0123456789')

    expect(buffer.substring(3, 5)).toBe('34')
  })

  test('should get a substring with limited buffer size', () => {
    const { buffer } = testInputBuffer('0123456789')

    expect(buffer.substring(3, 5)).toBe('34')
    buffer.flush(5)
    expect(() => buffer.substring(0, 1)).toThrow(/Index out of range \(index: 0, offset: 5\)/)
    expect(() => buffer.substring(4, 9)).toThrow(/Index out of range \(index: 4, offset: 5\)/)
  })

  test('should get the length', () => {
    const { buffer } = testInputBuffer('0123456789')

    expect(() => buffer.length()).toThrow(/Cannot get length: input is not yet closed/)
    buffer.close()
    expect(buffer.length()).toBe(10)
  })

  test('should get the currentLength', () => {
    const { buffer } = testInputBuffer('')
    expect(buffer.currentLength()).toBe(0)

    buffer.push('0123456789')
    expect(buffer.currentLength()).toBe(10)

    buffer.flush(4)
    expect(buffer.currentLength()).toBe(10)
  })

  test('should flush', () => {
    const { buffer } = testInputBuffer('0123456789')
    expect(buffer.currentBufferSize()).toEqual(10)

    buffer.flush(3)
    expect(buffer.currentBufferSize()).toEqual(7)
  })

  test('should check whether we have reached the end', () => {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.isEnd(0)).toBe(false)
    expect(buffer.isEnd(2)).toBe(false)
    expect(buffer.isEnd(6)).toBe(false)
    expect(buffer.isEnd(9)).toBe(false)
    expect(buffer.isEnd(10)).toBe(true)
    expect(buffer.isEnd(11)).toBe(true)
  })
})

function testInputBuffer(text: string) {
  const buffer = createInputBuffer()
  buffer.push(text)

  return { buffer }
}
