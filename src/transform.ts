import { createInputBuffer } from './buffer/InputBuffer.js'
import { createOutputBuffer } from './buffer/OutputBuffer.js'
import { JSONRepairError } from './JSONRepairError.js'
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
} from './stringUtils.js'

export interface TransformProps {
  onData: (chunk: string) => void
  chunkSize?: number
  bufferSize?: number
}

export interface Transform {
  transform: (chunk: string) => void
  flush: () => void
}

// TODO: change to numbers if faster?
// TODO: change to a normal object so it is serializable?
enum Expect {
  value = 'value',
  commaOrEnd = 'commaOrEnd',
  objectKey = 'objectKey'
  // colon = 'colon',
  // objectKeySeparator = 'objectKeySeparator',
  // objectSeparatorOrEnd = 'objectSeparatorOrEnd'
}

// TODO: change to numbers if faster?
// TODO: change to a normal object so it is serializable?
enum StackType {
  root = 'root',
  object = 'object',
  array = 'array'
}

type StackEntry = {
  type: StackType
  expect: Expect
}

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

export function jsonrepairTransform({
  onData,
  bufferSize = 65536,
  chunkSize = 65536
}: TransformProps): Transform {
  const input = createInputBuffer()

  const output = createOutputBuffer({
    write: onData,
    bufferSize,
    chunkSize
  })

  let i = 0
  let closed = false
  const stack: StackEntry[] = [{ type: StackType.root, expect: Expect.value }]

  // TODO: test flushInputBuffer
  function flushInputBuffer() {
    while (input.currentBufferSize() > bufferSize + chunkSize) {
      input.flush(chunkSize)
    }
  }

  function transform(chunk: string) {
    input.push(chunk)

    while (input.currentBufferSize() > bufferSize && process()) {
      // loop until there is nothing more to process
    }

    flushInputBuffer()
  }

  function flush() {
    closed = true

    while (process()) {
      // loop until there is nothing more to process
    }

    output.close()
  }

  function process(): boolean {
    console.log('process', last(stack))
    const state = last(stack)
    // console.log('process', { i, state }) // TODO

    if (!state) {
      // end reached
      // TODO: should have an explicit Expect.end in the state instead
      // FIXME: verify whether something has been processed
      // FIXME: parse Newline delimited JSON
      // FIXME: repair redundant end quotes

      throwUnexpectedEnd()

      return false
    }

    parseWhitespaceAndSkipComments()

    switch (last(stack).expect) {
      case Expect.value: {
        if (parseObjectStart()) {
          last(stack).expect = Expect.commaOrEnd

          parseWhitespaceAndSkipComments()
          if (parseObjectEnd()) {
            return true
          }

          stack.push({
            type: StackType.object,
            expect: Expect.objectKey
          })

          return true
        }

        if (parseArrayStart()) {
          last(stack).expect = Expect.commaOrEnd

          parseWhitespaceAndSkipComments()
          if (parseArrayEnd()) {
            return true
          }

          stack.push({
            type: StackType.array,
            expect: Expect.value
          })

          return true
        }

        const processed = parseString() || parseNumber() || parseKeywords() || parseUnquotedString()
        if (processed) {
          last(stack).expect = Expect.commaOrEnd
          return true
        }

        if (last(stack).type === StackType.object) {
          // repair missing object value
          output.push('null')
          last(stack).expect = Expect.commaOrEnd
          return true
        }

        if (last(stack).type === StackType.array) {
          // repair trailing comma
          output.stripLastOccurrence(',')
          last(stack).expect = Expect.commaOrEnd
          return true
        }

        if (input.isEnd(i)) {
          throwUnexpectedEnd()
        } else {
          throwUnexpectedCharacter()
        }
      }

      case Expect.commaOrEnd: {
        switch (last(stack).type) {
          case StackType.object: {
            if (parseCharacter(codeComma)) {
              last(stack).expect = Expect.objectKey
              return true
            }

            if (parseObjectEnd()) {
              stack.pop()
              return true
            }

            // repair missing object end and trailing comma
            if (input.charAt(i) === '{') {
              output.stripLastOccurrence(',')
              output.insertBeforeLastWhitespace('}')
              stack.pop()
              return true
            }

            // repair missing comma
            if (!input.isEnd(i) && isStartOfValue(input.charAt(i))) {
              output.insertBeforeLastWhitespace(',')
              last(stack).expect = Expect.objectKey
              return true
            }

            // repair missing closing brace
            output.insertBeforeLastWhitespace('}')
            stack.pop()
            return true
          }

          case StackType.array: {
            if (parseCharacter(codeComma)) {
              last(stack).expect = Expect.value
              return true
            }

            if (parseArrayEnd()) {
              stack.pop()
              return true
            }

            // repair missing comma
            if (!input.isEnd(i) && isStartOfValue(input.charAt(i))) {
              output.insertBeforeLastWhitespace(',')
              last(stack).expect = Expect.value
              return true
            }

            // repair missing closing bracket
            output.insertBeforeLastWhitespace(']')
            stack.pop()
            return true
          }

          case StackType.root: {
            const processedComma = parseCharacter(codeComma)
            parseWhitespaceAndSkipComments()

            // FIXME
            // if (isStartOfValue(input.charAt(i)) && output.endsWithCommaOrNewline()) {
            //   // start of a new value after end of the root level object: looks like
            //   // newline delimited JSON -> turn into a root level array
            //   if (!processedComma) {
            //     // repair missing comma
            //     output.insertBeforeLastWhitespace(',')
            //   }
            //
            //   parseNewlineDelimitedJSON()
            // }

            if (processedComma) {
              // repair: remove trailing comma
              output.stripLastOccurrence(',')

              return true
            }

            // repair redundant end braces and brackets
            while (
              input.charCodeAt(i) === codeClosingBrace ||
              input.charCodeAt(i) === codeClosingBracket
            ) {
              i++
              parseWhitespaceAndSkipComments()
            }

            return false
          }

          default:
            return false
        }
      }

      case Expect.objectKey: {
        const processedKey = parseString() || parseUnquotedString()
        if (processedKey) {
          parseWhitespaceAndSkipComments()

          if (parseCharacter(codeColon)) {
            // expect a value after the :
            last(stack).expect = Expect.value
            return true
          }

          const truncatedText = input.isEnd(i)
          if (isStartOfValue(input.charAt(i)) || truncatedText) {
            // repair missing colon
            output.insertBeforeLastWhitespace(':')
            last(stack).expect = Expect.value
            return true
          }

          throwColonExpected()
        }

        // repair trailing comma
        output.stripLastOccurrence(',')
        last(stack).expect = Expect.commaOrEnd
        return true
      }
    }
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

  function parseObjectStart(): boolean {
    return parseCharacter(codeOpeningBrace)
  }

  function parseObjectEnd(): boolean {
    return parseCharacter(codeClosingBrace)
  }

  function parseArrayStart(): boolean {
    return parseCharacter(codeOpeningBracket)
  }

  function parseArrayEnd(): boolean {
    return parseCharacter(codeClosingBracket)
  }

  /**
   * Parse and repair Newline Delimited JSON (NDJSON):
   * multiple JSON objects separated by a newline character
   */
  function parseNewlineDelimitedJSON() {
    // repair NDJSON
    output.unshift('[\n')

    let initial = true
    let processedValue = true
    while (processedValue) {
      if (!initial) {
        // parse optional comma, insert when missing
        const processedComma = parseCharacter(codeComma)
        if (!processedComma) {
          // repair: add missing comma
          output.insertBeforeLastWhitespace(',')
        }
      } else {
        initial = false
      }

      // FIXME
      // processedValue = parseValue()
    }

    if (!processedValue) {
      // repair: remove trailing comma
      output.stripLastOccurrence(',')
    }

    // repair: wrap the output inside array brackets
    output.push('\n]')
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
    const iBefore = i // we may need to revert

    let skipEscapeChars = input.charCodeAt(i) === codeBackslash
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    if (isQuote(input.charCodeAt(i))) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = isDoubleQuote(input.charCodeAt(i))
        ? isDoubleQuote
        : isSingleQuote(input.charCodeAt(i))
        ? isSingleQuote // eslint-disable-line indent
        : isSingleQuoteLike(input.charCodeAt(i)) // eslint-disable-line indent
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
            if (
              isHex(input.charCodeAt(i + 2)) &&
              isHex(input.charCodeAt(i + 3)) &&
              isHex(input.charCodeAt(i + 4)) &&
              isHex(input.charCodeAt(i + 5))
            ) {
              output.push(input.substring(i, i + 6))
              i += 6
            } else {
              throwInvalidUnicodeCharacter(i)
            }
          } else {
            // repair invalid escape character: remove it
            output.push(char)
            i += 2
          }
        } else {
          const char = input.charAt(i)
          const code = input.charCodeAt(i)

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
          const processed = skipEscapeCharacter()
          if (processed) {
            // repair: skipped escape character (nothing to do)
          }
        }
      }

      // see whether we have an end quote followed by a valid delimiter
      const hasEndQuote = isQuote(input.charCodeAt(i))
      const valid =
        hasEndQuote && (input.isEnd(i + 1) || isDelimiter(nextNonWhiteSpaceCharacter(i + 1)))

      if (!valid && !stopAtDelimiter) {
        // we're dealing with a missing quote somewhere. Let's revert parsing
        // this string and try again, running in a more conservative mode,
        // stopping at the first next delimiter
        i = iBefore
        output.remove(iBefore)
        return parseString(true)
      }

      if (hasEndQuote) {
        output.push('"')
        i++
      } else {
        // repair missing quote
        output.insertBeforeLastWhitespace('"')
      }

      parseConcatenatedString()

      return true
    }

    return false
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function parseConcatenatedString(): boolean {
    let processed = false

    parseWhitespaceAndSkipComments()
    while (input.charCodeAt(i) === codePlus) {
      processed = true
      i++
      parseWhitespaceAndSkipComments()

      // repair: remove the end quote of the first string
      output.stripLastOccurrence('"', true)
      const start = output.length()
      parseString()

      // repair: remove the start quote of the second string
      output.remove(start, start + 1)
    }

    return processed
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber(): boolean {
    const start = i
    if (input.charCodeAt(i) === codeMinus) {
      i++
      if (expectDigitOrRepair(start)) {
        return true
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
        return true
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
        return true
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
      return true
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
      return true
    }

    return false
  }

  /**
   * Repair and unquoted string by adding quotes around it
   * Repair a MongoDB function call like NumberLong("2")
   * Repair a JSONP function call like callback({...});
   */
  function parseUnquotedString(): boolean {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    const start = i
    while (!input.isEnd(i) && !isDelimiter(input.charAt(i))) {
      i++
    }

    if (i > start) {
      if (input.charCodeAt(i) === codeOpenParenthesis) {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        i++

        // FIXME
        // parseValue()

        if (input.charCodeAt(i) === codeCloseParenthesis) {
          // repair: skip close bracket of function call
          i++
          if (input.charCodeAt(i) === codeSemicolon) {
            // repair: skip semicolon after JSONP call
            i++
          }
        }

        return true
      } else {
        // repair unquoted string
        // also, repair undefined into null

        // first, go back to prevent getting trailing whitespaces in the string
        while (isWhitespace(input.charCodeAt(i - 1)) && i > 0) {
          i--
        }

        const symbol = input.substring(start, i)
        output.push(symbol === 'undefined' ? 'null' : JSON.stringify(symbol))

        if (input.charCodeAt(i) === codeDoubleQuote) {
          // we had a missing start quote, but now we encountered the end quote, so we can skip that one
          i++
        }

        return true
      }
    }

    return false
  }

  function nextNonWhiteSpaceCharacter(start: number): string {
    let i = start

    while (isWhitespace(input.charCodeAt(i))) {
      i++
    }

    return input.charAt(i)
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

  function throwInvalidUnicodeCharacter(start: number) {
    let end = start + 2
    while (/\w/.test(input.charAt(end))) {
      end++
    }
    const chars = input.substring(start, end)
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

function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}
