import { isWhitespace } from '../../utils/stringUtils.js'

export interface OutputBuffer {
  push: (text: string) => void
  unshift: (text: string) => void
  remove: (start: number, end?: number) => void
  insertAt: (index: number, text: string) => void
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

export function createOutputBuffer(options: OutputBufferOptions): OutputBuffer {
  return new StringOutputBuffer(options)
}

// The buffered output is split in a large head and a small tail containing
// the most recent output. Inspecting the end of a long concatenated string
// (needed for repairs like removing a trailing comma) makes the JavaScript
// engine flatten the whole string first, copying the complete buffer every
// time. Repairs mostly only have to inspect the tail, which is cheap.
//
// Implemented as a class (rather than closures) so all buffers share the same
// methods, which allows the JavaScript engine to inline them in the parser.
class StringOutputBuffer implements OutputBuffer {
  private head = ''
  private tail = ''
  private offset = 0
  private readonly write: (chunk: string) => void
  private readonly chunkSize: number
  private readonly bufferSize: number

  constructor({ write, chunkSize, bufferSize }: OutputBufferOptions) {
    this.write = write
    this.chunkSize = chunkSize
    this.bufferSize = bufferSize
  }

  private getBuffer(): string {
    return this.head + this.tail
  }

  private setBuffer(buffer: string) {
    const split = Math.max(buffer.length - tailMinSize, 0)
    this.head = buffer.substring(0, split)
    this.tail = buffer.substring(split)
  }

  // note: no default parameter here, since transpiled default parameters are slow
  private flushChunks(minSize: number) {
    if (this.head.length + this.tail.length < minSize + this.chunkSize) {
      return
    }

    let buffer = this.getBuffer()
    while (buffer.length >= minSize + this.chunkSize) {
      const chunk = buffer.substring(0, this.chunkSize)
      this.write(chunk)
      this.offset += this.chunkSize
      buffer = buffer.substring(this.chunkSize)
    }

    this.setBuffer(buffer)
  }

  flush() {
    this.flushChunks(0)

    if (this.head.length + this.tail.length > 0) {
      const buffer = this.getBuffer()
      this.write(buffer)
      this.offset += buffer.length
      this.head = ''
      this.tail = ''
    }
  }

  push(text: string) {
    this.tail += text

    if (this.tail.length > tailMaxSize) {
      // move the start of the tail to the head
      const split = this.tail.length - tailMinSize
      this.head += this.tail.substring(0, split)
      this.tail = this.tail.substring(split)
    }

    this.flushChunks(this.bufferSize)
  }

  unshift(text: string) {
    if (this.offset > 0) {
      throw new Error(`Cannot unshift: ${flushedMessage}`)
    }

    this.head = text + this.head
    this.flushChunks(this.bufferSize)
  }

  remove(start: number, end?: number) {
    if (start < this.offset) {
      throw new Error(`Cannot remove: ${flushedMessage}`)
    }

    if (end === undefined && start - this.offset >= this.head.length) {
      // the removed text is located in the tail only
      this.tail = this.tail.substring(0, start - this.offset - this.head.length)
      return
    }

    const buffer = this.getBuffer()
    if (end !== undefined) {
      this.setBuffer(buffer.substring(0, start - this.offset) + buffer.substring(end - this.offset))
    } else {
      this.setBuffer(buffer.substring(0, start - this.offset))
    }
  }

  insertAt(index: number, text: string) {
    if (index < this.offset) {
      throw new Error(`Cannot insert: ${flushedMessage}`)
    }

    const tailIndex = index - this.offset - this.head.length
    if (tailIndex >= 0) {
      // the text is inserted in the tail
      this.tail = this.tail.substring(0, tailIndex) + text + this.tail.substring(tailIndex)
      return
    }

    const buffer = this.getBuffer()
    this.setBuffer(
      buffer.substring(0, index - this.offset) + text + buffer.substring(index - this.offset)
    )
  }

  length(): number {
    return this.offset + this.head.length + this.tail.length
  }

  stripLastOccurrence(textToStrip: string, stripRemainingText = false) {
    // an occurrence found in the tail is always the last occurrence in the buffer
    const tailIndex = this.tail.lastIndexOf(textToStrip)
    if (tailIndex !== -1) {
      this.tail = stripRemainingText
        ? this.tail.substring(0, tailIndex)
        : this.tail.substring(0, tailIndex) + this.tail.substring(tailIndex + textToStrip.length)
      return
    }

    const buffer = this.getBuffer()
    const bufferIndex = buffer.lastIndexOf(textToStrip)

    if (bufferIndex !== -1) {
      if (stripRemainingText) {
        this.setBuffer(buffer.substring(0, bufferIndex))
      } else {
        this.setBuffer(
          buffer.substring(0, bufferIndex) + buffer.substring(bufferIndex + textToStrip.length)
        )
      }
    }
  }

  insertBeforeLastWhitespace(textToInsert: string) {
    if (this.tail.length > 0) {
      if (!isWhitespace(this.tail, this.tail.length - 1)) {
        // no trailing whitespaces
        this.push(textToInsert)
        return
      }

      let tailIndex = this.tail.length
      while (tailIndex > 0 && isWhitespace(this.tail, tailIndex - 1)) {
        tailIndex--
      }

      if (tailIndex > 0) {
        // the last non-whitespace character is located in the tail
        this.tail =
          this.tail.substring(0, tailIndex) + textToInsert + this.tail.substring(tailIndex)
        this.flushChunks(this.bufferSize)
        return
      }
    }

    const buffer = this.getBuffer()
    let bufferIndex = buffer.length // index relative to the start of the buffer, not taking `offset` into account

    if (!isWhitespace(buffer, bufferIndex - 1)) {
      // no trailing whitespaces
      this.push(textToInsert)
      return
    }

    while (isWhitespace(buffer, bufferIndex - 1)) {
      bufferIndex--
    }

    if (bufferIndex <= 0) {
      throw new Error(`Cannot insert: ${flushedMessage}`)
    }

    this.setBuffer(buffer.substring(0, bufferIndex) + textToInsert + buffer.substring(bufferIndex))
    this.flushChunks(this.bufferSize)
  }

  endsWithIgnoringWhitespace(char: string): boolean {
    // note that the first character of the buffer (index 0) is not checked
    for (let k = this.tail.length - 1; k >= 0; k--) {
      if (this.head.length + k <= 0) {
        return false
      }

      if (char === this.tail.charAt(k)) {
        return true
      }

      if (!isWhitespace(this.tail, k)) {
        return false
      }
    }

    let i = this.head.length - 1

    while (i > 0) {
      if (char === this.head.charAt(i)) {
        return true
      }

      if (!isWhitespace(this.head, i)) {
        return false
      }

      i--
    }

    return false
  }
}

// the tail contains at least the last tailMinSize characters of the buffer
// (when available), and is moved to the head when larger than tailMaxSize
const tailMinSize = 256
const tailMaxSize = 1024

const flushedMessage = 'start of the output is already flushed from the buffer'
