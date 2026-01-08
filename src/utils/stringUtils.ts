const codeSpace = 0x20 // " "
const codeNewline = 0xa // "\n"
const codeTab = 0x9 // "\t"
const codeReturn = 0xd // "\r"
const codeNonBreakingSpace = 0xa0
const codeEnQuad = 0x2000
const codeHairSpace = 0x200a
const codeNarrowNoBreakSpace = 0x202f
const codeMediumMathematicalSpace = 0x205f
const codeIdeographicSpace = 0x3000

export function isHex(char: string): boolean {
  return /^[0-9A-Fa-f]$/.test(char)
}

export function isDigit(char: string): boolean {
  return char >= '0' && char <= '9'
}

export function isValidStringCharacter(char: string): boolean {
  // note that the valid range is between \u{0020} and \u{10ffff},
  // but in JavaScript it is not possible to create a code point larger than
  // \u{10ffff}, so there is no need to test for that here.
  return char >= '\u0020'
}

export function isDelimiter(char: string): boolean {
  return ',:[]/{}()\n+'.includes(char)
}

export function isFunctionNameCharStart(char: string) {
  return (
    (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$'
  )
}

export function isFunctionNameChar(char: string) {
  return (
    (char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z') ||
    char === '_' ||
    char === '$' ||
    (char >= '0' && char <= '9')
  )
}

// matches "https://" and other schemas
export const regexUrlStart = /^(http|https|ftp|mailto|file|data|irc):\/\/$/

// matches all valid URL characters EXCEPT "[", "]", and ",", since that are important JSON delimiters
export const regexUrlChar = /^[A-Za-z0-9-._~:/?#@!$&'()*+;=]$/

export function isUnquotedStringDelimiter(char: string): boolean {
  return ',[]/{}\n+'.includes(char)
}

export function isStartOfValue(char: string): boolean {
  return isQuote(char) || regexStartOfValue.test(char)
}

// alpha, number, minus, or opening bracket or brace
const regexStartOfValue = /^[[{\w-]$/

export function isControlCharacter(char: string) {
  return char === '\n' || char === '\r' || char === '\t' || char === '\b' || char === '\f'
}

export interface Text {
  charCodeAt: (index: number) => number
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export function isWhitespace(text: Text, index: number): boolean {
  const code = text.charCodeAt(index)

  return code === codeSpace || code === codeNewline || code === codeTab || code === codeReturn
}

/**
 * Check if the given character is a whitespace character like space or tab,
 * but NOT a newline
 */
export function isWhitespaceExceptNewline(text: Text, index: number): boolean {
  const code = text.charCodeAt(index)

  return code === codeSpace || code === codeTab || code === codeReturn
}

/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 */
export function isSpecialWhitespace(text: Text, index: number): boolean {
  const code = text.charCodeAt(index)

  return (
    code === codeNonBreakingSpace ||
    (code >= codeEnQuad && code <= codeHairSpace) ||
    code === codeNarrowNoBreakSpace ||
    code === codeMediumMathematicalSpace ||
    code === codeIdeographicSpace
  )
}

/**
 * Skip whitespace starting at the given index
 * @returns The index of the next non-whitespace character
 */
export function skipWhitespaceAtIndex(text: string, index: number): number {
  let i = index
  while (i < text.length && isWhitespace(text as unknown as Text, i)) {
    i++
  }
  return i
}

/**
 * Check if the given character indicates a valid end of a value
 */
export function isValidValueEndFollower(char: string | undefined): boolean {
  return char === undefined || char === '}' || char === ']' || char === ','
}

/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export function isQuote(char: string): boolean {
  // the first check double quotes, since that occurs most often
  return isDoubleQuoteLike(char) || isSingleQuoteLike(char)
}

/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export function isDoubleQuoteLike(char: string): boolean {
  return char === '"' || char === '\u201c' || char === '\u201d'
}

/**
 * Test whether the given character is a double quote character.
 * Does NOT test for special variants of double quotes.
 */
export function isDoubleQuote(char: string): boolean {
  return char === '"'
}

/**
 * Test whether the given character is a single quote character.
 * Also tests for special variants of single quotes.
 */
export function isSingleQuoteLike(char: string): boolean {
  return (
    char === "'" || char === '\u2018' || char === '\u2019' || char === '\u0060' || char === '\u00b4'
  )
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

  if (!isWhitespace(text, index - 1)) {
    // no trailing whitespaces
    return text + textToInsert
  }

  while (isWhitespace(text, index - 1)) {
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
