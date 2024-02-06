import { describe, test, expect } from 'vitest'
import { createGeneratorInputBuffer } from './GeneratorInputBuffer'

describe('GeneratorInputBuffer', () => {
  test('should read bytes via charAt', function() {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.charAt(3).next().value).toBe('3')
    expect(buffer.charAt(4).next().value).toBe('4')
    expect(buffer.charAt(6).next().value).toBe('6')
    expect(buffer.charAt(9).next().value).toBe('9')
    expect(buffer.charAt(10).next().value).toBe('')
    expect(buffer.charAt(100).next().value).toBe('')
  })

  test('should yield when data is not yet in', async function() {
    const buffer = createGeneratorInputBuffer()
    buffer.push('01')

    const log: string[] = []

    setTimeout(() => {
      log.push('B')
      buffer.push('23')
      log.push('C')
    }, 0)

    log.push('A')
    let char: string | undefined
    let i = 0
    const iMax = 100
    while ((char = buffer.charAt(3).next().value) === undefined && i < iMax) {
      log.push('waiting...')
      await sleep(0)
      i++
    }
    expect(char).toBe('3')
    log.push('D')

    expect(log).toEqual(['A', 'waiting...', 'B', 'C', 'D'])

    buffer.close()
  })

  function sleep(delay: number) {
    return new Promise(resolve => setTimeout(resolve, delay))
  }

  test('should throw when using charAt when the index is already flushed', function() {
    const { buffer } = testInputBuffer('0123456789')

    buffer.flush(2)
    expect(function() {
      buffer.charAt(1).next()
    }).toThrow(
      /Index out of range, please configure a larger buffer size \(index: 1, offset: 2\)/
    )
    expect(buffer.charAt(2).next().value).toBe('2')
  })

  test('should read bytes via charCodeAt', function() {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.charCodeAt(3).next().value).toBe('3'.charCodeAt(0))
    expect(buffer.charCodeAt(8).next().value).toBe('8'.charCodeAt(0))
    expect(buffer.charCodeAt(12).next().value).toBe(NaN)
  })

  test('should get a substring', function() {
    const { buffer } = testInputBuffer('0123456789')

    expect(buffer.substring(3, 5).next().value).toBe('34')
  })

  test('should get a substring with limited buffer size', function* () {
    const { buffer } = testInputBuffer('0123456789')

    expect(yield* buffer.substring(3, 5)).toBe('34')
    buffer.flush(5)
    expect(function* () {
      yield* buffer.substring(0, 1)
    }).toThrow(
      /Index out of range, please configure a larger buffer size \(index: 0, offset: 5\)/
    )
    expect(function* () {
      yield* buffer.substring(4, 9)
    }).toThrow(
      /Index out of range, please configure a larger buffer size \(index: 4, offset: 5\)/
    )
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

  test('should check whether we have reached the end', function() {
    const { buffer } = testInputBuffer('0123456789')
    buffer.close()

    expect(buffer.isEnd(0).next().value).toBe(false)
    expect(buffer.isEnd(2).next().value).toBe(false)
    expect(buffer.isEnd(6).next().value).toBe(false)
    expect(buffer.isEnd(9).next().value).toBe(false)
    expect(buffer.isEnd(10).next().value).toBe(true)
    expect(buffer.isEnd(11).next().value).toBe(true)
  })
})

function testInputBuffer(text: string) {
  const buffer = createGeneratorInputBuffer()
  buffer.push(text)

  return { buffer }
}
