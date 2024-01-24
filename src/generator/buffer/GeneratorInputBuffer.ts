export interface GeneratorInputBuffer {
  push: (chunk: string) => void
  flush: (position: number) => void
  charAt: (index: number) => Generator<string>
  charCodeAt: (index: number) => Generator<number>
  substring: (start: number, end: number) => Generator<string>
  length: () => number
  currentLength: () => number
  currentBufferSize: () => number
  isEnd: (index: number) => Generator<boolean>
  close: () => void
}

export function createGeneratorInputBuffer(): GeneratorInputBuffer {
  let buffer = ''
  let offset = 0
  let currentLength = 0
  let closed = false

  function* ensure(index: number): Generator {
    if (index < offset) {
      throw new Error(`${indexOutOfRangeMessage} (index: ${index}, offset: ${offset})`)
    }

    // eslint-disable-next-line no-unmodified-loop-condition
    while (!closed && index >= currentLength) {
      yield
    }

    // TODO: cleanup?
    // if (closed && index >= currentLength) {
    //   throw new Error(`${indexOutOfRangeMessage} (index: ${index})`)
    // }
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

  function* charAt(index: number): Generator<string> {
    yield* ensure(index)

    return buffer.charAt(index - offset)
  }

  function* charCodeAt(index: number): Generator<number> {
    yield* ensure(index)

    return buffer.charCodeAt(index - offset)
  }

  function* substring(start: number, end: number): Generator<string> {
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

  function* isEnd(index: number): Generator<boolean> {
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
