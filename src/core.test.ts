import { describe, test, expect } from 'vitest'
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
    }).toThrow('Index out of range (index: 6)')
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
