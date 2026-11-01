import { Readable, type Transform } from 'node:stream'
import { describe, expect, test } from 'vitest'
import { jsonrepairTransform } from './stream'

describe('stream', () => {
  test('should create and pipe a jsonrepair transform', async () => {
    const input = new Readable()
    input.push("{name: 'John'}")
    input.push(null)

    const output = input.pipe(jsonrepairTransform())
    const result = await streamToChunks(output)
    expect(result).toEqual(['{"name": "John"}'])
  })

  test('should configure chunk size', async () => {
    const input = new Readable()
    input.push("{name: 'John'}")
    input.push(null)

    const output = input.pipe(jsonrepairTransform({ chunkSize: 4 }))
    const result = await streamToChunks(output)
    expect(result).toEqual(['{"na', 'me":', ' "Jo', 'hn"}'])
  })

  test('should configure buffer size, should throw error', async () => {
    return new Promise<void>((resolve) => {
      const input = new Readable()
      input.push("{name: 'John',      }")
      input.push(null)

      const output = input.pipe(jsonrepairTransform({ chunkSize: 4, bufferSize: 2 }))
      input.on('error', (err) => {
        console.log('Error', err)
      })

      streamToChunks(output)
        .then(() => {
          throw new Error('Should not succeed')
        })
        .catch((err) => {
          expect(err.toString()).toEqual(
            'Error: Cannot insert: start of the output is already flushed from the buffer'
          )
          resolve()
        })
    })
  })
  describe.each(['whole', 'characters'])('unquoted trailing whitespace (%s)', (mode) => {
    test.each([
      ['foo ', '"foo" '],
      ['foo\t\r', '"foo"\t\r'],
      ['undefined \t', 'null \t'],
      ['hello   world \t ', '"hello   world" \t '],
      ['foo \t\r\n', '"foo" \t\r\n'],
      ['"foo "', '"foo "'],
      ['undefined', 'null'],
      ['https://example.com/a ', '"https://example.com/a" ']
    ])('keep trailing whitespace outside a value after output is flushed: %s', async (value, repaired) => {
      const prefix = '0,'.repeat(80)
      const text = `[${prefix}${value}]`
      const input = Readable.from(mode === 'characters' ? [...text] : [text])
      const output = input.pipe(jsonrepairTransform({ bufferSize: 64, chunkSize: 8 }))
      const chunks = await streamToChunks(output)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.join('')).toBe(`[${prefix}${repaired}]`)
    })
  })
})

function streamToChunks(stream: Transform): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []

    stream.on('data', (chunk) => chunks.push(chunk.toString()))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(chunks))
  })
}
