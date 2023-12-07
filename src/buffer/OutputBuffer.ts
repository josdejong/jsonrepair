import { isWhitespace } from '../utils/stringUtils.js'

export interface OutputBuffer {
  push: (text: string) => void
  unshift: (text: string) => void
  remove: (start: number, end?: number) => void
  length: () => number
  flush: () => void

  stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void
  insertBeforeLastWhitespace: (textToInsert: string) => void
  endsWithIgnoringWhitespace: (char: string) => boolean
}

export interface OutputBufferOptions {
  write: (chunk: string) => void
  chunkSize: number
  bufferSize: number
}

export function createOutputBuffer({
  write,
  chunkSize,
  bufferSize
}: OutputBufferOptions): OutputBuffer {
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

  function remove(start: number, end?: number) {
    if (start < offset) {
      throw new Error(`Cannot remove: ${flushedMessage}`)
    }

    if (end !== undefined) {
      buffer = buffer.substring(0, start - offset) + buffer.substring(end - offset)
    } else {
      buffer = buffer.substring(0, start - offset)
    }
  }

  function length(): number {
    return offset + buffer.length
  }

  function stripLastOccurrence(textToStrip: string, stripRemainingText = false) {
    const bufferIndex = buffer.lastIndexOf(textToStrip)

    if (bufferIndex !== -1) {
      if (stripRemainingText) {
        buffer = buffer.substring(0, bufferIndex)
      } else {
        buffer =
          buffer.substring(0, bufferIndex) + buffer.substring(bufferIndex + textToStrip.length)
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
      throw new Error(`Cannot insert: ${flushedMessage}`)
    }

    buffer = buffer.substring(0, bufferIndex) + textToInsert + buffer.substring(bufferIndex)
    flushChunks()
  }

  function endsWithIgnoringWhitespace(char: string): boolean {
    let i = buffer.length - 1

    while (i > 0) {
      if (char === buffer.charAt(i)) {
        return true
      }

      if (!isWhitespace(buffer.charCodeAt(i))) {
        return false
      }

      i--
    }

    return false
  }

  return {
    push,
    unshift,
    remove,
    length,
    flush,

    stripLastOccurrence,
    insertBeforeLastWhitespace,
    endsWithIgnoringWhitespace
  }
}

const flushedMessage = 'start of the output is already flushed from the buffer'
