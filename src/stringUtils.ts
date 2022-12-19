// TODO: sort the codes
export const codeBackslash = 0x5c // "\"
export const codeSlash = 0x2f // "/"
export const codeAsterisk = 0x2a // "*"
export const codeOpeningBrace = 0x7b // "{"
export const codeClosingBrace = 0x7d // "}"
export const codeOpeningBracket = 0x5b // "["
export const codeClosingBracket = 0x5d // "]"
export const codeOpenParenthesis = 0x28 // "("
export const codeCloseParenthesis = 0x29 // ")"
export const codeSpace = 0x20 // " "
export const codeNewline = 0xa // "\n"
export const codeTab = 0x9 // "\t"
export const codeReturn = 0xd // "\r"
export const codeBackspace = 0x08 // "\b"
export const codeFormFeed = 0x0c // "\f"
export const codeDoubleQuote = 0x0022 // "
export const codePlus = 0x2b // "+"
export const codeMinus = 0x2d // "-"
export const codeQuote = 0x27 // "'"
export const codeZero = 0x30
export const codeOne = 0x31
export const codeNine = 0x39
export const codeComma = 0x2c // ","
export const codeDot = 0x2e // "." (dot, period)
export const codeColon = 0x3a // ":"
export const codeSemicolon = 0x3b // ";"
export const codeUppercaseA = 0x41 // "A"
export const codeLowercaseA = 0x61 // "a"
export const codeUppercaseE = 0x45 // "E"
export const codeLowercaseE = 0x65 // "e"
export const codeUppercaseF = 0x46 // "F"
export const codeLowercaseF = 0x66 // "f"
const codeNonBreakingSpace = 0xa0
const codeEnQuad = 0x2000
const codeHairSpace = 0x200a
const codeNarrowNoBreakSpace = 0x202f
const codeMediumMathematicalSpace = 0x205f
const codeIdeographicSpace = 0x3000
const codeDoubleQuoteLeft = 0x201c
const codeDoubleQuoteRight = 0x201d
const codeQuoteLeft = 0x2018
const codeQuoteRight = 0x2019
const codeGraveAccent = 0x0060
const codeAcuteAccent = 0x00b4

export function isHex(code: number): boolean {
  return (
    (code >= codeZero && code < codeNine) ||
    (code >= codeUppercaseA && code <= codeUppercaseF) ||
    (code >= codeLowercaseA && code <= codeLowercaseF)
  )
}

export function isDigit(code: number): boolean {
  return code >= codeZero && code <= codeNine
}

export function isNonZeroDigit(code: number): boolean {
  return code >= codeOne && code <= codeNine
}

export function isValidStringCharacter(code: number): boolean {
  return code >= 0x20 && code <= 0x10ffff
}

export function isDelimiter(char: string): boolean {
  return regexDelimiter.test(char)
}

const regexDelimiter = /^[,:[\]{}()\n"]$/

export function isStartOfValue(char: string): boolean {
  return regexStartOfValue.test(char)
}

const regexStartOfValue = /^[[{\w"-_]$/

export function isControlCharacter(code: number) {
  return (
    code === codeNewline ||
    code === codeReturn ||
    code === codeTab ||
    code === codeBackspace ||
    code === codeFormFeed
  )
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace(code: number): boolean {
  return code === codeSpace || code === codeNewline || code === codeTab || code === codeReturn
}

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

/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export function isQuote(code: number): boolean {
  // the first check double quotes, since that occurs most often
  return isDoubleQuote(code) || isSingleQuote(code)
}

/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export function isDoubleQuote(code: number): boolean {
  // the first check double quotes, since that occurs most often
  return code === codeDoubleQuote || code === codeDoubleQuoteLeft || code === codeDoubleQuoteRight
}

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
