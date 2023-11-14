import { Readable, Transform } from 'node:stream'
import { describe, expect, test } from 'vitest'
import { jsonrepairTransform } from './stream'

describe('stream', () => {
  test('should create and pipe a jsonrepair transform', async () => {
    const input = new Readable()
    input.push("{name: 'John'}")
    input.push(null)

    const output = input.pipe(jsonrepairTransform())
    const result = await streamToString(output)
    expect(result).toEqual('{"name": "John"}')
  })
})

function streamToString(stream: Transform): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    stream.on('data', (chunk) => (data += chunk.toString()))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(data))
  })
}
