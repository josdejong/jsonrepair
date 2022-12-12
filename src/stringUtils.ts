
const SINGLE_QUOTES: { [key: string]: boolean } = {
  '\'': true, // quote
  '\u2018': true, // quote left
  '\u2019': true, // quote right
  '\u0060': true, // grave accent
  '\u00B4': true // acute accent
}

const DOUBLE_QUOTES: { [key: string]: boolean } = {
  '"': true,
  '\u201C': true, // double quote left
  '\u201D': true // double quote right
}

/**
 * Check if the given character contains an alpha character, a-z, A-Z, _
 */
export function isAlpha (c: string) : boolean {
  return ALPHA_REGEX.test(c)
}

const ALPHA_REGEX = /^[a-zA-Z_]$/

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 */
export function isHex (c: string) : boolean {
  return HEX_REGEX.test(c)
}

const HEX_REGEX = /^[0-9a-fA-F]$/

/**
 * checks if the given char c is a digit
 */
export function isDigit (c: string) : boolean {
  return DIGIT_REGEX.test(c)
}

const DIGIT_REGEX = /^[0-9]$/

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace (c: string) : boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 */
export function isSpecialWhitespace (c: string) : boolean {
  return (
    c === '\u00A0' ||
    (c >= '\u2000' && c <= '\u200A') ||
    c === '\u202F' ||
    c === '\u205F' ||
    c === '\u3000'
  )
}

/**
 * Replace speical whitespace characters with regular spaces
 */
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

/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export function isQuote (c: string) : boolean {
  return SINGLE_QUOTES[c] === true || DOUBLE_QUOTES[c] === true
}

/**
 * Test whether the given character is a single quote character.
 * Also tests for special variants of single quotes.
 */
export function isSingleQuote (c: string) : boolean {
  return SINGLE_QUOTES[c] === true
}

/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export function isDoubleQuote (c: string) : boolean {
  return DOUBLE_QUOTES[c] === true
}

/**
 * Normalize special double or single quote characters to their regular
 * variant ' or "
 */
export function normalizeQuote (c: string) : string {
  if (SINGLE_QUOTES[c] === true) {
    return '\''
  }

  if (DOUBLE_QUOTES[c] !== true) {
    return c
  } else {
    return '"'
  }
}

/**
 * Strip last occurrence of textToStrip from text
 */
export function stripLastOccurrence (text: string, textToStrip: string) : string {
  const index = text.lastIndexOf(textToStrip)
  return (index !== -1)
    ? text.substring(0, index) + text.substring(index + 1)
    : text
}

/**
 * Insert textToInsert into text before the last whitespace in text
 */
export function insertBeforeLastWhitespace (text: string, textToInsert: string) : string {
  let index = text.length

  if (!isWhitespace(text[index - 1])) {
    // no trailing whitespaces
    return text + textToInsert
  }

  while (isWhitespace(text[index - 1])) {
    index--
  }

  return text.substring(0, index) + textToInsert + text.substring(index)
}

/**
 * Insert textToInsert at index in text
 */
export function insertAtIndex (text: string, textToInsert: string, index: number) : string {
  return text.substring(0, index) + textToInsert + text.substring(index)
}
