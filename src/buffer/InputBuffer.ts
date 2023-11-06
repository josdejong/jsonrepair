export interface InputBuffer {
  push: (chunk: string) => void
  flush: (position: number) => void
  charAt: (index: number) => string
  charCodeAt: (index: number) => number
  substring: (start: number, end: number) => string
  length: () => number
  currentLength: () => number
  currentBufferSize: () => number
  isEnd: (index: number) => boolean
  close: () => void
}

export function createInputBuffer(): InputBuffer {
  let buffer = ''
  let offset = 0
  let closed = false

  function ensure(index: number) {
    if (index < offset) {
      throw new Error(`Index out of range (index: ${index}, offset: ${offset})`)
    }

    // FIXME: throw exception when reading data that is not yet received
    // if (!closed && index >= offset + buffer.length) {
    //   throw new Error(
    //     `Input data not yet received (index: ${index}, currentLength: ${offset + buffer.length})`
    //   )
    // }
  }

  function push(chunk: string) {
    buffer += chunk
  }

  function flush(position: number) {
    if (position > offset + buffer.length) {
      throw new Error(
        'Cannot flush: position is larger than the actual data in the buffer' +
          ` (position: ${position}, buffer length: ${buffer.length})`
      )
    }

    buffer = buffer.substring(position - offset)
    offset = position
  }

  function charAt(index: number): string {
    ensure(index)

    return buffer.charAt(index - offset)
  }

  function charCodeAt(index: number): number {
    ensure(index)

    return buffer.charCodeAt(index - offset)
  }

  function substring(start: number, end: number): string {
    ensure(end - 1) // -1 because end is excluded
    ensure(start)

    return buffer.slice(start - offset, end - offset)
  }

  function length(): number {
    if (!closed) {
      throw new Error('Cannot get length: input is not yet closed')
    }

    return currentLength()
  }

  function currentLength(): number {
    return offset + buffer.length
  }

  function currentBufferSize(): number {
    return buffer.length
  }

  function isEnd(index: number): boolean {
    if (!closed) {
      ensure(index)
    }

    return index >= offset + buffer.length
  }

  function close() {
    closed = true
  }

  return {
    push,
    flush,
    charAt,
    charCodeAt,
    substring,
    length,
    currentLength,
    currentBufferSize,
    isEnd,
    close
  }
}
