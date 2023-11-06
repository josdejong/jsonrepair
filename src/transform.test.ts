import { describe, test, expect } from 'vitest'
import { jsonrepairTransform } from './transform'

describe('transform', () => {
  test('it should transform input in chunks', () => {
    const { chunks, transform } = createTransform({ bufferSize: 4, chunkSize: 2 })

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

  test.skip('it should throw an error when having a too small input buffer', () => {
    // FIXME: test having a too small input buffer
    const { transform } = createTransform({ bufferSize: 4, chunkSize: 2 })
    transform.transform('1234')

    expect(() => {
      transform.transform('56')
    }).toThrow('Input data not yet received (index: 6, currentLength: 6)')
  })

  test.skip('it should throw an error when having a too small output buffer', () => {
    // FIXME: test having a too small output buffer
  })
})

function createTransform(options?: { chunkSize: number; bufferSize: number }) {
  const chunks: string[] = []
  const transform = jsonrepairTransform({
    bufferSize: options.bufferSize,
    chunkSize: options.chunkSize,
    onData: (chunk) => {
      chunks.push(chunk)
    }
  })

  return { chunks, transform }
}
