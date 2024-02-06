import { createGeneratorInputBuffer } from './buffer/GeneratorInputBuffer'
import { createOutputBuffer } from '../streaming/buffer/OutputBuffer'
import { JSONRepairError } from '../utils/JSONRepairError.js'
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

export interface JsonRepairGeneratorOptions {
  onData: (chunk: string) => void
  chunkSize?: number
  bufferSize?: number
}

export interface JsonRepairGenerator {
  transform: (chunk: string) => void
  flush: () => void
}

/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     try {
 *       const json = "{name: 'John'}"
 *       const repaired = jsonrepair(json)
 *       console.log(repaired)
 *       // '{"name": "John"}'
 *     } catch (err) {
 *       console.error(err)
 *     }
 *
 */
export function jsonrepairGenerator({
  onData,
  bufferSize = 65536,
  chunkSize = 65536
}: JsonRepairGeneratorOptions): JsonRepairGenerator {
  let i = 0 // current index in text

  const input = createGeneratorInputBuffer()

  const output = createOutputBuffer({
    write: onData,
    bufferSize,
    chunkSize
  })

  const it = parse()

  return {
    transform: function(chunk) {
      input.push(chunk)
      it.next()
    },
    flush: function() {
      input.close()

      while (!it.next().done) {
        /* flush everything */
      }

      output.flush()
    }
  }

  function* parse() : Generator<void, void> {
    const processed: boolean = yield* parseValue()
    if (!processed) {
      throwUnexpectedEnd()
    }

    const processedComma: boolean = yield* parseCharacter(codeComma)
    if (processedComma) {
      yield* parseWhitespaceAndSkipComments()
    }

    if (
      isStartOfValue((yield* input.charAt(i))) &&
      (output.endsWithIgnoringWhitespace(',') || output.endsWithIgnoringWhitespace('\n'))
    ) {
      // start of a new value after end of the root level object: looks like
      // newline delimited JSON -> turn into a root level array
      if (!processedComma) {
        // repair missing comma
        output.insertBeforeLastWhitespace(',')
      }

      yield* parseNewlineDelimitedJSON()
    } else if (processedComma) {
      // repair: remove trailing comma
      output.stripLastOccurrence(',')
    }

    // repair redundant end quotes
    while ((yield* input.charCodeAt(i)) === codeClosingBrace || (yield* input.charCodeAt(i)) === codeClosingBracket) {
      i++
      yield* parseWhitespaceAndSkipComments()
    }

    if (!(yield* input.isEnd(i))) {
      yield* throwUnexpectedCharacter()
    }

    // reached the end of the document properly
  }

  function* parseValue(): Generator<void, boolean> {
    yield* parseWhitespaceAndSkipComments()

    const processed =
      (yield* parseObject()) ||
      (yield* parseArray()) ||
      (yield* parseString()) ||
      (yield* parseNumber()) ||
      (yield* parseKeywords()) ||
      (yield* parseUnquotedString())

    yield* parseWhitespaceAndSkipComments()

    return processed
  }

  function* parseWhitespaceAndSkipComments(): Generator<void, boolean> {
    const start = i

    let changed: boolean = yield* parseWhitespace()
    do {
      changed = yield* parseComment()
      if (changed) {
        changed = yield* parseWhitespace()
      }
    } while (changed)

    return i > start
  }

  function* parseWhitespace(): Generator<void, boolean> {
    let whitespace = ''
    let normal: boolean
    while (
      (normal = isWhitespace(yield* input.charCodeAt(i))) ||
      isSpecialWhitespace(yield* input.charCodeAt(i))
    ) {
      if (normal) {
        whitespace += yield* input.charAt(i)
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

  function* parseComment(): Generator<void, boolean> {
    // find a block comment '/* ... */'
    if (
      (yield* input.charCodeAt(i)) === codeSlash &&
      (yield* input.charCodeAt(i + 1)) === codeAsterisk
    ) {
      // repair block comment by skipping it
      while (
        !(yield* input.isEnd(i)) &&
        !(yield* atEndOfBlockComment(i))
      ) {
        i++
      }
      i += 2

      return true
    }

    // find a line comment '// ...'
    if (
      (yield* input.charCodeAt(i)) === codeSlash &&
      (yield* input.charCodeAt(i + 1)) === codeSlash
    ) {
      // repair line comment by skipping it
      while (
        !(yield* input.isEnd(i)) &&
        (yield* input.charCodeAt(i)) !== codeNewline
      ) {
        i++
      }

      return true
    }

    return false
  }

  function* parseCharacter(code: number): Generator<void, boolean> {
    if ((yield* input.charCodeAt(i)) === code) {
      output.push(yield* input.charAt(i))
      i++
      return true
    }

    return false
  }

  function* skipCharacter(code: number): Generator<void, boolean> {
    if ((yield* input.charCodeAt(i)) === code) {
      i++
      return true
    }

    return false
  }

  function* skipEscapeCharacter(): Generator<void, boolean> {
    return yield* skipCharacter(codeBackslash)
  }

  /**
   * Parse an object like '{"key": "value"}'
   */
  function* parseObject(): Generator<void, boolean> {
    if ((yield* input.charCodeAt(i)) === codeOpeningBrace) {
      output.push('{')
      i++
      yield* parseWhitespaceAndSkipComments()

      let initial = true
      while (
        !(yield* input.isEnd(i)) &&
        (yield* input.charCodeAt(i)) !== codeClosingBrace
      ) {
        let processedComma
        if (!initial) {
          processedComma = yield* parseCharacter(codeComma)
          if (!processedComma) {
            // repair missing comma
            output.insertBeforeLastWhitespace(',')
          }
          yield* parseWhitespaceAndSkipComments()
        } else {
          processedComma = true
          initial = false
        }

        const processedKey = (yield* parseString()) || (yield* parseUnquotedString())
        if (!processedKey) {
          const char = yield* input.charCodeAt(i)
          if (
            char === codeClosingBrace ||
            char === codeOpeningBrace ||
            char === codeClosingBracket ||
            char === codeOpeningBracket ||
            (yield* input.isEnd(i))
          ) {
            // repair trailing comma
            output.stripLastOccurrence(',')
          } else {
            throwObjectKeyExpected()
          }
          break
        }

        yield* parseWhitespaceAndSkipComments()
        const processedColon: boolean = yield* parseCharacter(codeColon)
        const truncatedText: boolean = yield* input.isEnd(i)
        if (!processedColon) {
          if (isStartOfValue(yield* input.charAt(i)) || truncatedText) {
            // repair missing colon
            output.insertBeforeLastWhitespace(':')
          } else {
            throwColonExpected()
          }
        }
        const processedValue: boolean = yield* parseValue()
        if (!processedValue) {
          if (processedColon || truncatedText) {
            // repair missing object value
            output.push('null')
          } else {
            throwColonExpected()
          }
        }
      }

      if ((yield* input.charCodeAt(i)) === codeClosingBrace) {
        output.push('}')
        i++
      } else {
        // repair missing end bracket
        output.insertBeforeLastWhitespace('}')
      }

      return true
    }

    return false
  }

  /**
   * Parse an array like '["item1", "item2", ...]'
   */
  function* parseArray(): Generator<void, boolean> {
    if ((yield* input.charCodeAt(i)) === codeOpeningBracket) {
      output.push('[')
      i++
      yield* parseWhitespaceAndSkipComments()

      let initial = true
      while (
        !(yield* input.isEnd(i)) &&
        (yield* input.charCodeAt(i)) !== codeClosingBracket
      ) {
        if (!initial) {
          const processedComma: boolean = yield* parseCharacter(codeComma)
          if (!processedComma) {
            // repair missing comma
            output.insertBeforeLastWhitespace(',')
          }
        } else {
          initial = false
        }

        const processedValue: boolean = yield* parseValue()
        if (!processedValue) {
          // repair trailing comma
          output.stripLastOccurrence(',')
          break
        }
      }

      if ((yield* input.charCodeAt(i)) === codeClosingBracket) {
        output.push(']')
        i++
      } else {
        // repair missing closing array bracket
        output.insertBeforeLastWhitespace(']')
      }

      return true
    }

    return false
  }

  /**
   * Parse and repair Newline Delimited JSON (NDJSON):
   * multiple JSON objects separated by a newline character
   */
  function* parseNewlineDelimitedJSON() : Generator<void, void> {
    // repair NDJSON
    let initial = true
    let processedValue = true
    while (processedValue) {
      if (!initial) {
        // parse optional comma, insert when missing
        const processedComma: boolean = yield* parseCharacter(codeComma)
        if (!processedComma) {
          // repair: add missing comma
          output.insertBeforeLastWhitespace(',')
        }
      } else {
        initial = false
      }

      processedValue = yield* parseValue()
    }

    if (!processedValue) {
      // repair: remove trailing comma
      output.stripLastOccurrence(',')
    }

    // repair: wrap the output inside array brackets
    output.unshift('[\n')
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
  function* parseString(stopAtDelimiter = false): Generator<void, boolean> {
    let skipEscapeChars = (yield* input.charCodeAt(i)) === codeBackslash
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    const char = yield* input.charCodeAt(i)
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

      // we may need to revert
      const iBefore = i
      const oBefore = output.length()

      output.push('"')
      i++

      const isEndOfString = stopAtDelimiter
        ? function* (i: number) {
          return isDelimiter(yield* input.charAt(i))
        }
        : function* (i: number) {
          return isEndQuote(yield* input.charCodeAt(i))
        }

      while (
        !(yield* input.isEnd(i)) &&
        !(yield* isEndOfString(i))
      ) {
        if ((yield* input.charCodeAt(i)) === codeBackslash) {
          const char = yield* input.charAt(i + 1)
          const escapeChar = escapeCharacters[char]
          if (escapeChar !== undefined) {
            output.push(yield* input.substring(i, i + 2))
            i += 2
          } else if (char === 'u') {
            let j = 2
            while (j < 6 && isHex(yield* input.charCodeAt(i + j))) {
              j++
            }

            if (j === 6) {
              output.push(yield* input.substring(i, i + 6))
              i += 6
            } else if (yield* input.isEnd(i + j)) {
              // repair invalid or truncated unicode char at the end of the text
              // by removing the unicode char and ending the string here
              i += j
            } else {
              yield* throwInvalidUnicodeCharacter()
            }
          } else {
            // repair invalid escape character: remove it
            output.push(char)
            i += 2
          }
        } else {
          const char = (yield* input.charAt(i))
          const code = char.charCodeAt(0)

          if (
            code === codeDoubleQuote &&
            (yield* input.charCodeAt(i - 1)) !== codeBackslash
          ) {
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
          yield* skipEscapeCharacter()
        }
      }

      const hasEndQuote = isQuote(yield* input.charCodeAt(i))
      if (hasEndQuote) {
        output.push('"')
        i++
      } else {
        // repair missing quote
        output.insertBeforeLastWhitespace('"')
      }

      yield* parseWhitespaceAndSkipComments()

      // See whether we have:
      // (a) An end quote which is not followed by a valid delimiter
      // (b) No end quote and reached the end of the input
      // If so, revert parsing this string and try again, running in a more
      // conservative mode, stopping at the first next delimiter
      const isAtEnd = yield* input.isEnd(i)
      const nextIsDelimiter = isDelimiter(yield* input.charAt(i))
      if (
        !stopAtDelimiter &&
        ((hasEndQuote && !isAtEnd && !nextIsDelimiter) || (!hasEndQuote && isAtEnd))
      ) {
        i = iBefore
        output.remove(oBefore)
        return yield* parseString(true)
      }

      yield* parseConcatenatedString()

      return true
    }

    return false
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function* parseConcatenatedString(): Generator<void, boolean> {
    const start = i

    yield* parseWhitespaceAndSkipComments()
    while ((yield* input.charCodeAt(i)) === codePlus) {
      i++
      yield* parseWhitespaceAndSkipComments()

      // repair: remove the end quote of the first string
      output.stripLastOccurrence('"', true)
      const end = output.length()
      const parsedStr: boolean = yield* parseString()
      if (parsedStr) {
        // repair: remove the start quote of the second string
        output.remove(end, end + 1)
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
  function* parseNumber(): Generator<void, boolean> {
    const start = i
    if ((yield* input.charCodeAt(i)) === codeMinus) {
      i++
      if (yield* expectDigitOrRepair(start)) {
        return true
      }
    }

    // Note that in JSON leading zeros like "00789" are not allowed.
    // We will allow all leading zeros here though and at the end of parseNumber
    // check against trailing zeros and repair that if needed.
    // Leading zeros can have meaning, so we should not clear them.
    while (isDigit(yield* input.charCodeAt(i))) {
      i++
    }

    if ((yield* input.charCodeAt(i)) === codeDot) {
      i++
      if (yield* expectDigitOrRepair(start)) {
        return true
      }
      while (isDigit(yield* input.charCodeAt(i))) {
        i++
      }
    }

    if (
      (yield* input.charCodeAt(i)) === codeLowercaseE ||
      (yield* input.charCodeAt(i)) === codeUppercaseE
    ) {
      i++
      if (
        (yield* input.charCodeAt(i)) === codeMinus ||
        (yield* input.charCodeAt(i)) === codePlus
      ) {
        i++
      }
      if (yield* expectDigitOrRepair(start)) {
        return true
      }
      while (isDigit(yield* input.charCodeAt(i))) {
        i++
      }
    }

    if (i > start) {
      // repair a number with leading zeros like "00789"
      const num = yield* input.substring(start, i)
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
  function* parseKeywords(): Generator<void, boolean> {
    return (
      (yield* parseKeyword('true', 'true')) ||
      (yield* parseKeyword('false', 'false')) ||
      (yield* parseKeyword('null', 'null')) ||
      // repair Python keywords True, False, None
      (yield* parseKeyword('True', 'true')) ||
      (yield* parseKeyword('False', 'false')) ||
      (yield* parseKeyword('None', 'null'))
    )
  }

  function* parseKeyword(name: string, value: string): Generator<void, boolean> {
    if ((yield* input.substring(i, i + name.length)) === name) {
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
  function* parseUnquotedString() : Generator<void, boolean> {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    const start = i
    while (!(yield* input.isEnd(i)) && !isDelimiter(yield* input.charAt(i))) {
      i++
    }

    if (i > start) {
      if ((yield* input.charCodeAt(i)) === codeOpenParenthesis) {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        i++

        yield* parseValue()

        if ((yield* input.charCodeAt(i)) === codeCloseParenthesis) {
          // repair: skip close bracket of function call
          i++
          if ((yield* input.charCodeAt(i)) === codeSemicolon) {
            // repair: skip semicolon after JSONP call
            i++
          }
        }

        return true
      } else {
        // repair unquoted string
        // also, repair undefined into null

        // first, go back to prevent getting trailing whitespaces in the string
        while (isWhitespace(yield* input.charCodeAt(i - 1)) && i > 0) {
          i--
        }

        const symbol = yield* input.substring(start, i)
        output.push(symbol === 'undefined' ? 'null' : JSON.stringify(symbol))

        if ((yield* input.charCodeAt(i)) === codeDoubleQuote) {
          // we had a missing start quote, but now we encountered the end quote, so we can skip that one
          i++
        }

        return true
      }
    }
  }

  function* expectDigit(start: number) {
    if (!isDigit(yield* input.charCodeAt(i))) {
      const numSoFar = yield* input.substring(start, i)
      throw new JSONRepairError(`Invalid number '${numSoFar}', expecting a digit ${yield* got()}`, i)
    }
  }

  function* expectDigitOrRepair(start: number) : Generator<void, boolean> {
    if (yield* input.isEnd(i)) {
      // repair numbers cut off at the end
      // this will only be called when we end after a '.', '-', or 'e' and does not
      // change the number more than it needs to make it valid JSON
      output.push((yield* input.substring(start, i)) + '0')
      return true
    } else {
      yield* expectDigit(start)
      return false
    }
  }

  function throwInvalidCharacter(char: string) {
    throw new JSONRepairError('Invalid character ' + JSON.stringify(char), i)
  }

  function* throwUnexpectedCharacter(): Generator<void, void> {
    throw new JSONRepairError('Unexpected character ' + JSON.stringify(yield* input.charAt(i)), i)
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

  function* throwInvalidUnicodeCharacter() : Generator<void, void> {
    const chars = yield* input.substring(i, i + 6)
    throw new JSONRepairError(`Invalid unicode character "${chars}"`, i)
  }

  function* got(): Generator<void, string> {
    const char = yield* input.charAt(i)
    return char ? `but got '${char}'` : 'but reached end of input'
  }

  function* atEndOfBlockComment(i: number) : Generator<void, boolean> {
    return (yield* input.charAt(i)) === '*' && (yield* input.charAt(i + 1)) === '/'
  }
}
