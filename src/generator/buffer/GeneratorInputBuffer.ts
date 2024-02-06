export interface GeneratorInputBuffer {
  push: (chunk: string) => void
  flush: (position: number) => void
  charAt: (index: number) => Generator<void>
  charCodeAt: (index: number) => Generator<void>
  substring: (start: number, end: number) => Generator<void>
  length: () => number
  currentLength: () => number
  currentBufferSize: () => number
  isEnd: (index: number) => Generator<void>
  close: () => void
}

export function createGeneratorInputBuffer(): GeneratorInputBuffer {
  let buffer = ''
  let offset = 0
  let currentLength = 0
  let closed = false

  function* ensure(index: number): Generator<void> {
    if (index < offset) {
      throw new Error(`${indexOutOfRangeMessage} (index: ${index}, offset: ${offset})`)
    }

    // eslint-disable-next-line no-unmodified-loop-condition
    while (!closed && index >= currentLength) {
      yield
    }
  }

  function push(chunk: string) {
    buffer += chunk
    currentLength += chunk.length
  }

  function flush(position: number) {
    if (position > currentLength) {
      return
    }

    buffer = buffer.substring(position - offset)
    offset = position
  }

  function* charAt(index: number): Generator<void> {
    yield* ensure(index)

    return buffer.charAt(index - offset)
  }

  function* charCodeAt(index: number): Generator<void> {
    yield* ensure(index)

    return buffer.charCodeAt(index - offset)
  }

  function* substring(start: number, end: number): Generator<void> {
    yield* ensure(end - 1) // -1 because end is excluded
    yield* ensure(start)

    return buffer.slice(start - offset, end - offset)
  }

  function length(): number {
    if (!closed) {
      throw new Error('Cannot get length: input is not yet closed')
    }

    return currentLength
  }

  function* isEnd(index: number): Generator<void> {
    if (!closed) {
      yield* ensure(index)
    }

    return index >= currentLength
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
    currentLength: () => currentLength,
    currentBufferSize: () => buffer.length,
    isEnd,
    close
  }
}

const indexOutOfRangeMessage = 'Index out of range, please configure a larger buffer size'
