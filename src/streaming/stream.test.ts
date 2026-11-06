import { Readable, type Transform } from 'node:stream'
import { describe, expect, test } from 'vitest'
import { jsonrepairTransform } from './stream'

describe('stream', () => {
  test.each([
    'whole',
    'characters'
  ])('should repair a missing comma before a regular expression after flushed output (%s)', async (mode) => {
    const padding = '0,'.repeat(80)
    const text = `[${padding}1 /x/,2]`
    const input = Readable.from(mode === 'characters' ? [...text] : [text])
    const output = input.pipe(jsonrepairTransform({ bufferSize: 64, chunkSize: 8 }))
    const result = await streamToChunks(output)

    expect(result.length).toBeGreaterThan(1)
    expect(result.join('')).toBe(`[${padding}1, "/x/",2]`)
  })

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
})

function streamToChunks(stream: Transform): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []

    stream.on('data', (chunk) => chunks.push(chunk.toString()))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(chunks))
  })
}
