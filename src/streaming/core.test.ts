import { describe, expect, test } from 'vitest'
import { jsonrepairCore } from './core'

describe('core', () => {
  test('it should transform input in chunks', () => {
    const { chunks, transform } = createCore({ bufferSize: 4, chunkSize: 2 })

    transform.transform('[1')
    transform.transform('2,')
    transform.transform('3,')
    transform.transform('4,')
    expect(chunks).toEqual([])
    transform.transform('5,')
    expect(chunks).toEqual(['[1'])
    transform.transform('6,')
    expect(chunks).toEqual(['[1', '2,'])
    transform.transform('7,')
    expect(chunks).toEqual(['[1', '2,', '3,'])
    transform.transform(']')
    expect(chunks).toEqual(['[1', '2,', '3,'])
    transform.flush()
    expect(chunks).toEqual(['[1', '2,', '3,', '4,', '5,', '6,', '7]'])
  })

  test('it should throw an error when having a too small input buffer', () => {
    const { transform } = createCore({ bufferSize: 4, chunkSize: 2 })
    transform.transform('1234')

    expect(() => {
      transform.transform('56')
    }).toThrow('Index out of range, please configure a larger buffer size (index: 6)')
  })

  test.each([1, 2, 7, 16])('repairs nested closers across %i-character chunks', (size) => {
    const prefix = `${'[0,'.repeat(20)}0,`
    const suffix = `${',0'.repeat(30)}${']'.repeat(20)}`
    const input = `${prefix}{"a":{"b":1}}},"c":2}${suffix}`
    const expected = `${prefix}{"a":{"b":1},"c":2}${suffix}`
    const { chunks, transform } = createCore({ bufferSize: 32, chunkSize: 8 })

    for (let i = 0; i < input.length; i += size) {
      transform.transform(input.slice(i, i + size))
    }
    transform.flush()

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(expected)
  })

  test.each([
    1, 3, 16, 100
  ])('waits for a continuation split across %i-character chunks', (size) => {
    const suffix = `${',0'.repeat(16)}]`
    const input = `[{"a":{"b":1}}},"xxxxxxxxxxxx":2}${suffix}`
    const expected = `[{"a":{"b":1},"xxxxxxxxxxxx":2}${suffix}`
    const { chunks, transform } = createCore({ bufferSize: 16, chunkSize: 4 })

    for (let i = 0; i < input.length; i += size) {
      transform.transform(input.slice(i, i + size))
    }
    transform.flush()
    expect(chunks.join('')).toBe(expected)
  })

  test.each([1, 3, 100])('resolves pending lookahead at EOF with %i-character chunks', (size) => {
    const input = '[{"a":{"b":1}}},"xxxxxxxxxxxx":2}]'
    const { chunks, transform } = createCore({ bufferSize: 16, chunkSize: 4 })
    for (let i = 0; i < input.length; i += size) {
      transform.transform(input.slice(i, i + size))
    }
    transform.flush()
    expect(chunks.join('')).toBe('[{"a":{"b":1},"xxxxxxxxxxxx":2}]')
  })

  test.each([1, 100])('bounds pending lookahead with %i-character chunks', (size) => {
    const input = `[{"a":{"b":1}}},"${'x'.repeat(40)}":2}]`
    const { transform } = createCore({ bufferSize: 16, chunkSize: 4 })
    expect(() => {
      for (let i = 0; i < input.length; i += size) {
        transform.transform(input.slice(i, i + size))
      }
      transform.flush()
    }).toThrow('please configure a larger buffer size for closing-bracket lookahead')
  })

  test('it should throw an error when having a too small output buffer', () => {
    // testing with ndjson, that has to insert a [ at the start of the document
    const { transform } = createCore({ bufferSize: 4, chunkSize: 2 })
    transform.transform('{"id":1}\n')

    expect(() => {
      transform.transform('{"id":2}\n')
    }).toThrow('Cannot unshift: start of the output is already flushed from the buffer')
  })
})

function createCore(options?: { chunkSize: number; bufferSize: number }) {
  const chunks: string[] = []
  const transform = jsonrepairCore({
    bufferSize: options?.bufferSize,
    chunkSize: options?.chunkSize,
    onData: (chunk) => {
      chunks.push(chunk)
    }
  })

  return { chunks, transform }
}
