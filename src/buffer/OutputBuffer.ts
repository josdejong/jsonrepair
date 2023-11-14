import { isWhitespace } from '../utils/stringUtils'

export interface OutputBuffer {
  push: (text: string) => void
  unshift: (text: string) => void
  remove: (start: number, end?: number) => string
  length: () => number
  flush: () => void

  // FIXME: extract the following three util functions from OutputBuffer
  stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void
  insertBeforeLastWhitespace: (textToInsert: string) => void
  endsWithCommaOrNewline: () => boolean
}

export interface OutputBufferProps {
  write: (chunk: string) => void
  chunkSize: number
  bufferSize: number
}

export function createOutputBuffer({
  write,
  chunkSize,
  bufferSize
}: OutputBufferProps): OutputBuffer {
  let buffer = ''
  let offset = 0

  function flushChunks(minSize = bufferSize) {
    while (buffer.length >= minSize + chunkSize) {
      const chunk = buffer.substring(0, chunkSize)
      write(chunk)
      offset += chunkSize
      buffer = buffer.substring(chunkSize)
    }
  }

  function flush() {
    flushChunks(0)

    if (buffer.length > 0) {
      write(buffer)
      offset += buffer.length
      buffer = ''
    }
  }

  function push(text: string) {
    buffer += text
    flushChunks()
  }

  function unshift(text: string) {
    if (offset > 0) {
      throw new Error(`Cannot unshift: ${flushedMessage}`)
    }

    buffer = text + buffer
    flushChunks()
  }

  function remove(start: number, end = offset + buffer.length): string {
    if (start < offset) {
      throw new Error(`Cannot remove: ${flushedMessage}`)
    }

    const s = start - offset
    const e = end - offset
    const removed = buffer.substring(s, e)
    buffer = buffer.substring(0, s) + buffer.substring(e)
    return removed
  }

  function length(): number {
    return offset + buffer.length
  }

  /**
   * Strip last occurrence of textToStrip from the output
   */
  function stripLastOccurrence(textToStrip: string, stripRemainingText = false) {
    const bufferIndex = buffer.lastIndexOf(textToStrip)

    if (bufferIndex !== -1) {
      const index = offset + bufferIndex

      if (stripRemainingText) {
        remove(index)
      } else {
        remove(index, index + textToStrip.length)
      }
    }
  }

  function insertBeforeLastWhitespace(textToInsert: string) {
    let bufferIndex = buffer.length // index relative to the start of the buffer, not taking `offset` into account

    if (!isWhitespace(buffer.charCodeAt(bufferIndex - 1))) {
      // no trailing whitespaces
      push(textToInsert)
      return
    }

    while (isWhitespace(buffer.charCodeAt(bufferIndex - 1))) {
      bufferIndex--
    }

    if (bufferIndex <= 0) {
      throw new Error(`Cannot insertBeforeLastWhitespace: ${flushedMessage}`)
    }

    buffer = buffer.substring(0, bufferIndex) + textToInsert + buffer.substring(bufferIndex)
    flushChunks()
  }

  /**
   * Test whether a string ends with a newline or comma character and optional whitespace
   */
  function endsWithCommaOrNewline(): boolean {
    return /[,\n][ \t\r]*$/.test(buffer)
  }

  return {
    push,
    unshift,
    remove,
    stripLastOccurrence,
    insertBeforeLastWhitespace,
    endsWithCommaOrNewline,
    length,
    flush
  }
}

const flushedMessage = 'start of the output is already flushed from the buffer'
