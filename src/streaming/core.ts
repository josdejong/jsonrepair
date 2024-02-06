import { createInputBuffer } from './buffer/InputBuffer.js'
import { createOutputBuffer } from './buffer/OutputBuffer.js'
import { JSONRepairError } from '../utils/JSONRepairError.js'
import { Caret, createStack, StackType } from './stack.js'
import {
  codeAsterisk,
  codeBackslash,
  codeCloseParenthesis,
  codeClosingBrace,
  codeClosingBracket,
  codeColon,
  codeComma,
  codeDot,
  codeDoubleQuote,
  codeLowercaseE,
  codeMinus,
  codeNewline,
  codeOpeningBrace,
  codeOpeningBracket,
  codeOpenParenthesis,
  codePlus,
  codeSemicolon,
  codeSlash,
  codeUppercaseE,
  isControlCharacter,
  isDelimiter,
  isDigit,
  isDoubleQuote,
  isDoubleQuoteLike,
  isHex,
  isQuote,
  isSingleQuote,
  isSingleQuoteLike,
  isSpecialWhitespace,
  isStartOfValue,
  isValidStringCharacter,
  isWhitespace
} from '../utils/stringUtils.js'

const controlCharacters: { [key: string]: string } = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
}

// map with all escape characters
const escapeCharacters: { [key: string]: string } = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
  // note that \u is handled separately in parseString()
}

export interface JsonRepairCoreOptions {
  onData: (chunk: string) => void
  chunkSize?: number
  bufferSize?: number
}

export interface JsonRepairCore {
  transform: (chunk: string) => void
  flush: () => void
}

export function jsonrepairCore({
  onData,
  bufferSize = 65536,
  chunkSize = 65536
}: JsonRepairCoreOptions): JsonRepairCore {
  const input = createInputBuffer()

  const output = createOutputBuffer({
    write: onData,
    bufferSize,
    chunkSize
  })

  let i = 0
  let iFlushed = 0
  const stack = createStack()

  function flushInputBuffer() {
    while (iFlushed < i - bufferSize - chunkSize) {
      iFlushed += chunkSize
      input.flush(iFlushed)
    }
  }

  function transform(chunk: string) {
    input.push(chunk)

    while (i < input.currentLength() - bufferSize && parse()) {
      // loop until there is nothing more to process
    }

    flushInputBuffer()
  }

  function flush() {
    input.close()

    while (parse()) {
      // loop until there is nothing more to process
    }

    output.flush()
  }

  function parse(): boolean {
    parseWhitespaceAndSkipComments()

    switch (stack.type) {
      case StackType.object: {
        switch (stack.caret) {
          case Caret.beforeKey:
            return (
              parseObjectKey() ||
              parseUnexpectedColon() ||
              parseRepairTrailingComma() ||
              parseRepairObjectEndOrComma()
            )
          case Caret.beforeValue:
            return parseValue() || parseRepairMissingObjectValue()
          case Caret.afterValue:
            return parseObjectComma() || parseObjectEnd() || parseRepairObjectEndOrComma()
          default:
            return false
        }
      }

      case StackType.array: {
        switch (stack.caret) {
          case Caret.beforeValue:
            return parseValue() || parseRepairTrailingComma() || parseRepairArrayEnd()
          case Caret.afterValue:
            return (
              parseArrayComma() ||
              parseArrayEnd() ||
              parseRepairMissingComma() ||
              parseRepairArrayEnd()
            )
          default:
            return false
        }
      }

      case StackType.ndJson: {
        switch (stack.caret) {
          case Caret.beforeValue:
            return parseValue() || parseRepairTrailingComma()
          case Caret.afterValue:
            return parseArrayComma() || parseRepairMissingComma() || parseRepairNdJsonEnd()
          default:
            return false
        }
      }

      case StackType.functionCall: {
        switch (stack.caret) {
          case Caret.beforeValue:
            return parseValue()
          case Caret.afterValue:
            return parseFunctionCallEnd()
          default:
            return false
        }
      }

      case StackType.root: {
        switch (stack.caret) {
          case Caret.beforeValue:
            return parseValue() || parseUnexpectedEnd()
          case Caret.afterValue:
            return parseRootEnd()
          default:
            return false
        }
      }

      default:
        return false
    }
  }

  function parseValue(): boolean {
    return (
      parseObjectStart() ||
      parseArrayStart() ||
      parseString() ||
      parseNumber() ||
      parseKeywords() ||
      parseRepairUnquotedString()
    )
  }

  function parseObjectStart(): boolean {
    if (parseCharacter(codeOpeningBrace)) {
      parseWhitespaceAndSkipComments()
      if (parseCharacter(codeClosingBrace)) {
        return stack.update(Caret.afterValue)
      }

      return stack.push(StackType.object, Caret.beforeKey)
    }

    return false
  }

  function parseArrayStart(): boolean {
    if (parseCharacter(codeOpeningBracket)) {
      parseWhitespaceAndSkipComments()
      if (parseCharacter(codeClosingBracket)) {
        return stack.update(Caret.afterValue)
      }

      return stack.push(StackType.array, Caret.beforeValue)
    }

    return false
  }

  function parseRepairUnquotedString(): boolean {
    const unquotedStringEnd = findNextDelimiter()
    if (unquotedStringEnd !== null) {
      const symbol = input.substring(i, unquotedStringEnd)
      i = unquotedStringEnd

      if (skipCharacter(codeOpenParenthesis)) {
        // A MongoDB function call like NumberLong("2")
        // Or a JSONP function call like callback({...});
        // we strip the function call

        return stack.push(StackType.functionCall, Caret.beforeValue)
      }

      output.push(symbol === 'undefined' ? 'null' : JSON.stringify(symbol))

      if (input.charCodeAt(i) === codeDoubleQuote) {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++
      }

      return stack.update(Caret.afterValue)
    }

    return false
  }

  function parseRepairMissingObjectValue(): boolean {
    // repair missing object value
    output.push('null')
    return stack.update(Caret.afterValue)
  }

  function parseRepairTrailingComma(): boolean {
    // repair trailing comma
    if (output.endsWithIgnoringWhitespace(',')) {
      output.stripLastOccurrence(',')
      return stack.update(Caret.afterValue)
    }

    return false
  }

  function parseUnexpectedColon(): boolean {
    if (input.charCodeAt(i) === codeColon) {
      throwObjectKeyExpected()
    }

    return false
  }

  function parseUnexpectedEnd(): boolean {
    if (input.isEnd(i)) {
      throwUnexpectedEnd()
    } else {
      throwUnexpectedCharacter()
    }

    return false
  }

  function parseObjectKey(): boolean {
    const parsedKey = parseString() || parseUnquotedKey()
    if (parsedKey) {
      parseWhitespaceAndSkipComments()

      if (parseCharacter(codeColon)) {
        // expect a value after the :
        return stack.update(Caret.beforeValue)
      }

      const truncatedText = input.isEnd(i)
      if (isStartOfValue(input.charAt(i)) || truncatedText) {
        // repair missing colon
        output.insertBeforeLastWhitespace(':')
        return stack.update(Caret.beforeValue)
      }

      throwColonExpected()
    }

    return false
  }

  function parseObjectComma(): boolean {
    if (parseCharacter(codeComma)) {
      return stack.update(Caret.beforeKey)
    }

    return false
  }

  function parseObjectEnd(): boolean {
    if (parseCharacter(codeClosingBrace)) {
      return stack.pop()
    }

    return false
  }

  function parseRepairObjectEndOrComma(): true {
    // repair missing object end and trailing comma
    if (input.charAt(i) === '{') {
      output.stripLastOccurrence(',')
      output.insertBeforeLastWhitespace('}')
      return stack.pop()
    }

    // repair missing comma
    if (!input.isEnd(i) && isStartOfValue(input.charAt(i))) {
      output.insertBeforeLastWhitespace(',')
      return stack.update(Caret.beforeKey)
    }

    // repair missing closing brace
    output.insertBeforeLastWhitespace('}')
    return stack.pop()
  }

  function parseArrayComma(): boolean {
    if (parseCharacter(codeComma)) {
      return stack.update(Caret.beforeValue)
    }

    return false
  }

  function parseArrayEnd(): boolean {
    if (parseCharacter(codeClosingBracket)) {
      return stack.pop()
    }

    return false
  }

  function parseRepairMissingComma(): boolean {
    // repair missing comma
    if (!input.isEnd(i) && isStartOfValue(input.charAt(i))) {
      output.insertBeforeLastWhitespace(',')
      return stack.update(Caret.beforeValue)
    }

    return false
  }

  function parseRepairArrayEnd(): true {
    // repair missing closing bracket
    output.insertBeforeLastWhitespace(']')
    return stack.pop()
  }

  function parseRepairNdJsonEnd(): boolean {
    if (input.isEnd(i)) {
      output.push('\n]')
      return stack.pop()
    } else {
      throwUnexpectedEnd()
      return false // just to make TS happy
    }
  }

  function parseFunctionCallEnd(): true {
    if (skipCharacter(codeCloseParenthesis)) {
      skipCharacter(codeSemicolon)
    }

    return stack.pop()
  }

  function parseRootEnd(): boolean {
    const parsedComma = parseCharacter(codeComma)
    parseWhitespaceAndSkipComments()

    if (
      isStartOfValue(input.charAt(i)) &&
      (output.endsWithIgnoringWhitespace(',') || output.endsWithIgnoringWhitespace('\n'))
    ) {
      // start of a new value after end of the root level object: looks like
      // newline delimited JSON -> turn into a root level array
      if (!parsedComma) {
        // repair missing comma
        output.insertBeforeLastWhitespace(',')
      }

      output.unshift('[\n')

      return stack.push(StackType.ndJson, Caret.beforeValue)
    }

    if (parsedComma) {
      // repair: remove trailing comma
      output.stripLastOccurrence(',')

      return stack.update(Caret.afterValue)
    }

    // repair redundant end braces and brackets
    while (input.charCodeAt(i) === codeClosingBrace || input.charCodeAt(i) === codeClosingBracket) {
      i++
      parseWhitespaceAndSkipComments()
    }

    if (!input.isEnd(i)) {
      throwUnexpectedCharacter()
    }

    return false
  }

  function parseWhitespaceAndSkipComments(): boolean {
    const start = i

    let changed = parseWhitespace()
    do {
      changed = parseComment()
      if (changed) {
        changed = parseWhitespace()
      }
    } while (changed)

    return i > start
  }

  function parseWhitespace(): boolean {
    let whitespace = ''
    let normal: boolean
    while (
      (normal = isWhitespace(input.charCodeAt(i))) ||
      isSpecialWhitespace(input.charCodeAt(i))
    ) {
      if (normal) {
        whitespace += input.charAt(i)
      } else {
        // repair special whitespace
        whitespace += ' '
      }

      i++
    }

    if (whitespace.length > 0) {
      output.push(whitespace)
      return true
    }

    return false
  }

  function parseComment(): boolean {
    // find a block comment '/* ... */'
    if (input.charCodeAt(i) === codeSlash && input.charCodeAt(i + 1) === codeAsterisk) {
      // repair block comment by skipping it
      while (!input.isEnd(i) && !atEndOfBlockComment(i)) {
        i++
      }
      i += 2

      return true
    }

    // find a line comment '// ...'
    if (input.charCodeAt(i) === codeSlash && input.charCodeAt(i + 1) === codeSlash) {
      // repair line comment by skipping it
      while (!input.isEnd(i) && input.charCodeAt(i) !== codeNewline) {
        i++
      }

      return true
    }

    return false
  }

  function parseCharacter(code: number): boolean {
    if (input.charCodeAt(i) === code) {
      output.push(input.charAt(i))
      i++
      return true
    }

    return false
  }

  function skipCharacter(code: number): boolean {
    if (input.charCodeAt(i) === code) {
      i++
      return true
    }

    return false
  }

  function skipEscapeCharacter(): boolean {
    return skipCharacter(codeBackslash)
  }

  /**
   * Parse a string enclosed by double quotes "...". Can contain escaped quotes
   * Repair strings enclosed in single quotes or special quotes
   * Repair an escaped string
   *
   * The function can run in two stages:
   * - First, it assumes the string has a valid end quote
   * - If it turns out that the string does not have a valid end quote followed
   *   by a delimiter (which should be the case), the function runs again in a
   *   more conservative way, stopping the string at the first next delimiter
   *   and fixing the string by inserting a quote there.
   */
  function parseString(stopAtDelimiter = false): boolean {
    // we may need to revert
    const iBefore = i
    const oBefore = output.length()

    let skipEscapeChars = input.charCodeAt(i) === codeBackslash
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    const char = input.charCodeAt(i)
    if (isQuote(char)) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = isDoubleQuote(char)
        ? isDoubleQuote
        : isSingleQuote(char)
          ? isSingleQuote // eslint-disable-line indent
          : isSingleQuoteLike(char) // eslint-disable-line indent
            ? isSingleQuoteLike // eslint-disable-line indent
            : isDoubleQuoteLike // eslint-disable-line indent

      output.push('"')
      i++

      const isEndOfString = stopAtDelimiter
        ? (i: number) => isDelimiter(input.charAt(i))
        : (i: number) => isEndQuote(input.charCodeAt(i))

      while (!input.isEnd(i) && !isEndOfString(i)) {
        if (input.charCodeAt(i) === codeBackslash) {
          const char = input.charAt(i + 1)
          const escapeChar = escapeCharacters[char]
          if (escapeChar !== undefined) {
            output.push(input.substring(i, i + 2))
            i += 2
          } else if (char === 'u') {
            let j = 2
            while (j < 6 && isHex(input.charCodeAt(i + j))) {
              j++
            }

            if (j === 6) {
              output.push(input.substring(i, i + 6))
              i += 6
            } else if (input.isEnd(i + j)) {
              // repair invalid or truncated unicode char at the end of the text
              // by removing the unicode char and ending the string here
              i += j
            } else {
              throwInvalidUnicodeCharacter()
            }
          } else {
            // repair invalid escape character: remove it
            output.push(char)
            i += 2
          }
        } else {
          const char = input.charAt(i)
          const code = char.charCodeAt(0)

          if (code === codeDoubleQuote && input.charCodeAt(i - 1) !== codeBackslash) {
            // repair unescaped double quote
            output.push('\\' + char)
            i++
          } else if (isControlCharacter(code)) {
            // unescaped control character
            output.push(controlCharacters[char])
            i++
          } else {
            if (!isValidStringCharacter(code)) {
              throwInvalidCharacter(char)
            }
            output.push(char)
            i++
          }
        }

        if (skipEscapeChars) {
          // repair: skipped escape character (nothing to do)
          skipEscapeCharacter()
        }
      }

      const hasEndQuote = isQuote(input.charCodeAt(i))
      if (hasEndQuote) {
        output.push('"')
        i++
      } else {
        // repair missing quote
        output.insertBeforeLastWhitespace('"')
      }

      parseWhitespaceAndSkipComments()

      // See whether we have:
      // (a) An end quote which is not followed by a valid delimiter
      // (b) No end quote and reached the end of the input
      // If so, revert parsing this string and try again, running in a more
      // conservative mode, stopping at the first next delimiter
      const isAtEnd = input.isEnd(i)
      const nextIsDelimiter = isDelimiter(input.charAt(i))
      if (
        !stopAtDelimiter &&
        ((hasEndQuote && !isAtEnd && !nextIsDelimiter) || (!hasEndQuote && isAtEnd))
      ) {
        i = iBefore
        output.remove(oBefore)
        return parseString(true)
      }

      parseConcatenatedString()

      return stack.update(Caret.afterValue)
    }

    return false
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function parseConcatenatedString(): boolean {
    const start = i

    parseWhitespaceAndSkipComments()
    while (input.charCodeAt(i) === codePlus) {
      i++
      parseWhitespaceAndSkipComments()

      // repair: remove the end quote of the first string
      output.stripLastOccurrence('"', true)
      const start = output.length()
      const parsedStr = parseString()
      if (parsedStr) {
        // repair: remove the start quote of the second string
        output.remove(start, start + 1)
      } else {
        // repair: remove the + because it is not followed by a string
        output.insertBeforeLastWhitespace('"')
      }
    }

    return i > start
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber(): boolean {
    const start = i
    if (input.charCodeAt(i) === codeMinus) {
      i++
      if (expectDigitOrRepair(start)) {
        return stack.update(Caret.afterValue)
      }
    }

    // Note that in JSON leading zeros like "00789" are not allowed.
    // We will allow all leading zeros here though and at the end of parseNumber
    // check against trailing zeros and repair that if needed.
    // Leading zeros can have meaning, so we should not clear them.
    while (isDigit(input.charCodeAt(i))) {
      i++
    }

    if (input.charCodeAt(i) === codeDot) {
      i++
      if (expectDigitOrRepair(start)) {
        return stack.update(Caret.afterValue)
      }
      while (isDigit(input.charCodeAt(i))) {
        i++
      }
    }

    if (input.charCodeAt(i) === codeLowercaseE || input.charCodeAt(i) === codeUppercaseE) {
      i++
      if (input.charCodeAt(i) === codeMinus || input.charCodeAt(i) === codePlus) {
        i++
      }
      if (expectDigitOrRepair(start)) {
        return stack.update(Caret.afterValue)
      }
      while (isDigit(input.charCodeAt(i))) {
        i++
      }
    }

    if (i > start) {
      // repair a number with leading zeros like "00789"
      const num = input.substring(start, i)
      const hasInvalidLeadingZero = /^0\d/.test(num)

      output.push(hasInvalidLeadingZero ? `"${num}"` : num)
      return stack.update(Caret.afterValue)
    }

    return false
  }

  /**
   * Parse keywords true, false, null
   * Repair Python keywords True, False, None
   */
  function parseKeywords(): boolean {
    return (
      parseKeyword('true', 'true') ||
      parseKeyword('false', 'false') ||
      parseKeyword('null', 'null') ||
      // repair Python keywords True, False, None
      parseKeyword('True', 'true') ||
      parseKeyword('False', 'false') ||
      parseKeyword('None', 'null')
    )
  }

  function parseKeyword(name: string, value: string): boolean {
    if (input.substring(i, i + name.length) === name) {
      output.push(value)
      i += name.length
      return stack.update(Caret.afterValue)
    }

    return false
  }

  function parseUnquotedKey(): boolean {
    let end = findNextDelimiter()

    if (end !== null) {
      // first, go back to prevent getting trailing whitespaces in the string
      while (isWhitespace(input.charCodeAt(end - 1)) && end > i) {
        end--
      }

      const symbol = input.substring(i, end)
      output.push(JSON.stringify(symbol))
      i = end

      if (input.charCodeAt(i) === codeDoubleQuote) {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++
      }

      return stack.update(Caret.afterValue) // we do not have a state Caret.afterKey, therefore we use afterValue here
    }

    return false
  }

  function findNextDelimiter(): number | null {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    let j = i
    while (!input.isEnd(j) && !isDelimiter(input.charAt(j))) {
      j++
    }

    return j > i ? j : null
  }

  function expectDigit(start: number) {
    if (!isDigit(input.charCodeAt(i))) {
      const numSoFar = input.substring(start, i)
      throw new JSONRepairError(`Invalid number '${numSoFar}', expecting a digit ${got()}`, i)
    }
  }

  function expectDigitOrRepair(start: number) {
    if (input.isEnd(i)) {
      // repair numbers cut off at the end
      // this will only be called when we end after a '.', '-', or 'e' and does not
      // change the number more than it needs to make it valid JSON
      output.push(input.substring(start, i) + '0')
      return true
    } else {
      expectDigit(start)
      return false
    }
  }

  function throwInvalidCharacter(char: string) {
    throw new JSONRepairError('Invalid character ' + JSON.stringify(char), i)
  }

  function throwUnexpectedCharacter() {
    throw new JSONRepairError('Unexpected character ' + JSON.stringify(input.charAt(i)), i)
  }

  function throwUnexpectedEnd() {
    throw new JSONRepairError('Unexpected end of json string', i)
  }

  function throwObjectKeyExpected() {
    throw new JSONRepairError('Object key expected', i)
  }

  function throwColonExpected() {
    throw new JSONRepairError('Colon expected', i)
  }

  function throwInvalidUnicodeCharacter() {
    const chars = input.substring(i, i + 6)
    throw new JSONRepairError(`Invalid unicode character "${chars}"`, i)
  }

  function got(): string {
    const char = input.charAt(i)
    return char ? `but got '${char}'` : 'but reached end of input'
  }

  function atEndOfBlockComment(i: number) {
    return input.charAt(i) === '*' && input.charAt(i + 1) === '/'
  }

  return {
    transform,
    flush
  }
}
