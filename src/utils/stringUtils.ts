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
export const codeZero = 0x30 // "0"
export const codeNine = 0x39 // "9"
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
const codeDoubleQuoteLeft = 0x201c // “
const codeDoubleQuoteRight = 0x201d // ”
const codeQuoteLeft = 0x2018 // ‘
const codeQuoteRight = 0x2019 // ’
const codeGraveAccent = 0x0060 // `
const codeAcuteAccent = 0x00b4 // ´

const regexHex = /^[0-9a-fA-F]$/

export function isHex(char: string): boolean {
  return regexHex.test(char)
}

const regexDigit = /^\d$/

export function isDigit(char: string): boolean {
  return regexDigit.test(char)
}

const regexValidStringCharacter = /^[\u{20}-\u{10ffff}]$/u

export function isValidStringCharacter(char: string): boolean {
  return regexValidStringCharacter.test(char)
}

export function isDelimiter(char: string): boolean {
  return regexDelimiter.test(char)
}

const regexDelimiter = /^[,:[\]/{}()\n+]$/
const regexUnquotedStringDelimiter = /^[,[\]/{}\n+]$/
export const regexFunctionNameCharStart = /^[a-zA-Z_$]$/
export const regexFunctionNameChar = /^[a-zA-Z_$0-9]$/

// matches "https://" and other schemas
export const regexUrlStart = /^(http|https|ftp|mailto|file|data|irc):\/\/$/

// matches all valid URL characters EXCEPT "[", "]", and ",", since that are important JSON delimiters
export const regexUrlChar = /^[A-Za-z0-9-._~:/?#@!$&'()*+;=]$/

export function isUnquotedStringDelimiter(char: string): boolean {
  return regexUnquotedStringDelimiter.test(char)
}

export function isStartOfValue(char: string): boolean {
  return regexStartOfValue.test(char) || isQuote(char)
}

// alpha, number, minus, or opening bracket or brace
const regexStartOfValue = /^[[{\w-]$/

const regexControlCharacter = /^[\n\r\t\b\f]$/

export function isControlCharacter(char: string) {
  return regexControlCharacter.test(char)
}

const regexWhitespace = /^[ \n\t\r]$/

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace(char: string): boolean {
  return regexWhitespace.test(char)
}

const regexWhitespaceExceptNewLine = /^[ \t\r]$/

/**
 * Check if the given character is a whitespace character like space or tab,
 * but NOT a newline
 */
export function isWhitespaceExceptNewline(char: string): boolean {
  return regexWhitespaceExceptNewLine.test(char)
}

const regexSpecialWhitespace = /^[\u{a0}\u{2000}-\u{200a}\u{202f}\u{205f}\u{3000}]$/u

/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 */
export function isSpecialWhitespace(char: string): boolean {
  return regexSpecialWhitespace.test(char)
}

/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export function isQuote(char: string): boolean {
  // the first check double quotes, since that occurs most often
  return isDoubleQuoteLike(char) || isSingleQuoteLike(char)
}

const regexDoubleQuoteLike = /^["\u{201c}\u{201d}]$/u

/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export function isDoubleQuoteLike(char: string): boolean {
  return regexDoubleQuoteLike.test(char)
}

/**
 * Test whether the given character is a double quote character.
 * Does NOT test for special variants of double quotes.
 */
export function isDoubleQuote(char: string): boolean {
  return char === '"'
}

const regexQuoteLike = /^['\u{2018}\u{2019}\u{0060}\u{00b4}]$/u

/**
 * Test whether the given character is a single quote character.
 * Also tests for special variants of single quotes.
 */
export function isSingleQuoteLike(char: string): boolean {
  return regexQuoteLike.test(char)
}

/**
 * Test whether the given character is a single quote character.
 * Does NOT test for special variants of single quotes.
 */
export function isSingleQuote(char: string): boolean {
  return char === "'"
}

/**
 * Strip last occurrence of textToStrip from text
 */
export function stripLastOccurrence(
  text: string,
  textToStrip: string,
  stripRemainingText = false
): string {
  const index = text.lastIndexOf(textToStrip)
  return index !== -1
    ? text.substring(0, index) + (stripRemainingText ? '' : text.substring(index + 1))
    : text
}

export function insertBeforeLastWhitespace(text: string, textToInsert: string): string {
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

export function removeAtIndex(text: string, start: number, count: number) {
  return text.substring(0, start) + text.substring(start + count)
}

/**
 * Test whether a string ends with a newline or comma character and optional whitespace
 */
export function endsWithCommaOrNewline(text: string): boolean {
  return /[,\n][ \t\r]*$/.test(text)
}
