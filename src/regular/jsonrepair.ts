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
  endsWithCommaOrNewline,
  insertBeforeLastWhitespace,
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
  isWhitespace,
  nextNonWhiteSpaceCharacter,
  removeAtIndex,
  stripLastOccurrence
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
export function jsonrepair(text: string): string {
  let i = 0 // current index in text
  let output = '' // generated output

  const processed = parseValue()
  if (!processed) {
    throwUnexpectedEnd()
  }

  const processedComma = parseCharacter(codeComma)
  if (processedComma) {
    parseWhitespaceAndSkipComments()
  }

  if (isStartOfValue(text[i]) && endsWithCommaOrNewline(output)) {
    // start of a new value after end of the root level object: looks like
    // newline delimited JSON -> turn into a root level array
    if (!processedComma) {
      // repair missing comma
      output = insertBeforeLastWhitespace(output, ',')
    }

    parseNewlineDelimitedJSON()
  } else if (processedComma) {
    // repair: remove trailing comma
    output = stripLastOccurrence(output, ',')
  }

  // repair redundant end quotes
  while (text.charCodeAt(i) === codeClosingBrace || text.charCodeAt(i) === codeClosingBracket) {
    i++
    parseWhitespaceAndSkipComments()
  }

  if (i >= text.length) {
    // reached the end of the document properly
    return output
  }

  throwUnexpectedCharacter()

  function parseValue(): boolean {
    parseWhitespaceAndSkipComments()
    const processed =
      parseObject() ||
      parseArray() ||
      parseString() ||
      parseNumber() ||
      parseKeywords() ||
      parseUnquotedString()
    parseWhitespaceAndSkipComments()

    return processed
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
    while ((normal = isWhitespace(text.charCodeAt(i))) || isSpecialWhitespace(text.charCodeAt(i))) {
      if (normal) {
        whitespace += text[i]
      } else {
        // repair special whitespace
        whitespace += ' '
      }

      i++
    }

    if (whitespace.length > 0) {
      output += whitespace
      return true
    }

    return false
  }

  function parseComment(): boolean {
    // find a block comment '/* ... */'
    if (text.charCodeAt(i) === codeSlash && text.charCodeAt(i + 1) === codeAsterisk) {
      // repair block comment by skipping it
      while (i < text.length && !atEndOfBlockComment(text, i)) {
        i++
      }
      i += 2

      return true
    }

    // find a line comment '// ...'
    if (text.charCodeAt(i) === codeSlash && text.charCodeAt(i + 1) === codeSlash) {
      // repair line comment by skipping it
      while (i < text.length && text.charCodeAt(i) !== codeNewline) {
        i++
      }

      return true
    }

    return false
  }

  function parseCharacter(code: number): boolean {
    if (text.charCodeAt(i) === code) {
      output += text[i]
      i++
      return true
    }

    return false
  }

  function skipCharacter(code: number): boolean {
    if (text.charCodeAt(i) === code) {
      i++
      return true
    }

    return false
  }

  function skipEscapeCharacter(): boolean {
    return skipCharacter(codeBackslash)
  }

  /**
   * Parse an object like '{"key": "value"}'
   */
  function parseObject(): boolean {
    if (text.charCodeAt(i) === codeOpeningBrace) {
      output += '{'
      i++
      parseWhitespaceAndSkipComments()

      let initial = true
      while (i < text.length && text.charCodeAt(i) !== codeClosingBrace) {
        let processedComma
        if (!initial) {
          processedComma = parseCharacter(codeComma)
          if (!processedComma) {
            // repair missing comma
            output = insertBeforeLastWhitespace(output, ',')
          }
          parseWhitespaceAndSkipComments()
        } else {
          processedComma = true
          initial = false
        }

        const processedKey = parseString() || parseUnquotedString()
        if (!processedKey) {
          if (
            text.charCodeAt(i) === codeClosingBrace ||
            text.charCodeAt(i) === codeOpeningBrace ||
            text.charCodeAt(i) === codeClosingBracket ||
            text.charCodeAt(i) === codeOpeningBracket ||
            text[i] === undefined
          ) {
            // repair trailing comma
            output = stripLastOccurrence(output, ',')
          } else {
            throwObjectKeyExpected()
          }
          break
        }

        parseWhitespaceAndSkipComments()
        const processedColon = parseCharacter(codeColon)
        const truncatedText = i >= text.length
        if (!processedColon) {
          if (isStartOfValue(text[i]) || truncatedText) {
            // repair missing colon
            output = insertBeforeLastWhitespace(output, ':')
          } else {
            throwColonExpected()
          }
        }
        const processedValue = parseValue()
        if (!processedValue) {
          if (processedColon || truncatedText) {
            // repair missing object value
            output += 'null'
          } else {
            throwColonExpected()
          }
        }
      }

      if (text.charCodeAt(i) === codeClosingBrace) {
        output += '}'
        i++
      } else {
        // repair missing end bracket
        output = insertBeforeLastWhitespace(output, '}')
      }

      return true
    }

    return false
  }

  /**
   * Parse an array like '["item1", "item2", ...]'
   */
  function parseArray(): boolean {
    if (text.charCodeAt(i) === codeOpeningBracket) {
      output += '['
      i++
      parseWhitespaceAndSkipComments()

      let initial = true
      while (i < text.length && text.charCodeAt(i) !== codeClosingBracket) {
        if (!initial) {
          const processedComma = parseCharacter(codeComma)
          if (!processedComma) {
            // repair missing comma
            output = insertBeforeLastWhitespace(output, ',')
          }
        } else {
          initial = false
        }

        const processedValue = parseValue()
        if (!processedValue) {
          // repair trailing comma
          output = stripLastOccurrence(output, ',')
          break
        }
      }

      if (text.charCodeAt(i) === codeClosingBracket) {
        output += ']'
        i++
      } else {
        // repair missing closing array bracket
        output = insertBeforeLastWhitespace(output, ']')
      }

      return true
    }

    return false
  }

  /**
   * Parse and repair Newline Delimited JSON (NDJSON):
   * multiple JSON objects separated by a newline character
   */
  function parseNewlineDelimitedJSON() {
    // repair NDJSON
    let initial = true
    let processedValue = true
    while (processedValue) {
      if (!initial) {
        // parse optional comma, insert when missing
        const processedComma = parseCharacter(codeComma)
        if (!processedComma) {
          // repair: add missing comma
          output = insertBeforeLastWhitespace(output, ',')
        }
      } else {
        initial = false
      }

      processedValue = parseValue()
    }

    if (!processedValue) {
      // repair: remove trailing comma
      output = stripLastOccurrence(output, ',')
    }

    // repair: wrap the output inside array brackets
    output = `[\n${output}\n]`
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
    let skipEscapeChars = text.charCodeAt(i) === codeBackslash
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    if (isQuote(text.charCodeAt(i))) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = isDoubleQuote(text.charCodeAt(i))
        ? isDoubleQuote
        : isSingleQuote(text.charCodeAt(i))
          ? isSingleQuote
          : isSingleQuoteLike(text.charCodeAt(i))
            ? isSingleQuoteLike
            : isDoubleQuoteLike

      const iBefore = i

      let str = '"'
      i++

      const isEndOfString = stopAtDelimiter
        ? (i: number) => isDelimiter(text[i])
        : (i: number) => isEndQuote(text.charCodeAt(i))

      while (i < text.length && !isEndOfString(i)) {
        if (text.charCodeAt(i) === codeBackslash) {
          const char = text.charAt(i + 1)
          const escapeChar = escapeCharacters[char]
          if (escapeChar !== undefined) {
            str += text.slice(i, i + 2)
            i += 2
          } else if (char === 'u') {
            let j = 2
            while (j < 6 && isHex(text.charCodeAt(i + j))) {
              j++
            }

            if (j === 6) {
              str += text.slice(i, i + 6)
              i += 6
            } else if (i + j >= text.length) {
              // repair invalid or truncated unicode char at the end of the text
              // by removing the unicode char and ending the string here
              i = text.length
            } else {
              throwInvalidUnicodeCharacter()
            }
          } else {
            // repair invalid escape character: remove it
            str += char
            i += 2
          }
        } else {
          const char = text.charAt(i)
          const code = text.charCodeAt(i)

          if (code === codeDoubleQuote && text.charCodeAt(i - 1) !== codeBackslash) {
            // repair unescaped double quote
            str += '\\' + char
            i++
          } else if (isControlCharacter(code)) {
            // unescaped control character
            str += controlCharacters[char]
            i++
          } else {
            if (!isValidStringCharacter(code)) {
              throwInvalidCharacter(char)
            }
            str += char
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
      const hasEndQuote = isQuote(text.charCodeAt(i))
      const valid =
        hasEndQuote &&
        (i + 1 >= text.length || isDelimiter(nextNonWhiteSpaceCharacter(text, i + 1)))
      if (!valid && !stopAtDelimiter) {
        // we're dealing with a missing quote somewhere. Let's revert parsing
        // this string and try again, running in a more conservative mode,
        // stopping at the first next delimiter
        i = iBefore
        return parseString(true)
      }

      if (hasEndQuote) {
        str += '"'
        i++
      } else {
        // repair missing quote
        str = insertBeforeLastWhitespace(str, '"')
      }

      output += str

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
    while (text.charCodeAt(i) === codePlus) {
      processed = true
      i++
      parseWhitespaceAndSkipComments()

      // repair: remove the end quote of the first string
      output = stripLastOccurrence(output, '"', true)
      const start = output.length
      parseString()

      // repair: remove the start quote of the second string
      output = removeAtIndex(output, start, 1)
    }

    return processed
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber(): boolean {
    const start = i
    if (text.charCodeAt(i) === codeMinus) {
      i++
      if (expectDigitOrRepair(start)) {
        return true
      }
    }

    // Note that in JSON leading zeros like "00789" are not allowed.
    // We will allow all leading zeros here though and at the end of parseNumber
    // check against trailing zeros and repair that if needed.
    // Leading zeros can have meaning, so we should not clear them.
    while (isDigit(text.charCodeAt(i))) {
      i++
    }

    if (text.charCodeAt(i) === codeDot) {
      i++
      if (expectDigitOrRepair(start)) {
        return true
      }
      while (isDigit(text.charCodeAt(i))) {
        i++
      }
    }

    if (text.charCodeAt(i) === codeLowercaseE || text.charCodeAt(i) === codeUppercaseE) {
      i++
      if (text.charCodeAt(i) === codeMinus || text.charCodeAt(i) === codePlus) {
        i++
      }
      if (expectDigitOrRepair(start)) {
        return true
      }
      while (isDigit(text.charCodeAt(i))) {
        i++
      }
    }

    if (i > start) {
      // repair a number with leading zeros like "00789"
      const num = text.slice(start, i)
      const hasInvalidLeadingZero = /^0\d/.test(num)

      output += hasInvalidLeadingZero ? `"${num}"` : num
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
    if (text.slice(i, i + name.length) === name) {
      output += value
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
  function parseUnquotedString() {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    const start = i
    while (i < text.length && !isDelimiter(text[i])) {
      i++
    }

    if (i > start) {
      if (text.charCodeAt(i) === codeOpenParenthesis) {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        i++

        parseValue()

        if (text.charCodeAt(i) === codeCloseParenthesis) {
          // repair: skip close bracket of function call
          i++
          if (text.charCodeAt(i) === codeSemicolon) {
            // repair: skip semicolon after JSONP call
            i++
          }
        }

        return true
      } else {
        // repair unquoted string
        // also, repair undefined into null

        // first, go back to prevent getting trailing whitespaces in the string
        while (isWhitespace(text.charCodeAt(i - 1)) && i > 0) {
          i--
        }

        const symbol = text.slice(start, i)
        output += symbol === 'undefined' ? 'null' : JSON.stringify(symbol)

        if (text.charCodeAt(i) === codeDoubleQuote) {
          // we had a missing start quote, but now we encountered the end quote, so we can skip that one
          i++
        }

        return true
      }
    }
  }

  function expectDigit(start: number) {
    if (!isDigit(text.charCodeAt(i))) {
      const numSoFar = text.slice(start, i)
      throw new JSONRepairError(`Invalid number '${numSoFar}', expecting a digit ${got()}`, i)
    }
  }

  function expectDigitOrRepair(start: number) {
    if (i >= text.length) {
      // repair numbers cut off at the end
      // this will only be called when we end after a '.', '-', or 'e' and does not
      // change the number more than it needs to make it valid JSON
      output += text.slice(start, i) + '0'
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
    throw new JSONRepairError('Unexpected character ' + JSON.stringify(text[i]), i)
  }

  function throwUnexpectedEnd() {
    throw new JSONRepairError('Unexpected end of json string', text.length)
  }

  function throwObjectKeyExpected() {
    throw new JSONRepairError('Object key expected', i)
  }

  function throwColonExpected() {
    throw new JSONRepairError('Colon expected', i)
  }

  function throwInvalidUnicodeCharacter() {
    const chars = text.slice(i, i + 6)
    throw new JSONRepairError(`Invalid unicode character "${chars}"`, i)
  }

  function got(): string {
    return text[i] ? `but got '${text[i]}'` : 'but reached end of input'
  }
}

function atEndOfBlockComment(text: string, i: number) {
  return text[i] === '*' && text[i + 1] === '/'
}
