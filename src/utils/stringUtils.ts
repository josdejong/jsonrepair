const codeSpace = 0x20 // " "
const codeNewline = 0xa // "\n"
const codeTab = 0x9 // "\t"
const codeReturn = 0xd // "\r"

// unicode spaces: https://jkorpela.fi/chars/spaces.html
const codeNonBreakingSpace = 0x00a0
const codeMongolianVowelSeparator = 0x180e
const codeEnQuad = 0x2000
const codeZeroWidthSpace = 0x200b
const codeNarrowNoBreakSpace = 0x202f
const codeMediumMathematicalSpace = 0x205f
const codeIdeographicSpace = 0x3000
const codeZeroWidthNoBreakSpace = 0xfeff

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
    code === codeMongolianVowelSeparator ||
    (code >= codeEnQuad && code <= codeZeroWidthSpace) ||
    code === codeNarrowNoBreakSpace ||
    code === codeMediumMathematicalSpace ||
    code === codeIdeographicSpace ||
    code === codeZeroWidthNoBreakSpace
  )
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

const namedHtmlEntities: { [key: string]: string } = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&apos;': "'"
}

// the longest entity we need to recognize is a numeric one like "&#x10FFFF;"
// (10 chars), so a window of 12 characters is always enough
export const maxHtmlEntityLength = 12

export interface HtmlEntityMatch {
  char: string // the decoded character
  length: number // number of source characters consumed, including & and ;
}

/**
 * Try to match an HTML entity at the start of the given window. The window is a
 * small slice of text that begins exactly at the candidate '&'. Returns the
 * decoded character and the number of characters consumed, or null when there
 * is no complete, valid entity (for example a truncated "&quot" without ';').
 */
export function matchHtmlEntity(window: string): HtmlEntityMatch | null {
  if (window.charAt(0) !== '&') {
    return null
  }

  const semicolon = window.indexOf(';')
  if (semicolon === -1) {
    return null
  }

  const entity = window.substring(0, semicolon + 1)
  const named = namedHtmlEntities[entity]
  if (named !== undefined) {
    return { char: named, length: entity.length }
  }

  if (window.charAt(1) === '#') {
    const body = window.substring(2, semicolon)
    const hex = body.charAt(0) === 'x' || body.charAt(0) === 'X'
    const digits = hex ? body.substring(1) : body
    if (digits.length > 0) {
      const code = Number.parseInt(digits, hex ? 16 : 10)
      if (!Number.isNaN(code) && code >= 0 && code <= 0x10ffff) {
        return { char: String.fromCodePoint(code), length: entity.length }
      }
    }
  }

  return null
}

/**
 * Test whether a matched HTML entity decodes to a double quote character
 */
export function isDoubleQuoteEntity(match: HtmlEntityMatch | null): boolean {
  return match !== null && match.char === '"'
}

/**
 * Test whether a matched HTML entity decodes to a single quote character
 */
export function isSingleQuoteEntity(match: HtmlEntityMatch | null): boolean {
  return match !== null && match.char === "'"
}

/**
 * Count the number of occurrences of a single character in a string
 */
export function countOccurrences(text: string, char: string): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) === char) {
      count++
    }
  }
  return count
}

/**
 * Test whether `closeChar` is a closing bracket and `text` still contains an
 * unmatched opening bracket of the same kind. This indicates that the end of
 * `text` is located inside the brackets, for example the quote in
 * `"a (b") c"` is followed by `)` while `(` is still unclosed.
 *
 * Note that the (potentially expensive) counting is only performed when
 * `closeChar` actually is a closing bracket.
 */
export function isInsideUnclosedBracket(text: string, closeChar: string): boolean {
  switch (closeChar) {
    case ')':
      return countOccurrences(text, '(') > countOccurrences(text, ')')
    case ']':
      return countOccurrences(text, '[') > countOccurrences(text, ']')
    case '}':
      return countOccurrences(text, '{') > countOccurrences(text, '}')
    default:
      return false
  }
}
