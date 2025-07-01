import { JSONRepairError } from '../utils/JSONRepairError.js'
import {
  endsWithCommaOrNewline,
  insertBeforeLastWhitespace,
  isControlCharacter,
  isDelimiter,
  isDigit,
  isDoubleQuote,
  isDoubleQuoteLike,
  isFunctionNameChar,
  isFunctionNameCharStart,
  isHex,
  isQuote,
  isSingleQuote,
  isSingleQuoteLike,
  isSpecialWhitespace,
  isStartOfValue,
  isUnquotedStringDelimiter,
  isValidStringCharacter,
  isWhitespace,
  isWhitespaceExceptNewline,
  regexUrlChar,
  regexUrlStart,
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

  parseMarkdownCodeBlock()

  const processed = parseValue()
  if (!processed) {
    throwUnexpectedEnd()
  }

  parseMarkdownCodeBlock()

  const processedComma = parseCharacter(',')
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
  while (text[i] === '}' || text[i] === ']') {
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
      parseUnquotedString(false) ||
      parseRegex()
    parseWhitespaceAndSkipComments()

    return processed
  }

  function parseWhitespaceAndSkipComments(skipNewline = true): boolean {
    const start = i

    let changed = parseWhitespace(skipNewline)
    do {
      changed = parseComment()
      if (changed) {
        changed = parseWhitespace(skipNewline)
      }
    } while (changed)

    return i > start
  }

  function parseWhitespace(skipNewline: boolean): boolean {
    const _isWhiteSpace = skipNewline ? isWhitespace : isWhitespaceExceptNewline
    let whitespace = ''

    while (true) {
      if (_isWhiteSpace(text, i)) {
        whitespace += text[i]
        i++
      } else if (isSpecialWhitespace(text, i)) {
        // repair special whitespace
        whitespace += ' '
        i++
      } else {
        break
      }
    }

    if (whitespace.length > 0) {
      output += whitespace
      return true
    }

    return false
  }

  function parseComment(): boolean {
    // find a block comment '/* ... */'
    if (text[i] === '/' && text[i + 1] === '*') {
      // repair block comment by skipping it
      while (i < text.length && !atEndOfBlockComment(text, i)) {
        i++
      }
      i += 2

      return true
    }

    // find a line comment '// ...'
    if (text[i] === '/' && text[i + 1] === '/') {
      // repair line comment by skipping it
      while (i < text.length && text[i] !== '\n') {
        i++
      }

      return true
    }

    return false
  }

  function parseMarkdownCodeBlock(): boolean {
    // find and skip over a Markdown fenced code block:
    //     ``` ... ```
    // or
    //     ```json ... ```
    if (text.slice(i, i + 3) === '```') {
      i += 3

      if (isFunctionNameCharStart(text[i])) {
        // strip the optional language specifier like "json"
        while (i < text.length && isFunctionNameChar(text[i])) {
          i++
        }
      }

      parseWhitespaceAndSkipComments()

      return true
    }

    return false
  }

  function parseCharacter(char: string): boolean {
    if (text[i] === char) {
      output += text[i]
      i++
      return true
    }

    return false
  }

  function skipCharacter(char: string): boolean {
    if (text[i] === char) {
      i++
      return true
    }

    return false
  }

  function skipEscapeCharacter(): boolean {
    return skipCharacter('\\')
  }

  /**
   * Skip ellipsis like "[1,2,3,...]" or "[1,2,3,...,9]" or "[...,7,8,9]"
   * or a similar construct in objects.
   */
  function skipEllipsis(): boolean {
    parseWhitespaceAndSkipComments()

    if (text[i] === '.' && text[i + 1] === '.' && text[i + 2] === '.') {
      // repair: remove the ellipsis (three dots) and optionally a comma
      i += 3
      parseWhitespaceAndSkipComments()
      skipCharacter(',')

      return true
    }

    return false
  }

  /**
   * Parse an object like '{"key": "value"}'
   */
  function parseObject(): boolean {
    if (text[i] === '{') {
      output += '{'
      i++
      parseWhitespaceAndSkipComments()

      // repair: skip leading comma like in {, message: "hi"}
      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments()
      }

      let initial = true
      while (i < text.length && text[i] !== '}') {
        let processedComma: boolean
        if (!initial) {
          processedComma = parseCharacter(',')
          if (!processedComma) {
            // repair missing comma
            output = insertBeforeLastWhitespace(output, ',')
          }
          parseWhitespaceAndSkipComments()
        } else {
          processedComma = true
          initial = false
        }

        skipEllipsis()

        const processedKey = parseString() || parseUnquotedString(true)
        if (!processedKey) {
          if (
            text[i] === '}' ||
            text[i] === '{' ||
            text[i] === ']' ||
            text[i] === '[' ||
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
        const processedColon = parseCharacter(':')
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

      if (text[i] === '}') {
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
    if (text[i] === '[') {
      output += '['
      i++
      parseWhitespaceAndSkipComments()

      // repair: skip leading comma like in [,1,2,3]
      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments()
      }

      let initial = true
      while (i < text.length && text[i] !== ']') {
        if (!initial) {
          const processedComma = parseCharacter(',')
          if (!processedComma) {
            // repair missing comma
            output = insertBeforeLastWhitespace(output, ',')
          }
        } else {
          initial = false
        }

        skipEllipsis()

        const processedValue = parseValue()
        if (!processedValue) {
          // repair trailing comma
          output = stripLastOccurrence(output, ',')
          break
        }
      }

      if (text[i] === ']') {
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
        const processedComma = parseCharacter(',')
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
   *   and fixing the string by inserting a quote there, or stopping at a
   *   stop index detected in the first iteration.
   */
  function parseString(stopAtDelimiter = false, stopAtIndex = -1): boolean {
    let skipEscapeChars = text[i] === '\\'
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    if (isQuote(text[i])) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = isDoubleQuote(text[i])
        ? isDoubleQuote
        : isSingleQuote(text[i])
          ? isSingleQuote
          : isSingleQuoteLike(text[i])
            ? isSingleQuoteLike
            : isDoubleQuoteLike

      const iBefore = i
      const oBefore = output.length

      let str = '"'
      i++

      while (true) {
        if (i >= text.length) {
          // end of text, we are missing an end quote

          const iPrev = prevNonWhitespaceIndex(i - 1)
          if (!stopAtDelimiter && isDelimiter(text.charAt(iPrev))) {
            // if the text ends with a delimiter, like ["hello],
            // so the missing end quote should be inserted before this delimiter
            // retry parsing the string, stopping at the first next delimiter
            i = iBefore
            output = output.substring(0, oBefore)

            return parseString(true)
          }

          // repair missing quote
          str = insertBeforeLastWhitespace(str, '"')
          output += str

          return true
        }

        if (i === stopAtIndex) {
          // use the stop index detected in the first iteration, and repair end quote
          str = insertBeforeLastWhitespace(str, '"')
          output += str

          return true
        }

        if (isEndQuote(text[i])) {
          // end quote
          // let us check what is before and after the quote to verify whether this is a legit end quote
          const iQuote = i
          const oQuote = str.length
          str += '"'
          i++
          output += str

          parseWhitespaceAndSkipComments(false)

          if (
            stopAtDelimiter ||
            i >= text.length ||
            isDelimiter(text[i]) ||
            isQuote(text[i]) ||
            isDigit(text[i])
          ) {
            // The quote is followed by the end of the text, a delimiter,
            // or a next value. So the quote is indeed the end of the string.
            parseConcatenatedString()

            return true
          }

          const iPrevChar = prevNonWhitespaceIndex(iQuote - 1)
          const prevChar = text.charAt(iPrevChar)

          if (prevChar === ',') {
            // A comma followed by a quote, like '{"a":"b,c,"d":"e"}'.
            // We assume that the quote is a start quote, and that the end quote
            // should have been located right before the comma but is missing.
            i = iBefore
            output = output.substring(0, oBefore)

            return parseString(false, iPrevChar)
          }

          if (isDelimiter(prevChar)) {
            // This is not the right end quote: it is preceded by a delimiter,
            // and NOT followed by a delimiter. So, there is an end quote missing
            // parse the string again and then stop at the first next delimiter
            i = iBefore
            output = output.substring(0, oBefore)

            return parseString(true)
          }

          // revert to right after the quote but before any whitespace, and continue parsing the string
          output = output.substring(0, oBefore)
          i = iQuote + 1

          // repair unescaped quote
          str = `${str.substring(0, oQuote)}\\${str.substring(oQuote)}`
        } else if (stopAtDelimiter && isUnquotedStringDelimiter(text[i])) {
          // we're in the mode to stop the string at the first delimiter
          // because there is an end quote missing

          // test start of an url like "https://..." (this would be parsed as a comment)
          if (text[i - 1] === ':' && regexUrlStart.test(text.substring(iBefore + 1, i + 2))) {
            while (i < text.length && regexUrlChar.test(text[i])) {
              str += text[i]
              i++
            }
          }

          // repair missing quote
          str = insertBeforeLastWhitespace(str, '"')
          output += str

          parseConcatenatedString()

          return true
        } else if (text[i] === '\\') {
          // handle escaped content like \n or \u2605
          const char = text.charAt(i + 1)
          const escapeChar = escapeCharacters[char]
          if (escapeChar !== undefined) {
            str += text.slice(i, i + 2)
            i += 2
          } else if (char === 'u') {
            let j = 2
            while (j < 6 && isHex(text[i + j])) {
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
          // handle regular characters
          const char = text.charAt(i)

          if (char === '"' && text[i - 1] !== '\\') {
            // repair unescaped double quote
            str += `\\${char}`
            i++
          } else if (isControlCharacter(char)) {
            // unescaped control character
            str += controlCharacters[char]
            i++
          } else {
            if (!isValidStringCharacter(char)) {
              throwInvalidCharacter(char)
            }
            str += char
            i++
          }
        }

        if (skipEscapeChars) {
          // repair: skipped escape character (nothing to do)
          skipEscapeCharacter()
        }
      }
    }

    return false
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function parseConcatenatedString(): boolean {
    let processed = false

    parseWhitespaceAndSkipComments()
    while (text[i] === '+') {
      processed = true
      i++
      parseWhitespaceAndSkipComments()

      // repair: remove the end quote of the first string
      output = stripLastOccurrence(output, '"', true)
      const start = output.length
      const parsedStr = parseString()
      if (parsedStr) {
        // repair: remove the start quote of the second string
        output = removeAtIndex(output, start, 1)
      } else {
        // repair: remove the + because it is not followed by a string
        output = insertBeforeLastWhitespace(output, '"')
      }
    }

    return processed
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber(): boolean {
    const start = i
    if (text[i] === '-') {
      i++
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start)
        return true
      }
      if (!isDigit(text[i])) {
        i = start
        return false
      }
    }

    // Note that in JSON leading zeros like "00789" are not allowed.
    // We will allow all leading zeros here though and at the end of parseNumber
    // check against trailing zeros and repair that if needed.
    // Leading zeros can have meaning, so we should not clear them.
    while (isDigit(text[i])) {
      i++
    }

    if (text[i] === '.') {
      i++
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start)
        return true
      }
      if (!isDigit(text[i])) {
        i = start
        return false
      }
      while (isDigit(text[i])) {
        i++
      }
    }

    if (text[i] === 'e' || text[i] === 'E') {
      i++
      if (text[i] === '-' || text[i] === '+') {
        i++
      }
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start)
        return true
      }
      if (!isDigit(text[i])) {
        i = start
        return false
      }
      while (isDigit(text[i])) {
        i++
      }
    }

    // if we're not at the end of the number by this point, allow this to be parsed as another type
    if (!atEndOfNumber()) {
      i = start
      return false
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
   * Repair an unquoted string by adding quotes around it
   * Repair a MongoDB function call like NumberLong("2")
   * Repair a JSONP function call like callback({...});
   */
  function parseUnquotedString(isKey: boolean) {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    // also, note that we allow strings to contain a slash / in order to support repairing regular expressions
    const start = i

    if (isFunctionNameCharStart(text[i])) {
      while (i < text.length && isFunctionNameChar(text[i])) {
        i++
      }

      let j = i
      while (isWhitespace(text, j)) {
        j++
      }

      if (text[j] === '(') {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        i = j + 1

        parseValue()

        if (text[i] === ')') {
          // repair: skip close bracket of function call
          i++
          if (text[i] === ';') {
            // repair: skip semicolon after JSONP call
            i++
          }
        }

        return true
      }
    }

    while (
      i < text.length &&
      !isUnquotedStringDelimiter(text[i]) &&
      !isQuote(text[i]) &&
      (!isKey || text[i] !== ':')
    ) {
      i++
    }

    // test start of an url like "https://..." (this would be parsed as a comment)
    if (text[i - 1] === ':' && regexUrlStart.test(text.substring(start, i + 2))) {
      while (i < text.length && regexUrlChar.test(text[i])) {
        i++
      }
    }

    if (i > start) {
      // repair unquoted string
      // also, repair undefined into null

      // first, go back to prevent getting trailing whitespaces in the string
      while (isWhitespace(text, i - 1) && i > 0) {
        i--
      }

      const symbol = text.slice(start, i)
      output += symbol === 'undefined' ? 'null' : JSON.stringify(symbol)

      if (text[i] === '"') {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++
      }

      return true
    }
  }

  function parseRegex() {
    if (text[i] === '/') {
      const start = i
      i++

      while (i < text.length && (text[i] !== '/' || text[i - 1] === '\\')) {
        i++
      }
      i++

      output += `"${text.substring(start, i)}"`

      return true
    }
  }

  function prevNonWhitespaceIndex(start: number): number {
    let prev = start

    while (prev > 0 && isWhitespace(text, prev)) {
      prev--
    }

    return prev
  }

  function atEndOfNumber() {
    return i >= text.length || isDelimiter(text[i]) || isWhitespace(text, i)
  }

  function repairNumberEndingWithNumericSymbol(start: number) {
    // repair numbers cut off at the end
    // this will only be called when we end after a '.', '-', or 'e' and does not
    // change the number more than it needs to make it valid JSON
    output += `${text.slice(start, i)}0`
  }

  function throwInvalidCharacter(char: string) {
    throw new JSONRepairError(`Invalid character ${JSON.stringify(char)}`, i)
  }

  function throwUnexpectedCharacter() {
    throw new JSONRepairError(`Unexpected character ${JSON.stringify(text[i])}`, i)
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
}

function atEndOfBlockComment(text: string, i: number) {
  return text[i] === '*' && text[i + 1] === '/'
}
