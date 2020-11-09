
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
 * @param {string} c
 * @return {boolean}
 */
export function isAlpha (c) {
  return /^[a-zA-Z_]$/.test(c)
}

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 * @param {string} c
 * @return {boolean}
 */
export function isHex (c) {
  return /^[0-9a-fA-F]$/.test(c)
}

/**
 * checks if the given char c is a digit
 * @param {string} c
 * @return {boolean}
 */
export function isDigit (c) {
  return (c >= '0' && c <= '9')
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 * @param {string} c
 * @return {boolean}
 */
export function isWhitespace (c) {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 * @param {string} c
 * @return {boolean}
 */
export function isSpecialWhitespace (c) {
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
 * @param {string} text
 * @returns {string}
 */
export function normalizeWhitespace (text) {
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
 * @param {string} c
 * @returns {boolean}
 */
export function isQuote (c) {
  return SINGLE_QUOTES.includes(c) || DOUBLE_QUOTES.includes(c)
}

/**
 * Normalize special double or single quote characters to their regular
 * variant ' or "
 * @param {string} c
 * @returns {string}
 */
export function normalizeQuote (c) {
  if (SINGLE_QUOTES.includes(c)) {
    return '\''
  }

  if (DOUBLE_QUOTES.includes(c)) {
    return '"'
  }

  return c
}

/**
 * Strip last occurrence of textToStrip from text
 * @param {string} text
 * @param {string} textToStrip
 * @returns {string}
 */
export function stripLastOccurrence (text, textToStrip) {
  const index = text.lastIndexOf(textToStrip)
  return (index !== -1)
    ? text.substring(0, index) + text.substring(index + 1)
    : text
}

/**
 * Insert textToInsert into text before the last whitespace in text
 * @param {string} text
 * @param {string} textToInsert
 * @returns {string}
 */
export function insertBeforeLastWhitespace (text, textToInsert) {
  return text.replace(/\s*$/, match => textToInsert + match)
}

/**
 * Insert textToInsert at index in text
 * @param {string} text
 * @param {string} textToInsert
 * @param {number} index
 * @returns {string}
 */
export function insertAtIndex (text, textToInsert, index) {
  return text.substring(0, index) + textToInsert + text.substring(index)
}
