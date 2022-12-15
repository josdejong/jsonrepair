/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 */
export function isHex(char: string): boolean {
  return regexHex.test(char)
}

const regexHex = /^[0-9a-fA-F]$/

export function isDigit(code: number): boolean {
  return code >= codeZero && code <= codeNine
}

const codeZero = 0x30
const codeOne = 0x31
const codeNine = 0x39

export function isNonZeroDigit(code: number): boolean {
  return code >= codeOne && code <= codeNine
}

export function isValidStringCharacter(char: string): boolean {
  // the regex testing all valid characters is relatively slow,
  // therefore we first check all regular printable characters (which is fast)
  return (char >= ' ' && char <= '~') || regexValidStringCharacter.test(char)
}

const regexValidStringCharacter = /^[\u0020-\u{10FFFF}]$/u

export function isDelimiter(c: string): boolean {
  return regexDelimiter.test(c)
}

const regexDelimiter = /^[,:[\]{}()\n"]$/

export function isStartOfValue(c: string): boolean {
  return regexStartOfValue.test(c)
}

const regexStartOfValue = /^[[{\w"-_]$/

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace(code: number): boolean {
  return code === codeSpace || code === codeNewline || code === codeTab || code === codeReturn
}

const codeSpace = 0x20 // space
const codeNewline = 0xa // \n
const codeTab = 0x9 // \t
const codeReturn = 0xd // \r

/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 */
export function isSpecialWhitespace(code: number): boolean {
  return (
    code === codeNonBreakingSpace ||
    (code >= codeEnQuad && code <= codeHairSpace) ||
    code === codeNarrowNoBreakSpace ||
    code === codeMediumMathematicalSpace ||
    code === codeIdeographicSpace
  )
}

const codeNonBreakingSpace = 0xa0
const codeEnQuad = 0x2000
const codeHairSpace = 0x200a
const codeNarrowNoBreakSpace = 0x202f
const codeMediumMathematicalSpace = 0x205f
const codeIdeographicSpace = 0x3000

/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export function isQuote(code: number): boolean {
  // the first check double quotes, since that is normally the case
  return isDoubleQuote(code) || isSingleQuote(code)
}

/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export function isDoubleQuote(code: number): boolean {
  return code === codeDoubleQuote || code === codeDoubleQuoteLeft || code === codeDoubleQuoteRight
}

const codeDoubleQuote = 0x0022 // "
const codeDoubleQuoteLeft = 0x201c
const codeDoubleQuoteRight = 0x201d

/**
 * Test whether the given character is a single quote character.
 * Also tests for special variants of single quotes.
 */
export function isSingleQuote(code: number): boolean {
  return (
    code === codeQuote ||
    code === codeQuoteLeft ||
    code === codeQuoteRight ||
    code === codeGraveAccent ||
    code === codeAcuteAccent
  )
}

const codeQuote = 0x27 // '
const codeQuoteLeft = 0x2018
const codeQuoteRight = 0x2019
const codeGraveAccent = 0x0060
const codeAcuteAccent = 0x00b4

/**
 * Strip last occurrence of textToStrip from text
 */
export function stripLastOccurrence(
  text: string,
  textToStrip: string,
  stripWhitespace = false
): string {
  const index = text.lastIndexOf(textToStrip)
  return index !== -1
    ? text.substring(0, index) + (stripWhitespace ? '' : text.substring(index + 1))
    : text
}

export function insertBeforeLastWhitespace(text: string, textToInsert: string): string {
  let index = text.length

  if (!isWhitespace(text.charCodeAt(index - 1))) {
    // no trailing whitespaces
    return text + textToInsert
  }

  while (isWhitespace(text.charCodeAt(index - 1))) {
    index--
  }

  return text.substring(0, index) + textToInsert + text.substring(index)
}

export function removeAtIndex(text: string, start: number, count: number) {
  return text.substring(0, start) + text.substring(start + count)
}

/**
 * Test whether a string ends with a newline or comma character and optional whitespace
 */
export function endsWithCommaOrNewline(text: string): boolean {
  return /[,\n][ \t\r]*$/.test(text)
}
