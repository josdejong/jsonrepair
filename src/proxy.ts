import { isWhitespace } from './stringUtils.js'

export interface InputProxy {
  charAt: (index: number) => string
  charCodeAt: (index: number) => number
  substring: (start: number, end: number) => string
  length: () => number
  isEnd: (index: number) => boolean
}

export interface OutputProxy {
  push: (text: string) => void
  unshift: (text: string) => void
  remove: (start: number, end?: number) => string
  length: () => number
  close: () => void

  // TODO: extract the following three util functions?
  stripLastOccurrence: (textToStrip: string, stripRemainingText?: boolean) => void
  insertBeforeLastWhitespace: (textToInsert: string) => void
  endsWithCommaOrNewline: () => boolean
}

export interface InputProxyProps {
  read: (chars: number) => string
  chunkSize?: number
  bufferSize?: number
}

export function createInputProxy({
  read,
  chunkSize = 1024,
  bufferSize = 10240
}: InputProxyProps): InputProxy {
  // TODO: reuse validation logic
  if (chunkSize >= bufferSize) {
    throw new Error(
      `chunkSize must be smaller than bufferSize (chunkSize: ${chunkSize}, bufferSize: ${bufferSize})`
    )
  }

  let buffer = ''
  let offset = 0

  function ensure(index: number) {
    // read new data when needed
    while (index + 1 > length()) {
      const chunk = read(chunkSize)
      if (chunk === null) {
        break
      }

      buffer += chunk
    }

    // flush data when the buffer is too large
    if (buffer.length > bufferSize) {
      buffer = buffer.substring(chunkSize)
      offset += chunkSize
    }

    if (index < offset) {
      throw new Error(`Index out of range (index: ${index}, offset: ${offset})`)
    }
  }

  function charAt(index: number): string {
    ensure(index)

    return buffer.charAt(index - offset)
  }

  function charCodeAt(index: number): number {
    ensure(index)

    return buffer.charCodeAt(index)
  }

  function substring(start: number, end: number): string {
    ensure(end - 1) // -1 because end is excluded
    ensure(start)

    return buffer.slice(start - offset, end - offset)
  }

  function length(): number {
    // TODO: only return length when we've reached the end to prevent confusion?
    return offset + buffer.length
  }

  function isEnd(index: number): boolean {
    ensure(index)

    return index >= offset + buffer.length
  }

  return {
    charAt,
    charCodeAt,
    substring,
    length,
    isEnd
  }
}

export function createTextInputProxy(text: string): InputProxy {
  return {
    charAt: (index) => text.charAt(index),
    charCodeAt: (index) => text.charCodeAt(index),
    substring: (start, end) => text.slice(start, end),
    length: () => text.length,
    isEnd: (index) => index >= text.length
  }
}

export interface OutputProxyProps {
  write: (chunk: string) => void
  chunkSize?: number
  bufferSize?: number
}

// TODO: move into a separate file
export function createOutputProxy({
  write,
  chunkSize = 1024,
  bufferSize = 10240
}: OutputProxyProps): OutputProxy {
  // TODO: reuse validation logic
  if (chunkSize >= bufferSize) {
    throw new Error(
      `chunkSize must be smaller than bufferSize (chunkSize: ${chunkSize}, bufferSize: ${bufferSize})`
    )
  }

  let buffer = ''
  let offset = 0

  function flush() {
    while (buffer.length > bufferSize) {
      const chunk = buffer.substring(0, chunkSize)
      write(chunk)
      buffer = buffer.substring(chunkSize)
      offset += chunkSize
    }
  }

  function push(text: string) {
    buffer += text
    flush()
  }

  function unshift(text: string) {
    if (offset > 0) {
      throw new Error('Cannot unshift: start of the output is already flushed from the buffer')
    }

    buffer = text + buffer
    flush()
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

  function close() {
    if (buffer.length > 0) {
      write(buffer)
      buffer = ''
    }
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
    close
  }
}
