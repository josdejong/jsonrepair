
const SINGLE_QUOTES = [
  '\'', // quote
  '\u2018', // quote left
  '\u2019', // quote right
  '\u0060', // grave accent
  '\u00B4' // acute accent
]

const DOUBLE_QUOTES = [
  '"',
  '\u201C', // double quote left
  '\u201D' // double quote right
]

/**
 * Check if the given character contains an alpha character, a-z, A-Z, _
 */
export function isAlpha (c: string) : boolean {
  return /^[a-zA-Z_]$/.test(c)
}

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 */
export function isHex (c: string) : boolean {
  return /^[0-9a-fA-F]$/.test(c)
}

/**
 * checks if the given char c is a digit
 */
export function isDigit (c: string) : boolean {
  return (c >= '0' && c <= '9')
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace (c: string) : boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

export function isSpecialWhitespace (c: string) : boolean {
  return (
    c === '\u00A0' ||
    (c >= '\u2000' && c <= '\u200A') ||
    c === '\u202F' ||
    c === '\u205F' ||
    c === '\u3000'
  )
}

export function normalizeWhitespace (text: string) : string {
  let normalized = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    normalized += isSpecialWhitespace(char)
      ? ' '
      : char
  }

  return normalized
}

export function isQuote (c: string) : boolean {
  return SINGLE_QUOTES.includes(c) || DOUBLE_QUOTES.includes(c)
}

export function normalizeQuote (c: string) : string {
  if (SINGLE_QUOTES.includes(c)) {
    return '\''
  }

  if (DOUBLE_QUOTES.includes(c)) {
    return '"'
  }

  return c
}

export function stripLastOccurrence (text: string, textToStrip: string) : string {
  const index = text.lastIndexOf(textToStrip)
  return (index !== -1)
    ? text.substring(0, index) + text.substring(index + 1)
    : text
}

export function insertBeforeLastWhitespace (text: string, textToInsert: string) {
  return text.replace(/\s*$/, match => textToInsert + match)
}

export function insertAtIndex (text: string, textToInsert: string, index: number): string {
  return text.substring(0, index) + textToInsert + text.substring(index)
}
