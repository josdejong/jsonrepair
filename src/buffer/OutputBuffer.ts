import { isWhitespace } from '../stringUtils.js'

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

// TODO: move into a separate file
export function createOutputBuffer({
  write,
  chunkSize,
  bufferSize
}: OutputBufferProps): OutputBuffer {
  let buffer = ''
  let offset = 0

  function flushChunks() {
    while (buffer.length > bufferSize + chunkSize) {
      const chunk = buffer.substring(0, chunkSize)
      write(chunk)
      buffer = buffer.substring(chunkSize)
      offset += chunkSize
    }
  }

  function flush() {
    if (buffer.length > 0) {
      write(buffer)
      buffer = ''
    }
  }

  function push(text: string) {
    buffer += text
    flushChunks()
  }

  function unshift(text: string) {
    if (offset > 0) {
      throw new Error('Cannot unshift: start of the output is already flushed from the buffer')
    }

    buffer = text + buffer
    flushChunks()
  }

  function remove(start: number, end?: number): string {
    if (start < offset) {
      throw new Error('Cannot remove: start of the output is already flushed from the buffer')
    }

    if (end === undefined) {
      const removed = buffer.substring(start - offset)
      buffer = buffer.substring(0, start - offset)
      return removed
    } else {
      const removed = buffer.substring(start - offset, end - offset)
      buffer = buffer.substring(0, start - offset) + buffer.substring(end - offset)
      return removed
    }
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
      if (stripRemainingText) {
        remove(offset + bufferIndex)
      } else {
        remove(offset + bufferIndex, offset + bufferIndex + textToStrip.length)
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
      throw new Error(
        'Cannot insertBeforeLastWhitespace: start of the output is already flushed from the buffer'
      )
    }

    buffer = buffer.substring(0, bufferIndex) + textToInsert + buffer.substring(bufferIndex)
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
