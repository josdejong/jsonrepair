import { deepStrictEqual, strictEqual, throws } from 'assert'
import { createInputProxy, createOutputProxy } from './proxy.js'
import { textToInputStream } from './stream.js'

describe('proxy', () => {
  describe('createInputProxy', () => {
    it('should read bytes via charAt', () => {
      const { chunks, buffer } = testOutputProxy('0123456789', { chunkSize: 2, bufferSize: 4 })

      strictEqual(buffer.charAt(3), '3') // buffer is '0123'
      deepStrictEqual(chunks, ['01', '23'])
      strictEqual(buffer.charAt(4), '4') // buffer is '2345'
      deepStrictEqual(chunks, ['01', '23', '45'])
      throws(() => buffer.charAt(1), /Error: Index out of range \(index: 1, offset: 2\)/)
      strictEqual(buffer.charAt(2), '2')
      strictEqual(buffer.charAt(3), '3')

      strictEqual(buffer.charAt(6), '6') // buffer is '4567'
      deepStrictEqual(chunks, ['01', '23', '45', '67'])
      strictEqual(buffer.charAt(4), '4')

      strictEqual(buffer.charAt(9), '9')
      deepStrictEqual(chunks, ['01', '23', '45', '67', '89'])
      strictEqual(buffer.charAt(10), '')
      strictEqual(buffer.charAt(100), '')
    })

    it('should read bytes via charCodeAt', () => {
      const { buffer } = testOutputProxy('0123456789')

      strictEqual(buffer.charCodeAt(3), '3'.charCodeAt(0))
      strictEqual(buffer.charCodeAt(12), NaN)
    })

    it('should get a substring', () => {
      const { buffer } = testOutputProxy('0123456789')

      strictEqual(buffer.substring(3, 5), '34')
    })

    it('should get a substring with limited buffer size', () => {
      const { buffer } = testOutputProxy('0123456789', { chunkSize: 2, bufferSize: 4 })

      strictEqual(buffer.substring(3, 5), '34')
      throws(() => buffer.substring(0, 1), /Error: Index out of range \(index: 0, offset: 2\)/)
      throws(() => buffer.substring(4, 9), /Error: Index out of range \(index: 4, offset: 6\)/)
    })

    it('should get the current length', () => {
      const { buffer } = testOutputProxy('0123456789', { chunkSize: 2, bufferSize: 4 })

      strictEqual(buffer.length(), 0)
      buffer.charAt(3)
      strictEqual(buffer.length(), 4)
      buffer.charAt(6)
      strictEqual(buffer.length(), 8) // TODO: Should this be 7?
    })

    it('should check whether we have reached the end', () => {
      const { buffer } = testOutputProxy('0123456789', { chunkSize: 2, bufferSize: 4 })

      strictEqual(buffer.isEnd(0), false)
      strictEqual(buffer.isEnd(2), false)
      strictEqual(buffer.isEnd(6), false)
      strictEqual(buffer.isEnd(9), false)
      strictEqual(buffer.isEnd(10), true)
      strictEqual(buffer.isEnd(11), true)
    })
  })

  describe('createOutputProxy', () => {
    it('should write chunks into an output buffer', () => {
      const { chunks, buffer } = testInputProxy({ chunkSize: 2, bufferSize: 4 })

      buffer.push('0')
      buffer.push('1')
      buffer.push('2')
      buffer.push('3')
      deepStrictEqual(chunks, [])
      buffer.push('4')
      buffer.push('5')
      deepStrictEqual(chunks, ['01'])
      buffer.push('6')
      deepStrictEqual(chunks, ['01', '23'])
      buffer.close()
      deepStrictEqual(chunks, ['01', '23', '456'])
    })

    it('should push to the output proxy', () => {
      const { chunks, buffer } = testInputProxy()

      buffer.push('test')
      buffer.close()
      deepStrictEqual(chunks, ['test'])
    })

    it('should get current length', () => {
      const { buffer } = testInputProxy({ chunkSize: 2, bufferSize: 4 })

      buffer.push(':) ')
      deepStrictEqual(buffer.length(), 3)

      buffer.push('hello world')
      deepStrictEqual(buffer.length(), 14)
    })

    it('should unshift', () => {
      const { chunks, buffer } = testInputProxy()

      buffer.push('hello world')
      buffer.unshift(':) ')
      buffer.close()
      deepStrictEqual(chunks, [':) hello world'])
    })

    it('should throw when it cannot unshift', () => {
      const { chunks, buffer } = testInputProxy({ chunkSize: 2, bufferSize: 4 })

      buffer.push('hello world')
      throws(
        () => buffer.unshift(':) '),
        /Error: Cannot unshift: start of the output is already flushed from the buffer/
      )
      buffer.close()
      deepStrictEqual(chunks, ['he', 'll', 'o ', 'wo', 'rld'])
    })

    it('should remove without end', () => {
      const { chunks, buffer } = testInputProxy()

      buffer.push('hello world')
      buffer.remove(5)
      buffer.close()
      deepStrictEqual(chunks, ['hello'])
    })

    it('should remove with end', () => {
      const { chunks, buffer } = testInputProxy()

      buffer.push('how are you doing?')
      buffer.remove(4, 8)
      buffer.close()
      deepStrictEqual(chunks, ['how you doing?'])
    })

    // TODO: TEST stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void
    // TODO: TEST insertBeforeLastWhitespace: (textToInsert: string) => void
    // TODO: TEST endsWithCommaOrNewline: () => boolean
    // TODO: TEST length: () => number
    // TODO: TEST close: () => void
  })
})

function testOutputProxy(text: string, options?: { chunkSize: number; bufferSize: number }) {
  const stream = textToInputStream(text)
  const chunks: string[] = []
  const buffer = createInputProxy({
    read: (size) => {
      const chunk = stream.read(size)
      chunks.push(chunk)
      return chunk
    },
    ...options
  })

  return { chunks, buffer }
}

function testInputProxy(options?: { chunkSize: number; bufferSize: number }) {
  const chunks: string[] = []
  const buffer = createOutputProxy({
    write: (chunk) => {
      chunks.push(chunk)
    },
    ...options
  })

  return { chunks, buffer }
}
