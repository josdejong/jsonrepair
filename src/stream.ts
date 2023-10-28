export interface InputStream {
  read: (size: number) => string | null
}

export interface OutputStream {
  write: (chunk: string) => void
  close: () => void
}

export function textToInputStream(text: string): InputStream {
  let i = 0

  return {
    read: (size: number) => {
      if (i >= text.length) {
        return null
      }

      const chunk = text.substring(i, i + size)
      i += chunk.length

      return chunk
    }
  }
}
