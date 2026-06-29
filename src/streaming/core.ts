import { JSONRepairError } from '../utils/JSONRepairError.js'
import {
  isControlCharacter,
  isDelimiter,
  isDigit,
  isDoubleQuote,
  isDoubleQuoteEntity,
  isDoubleQuoteLike,
  isFunctionNameChar,
  isFunctionNameCharStart,
  isHex,
  isInsideUnclosedBracket,
  isQuote,
  isSingleQuote,
  isSingleQuoteEntity,
  isSingleQuoteLike,
  isSpecialWhitespace,
  isStartOfValue,
  isUnquotedStringDelimiter,
  isValidStringCharacter,
  isWhitespace,
  isWhitespaceExceptNewline,
  matchHtmlEntity,
  maxHtmlEntityLength,
  regexUrlChar,
  regexUrlStart
} from '../utils/stringUtils.js'
import { createInputBuffer } from './buffer/InputBuffer.js'
import { createOutputBuffer } from './buffer/OutputBuffer.js'
import { Caret, createStack, StackType } from './stack.js'

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

  // once a string is opened by a quote-producing entity like &quot;, treat the
  // whole document as HTML-encoded and decode entities in all following strings
  let htmlEntityDecoding = false

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
              skipEllipsis() ||
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
            return (
              skipEllipsis() || parseValue() || parseRepairTrailingComma() || parseRepairArrayEnd()
            )
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
            return parseRootStart()
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
      parseRepairUnquotedString() ||
      parseRepairRegex()
    )
  }

  function parseObjectStart(): boolean {
    if (parseCharacter('{')) {
      parseWhitespaceAndSkipComments()

      skipEllipsis()

      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments()
      }

      if (parseCharacter('}')) {
        return stack.update(Caret.afterValue)
      }

      return stack.push(StackType.object, Caret.beforeKey)
    }

    return false
  }

  function parseArrayStart(): boolean {
    if (parseCharacter('[')) {
      parseWhitespaceAndSkipComments()

      skipEllipsis()

      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments()
      }

      if (parseCharacter(']')) {
        return stack.update(Caret.afterValue)
      }

      return stack.push(StackType.array, Caret.beforeValue)
    }

    return false
  }

  function parseRepairUnquotedString(): boolean {
    let j = i

    if (isFunctionNameCharStart(input.charAt(j))) {
      while (!input.isEnd(j) && isFunctionNameChar(input.charAt(j))) {
        j++
      }

      let k = j
      while (isWhitespace(input, k)) {
        k++
      }

      if (input.charAt(k) === '(') {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        k++
        i = k
        return stack.push(StackType.functionCall, Caret.beforeValue)
      }
    }

    j = findNextDelimiter(false, j)
    if (j !== null) {
      // test start of an url like "https://..." (this would be parsed as a comment)
      if (input.charAt(j - 1) === ':' && regexUrlStart.test(input.substring(i, j + 2))) {
        while (!input.isEnd(j) && regexUrlChar.test(input.charAt(j))) {
          j++
        }
      }

      const symbol = input.substring(i, j)
      i = j

      output.push(symbol === 'undefined' ? 'null' : JSON.stringify(symbol))

      if (input.charAt(i) === '"') {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++
      }

      return stack.update(Caret.afterValue)
    }

    return false
  }

  function parseRepairRegex() {
    if (input.charAt(i) === '/') {
      const start = i
      i++

      while (!input.isEnd(i) && (input.charAt(i) !== '/' || input.charAt(i - 1) === '\\')) {
        i++
      }
      i++

      output.push(JSON.stringify(input.substring(start, i)))

      return stack.update(Caret.afterValue)
    }
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
    if (input.charAt(i) === ':') {
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

      if (parseCharacter(':')) {
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
    if (parseCharacter(',')) {
      return stack.update(Caret.beforeKey)
    }

    return false
  }

  function parseObjectEnd(): boolean {
    if (parseCharacter('}')) {
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
    if (parseCharacter(',')) {
      return stack.update(Caret.beforeValue)
    }

    return false
  }

  function parseArrayEnd(): boolean {
    if (parseCharacter(']')) {
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
    }

    throwUnexpectedEnd()
    return false // just to make TS happy
  }

  function parseFunctionCallEnd(): true {
    if (skipCharacter(')')) {
      skipCharacter(';')
    }

    return stack.pop()
  }

  function parseRootStart(): boolean {
    parseMarkdownCodeBlock(['```', '[```', '{```'])

    return parseValue() || parseUnexpectedEnd()
  }

  function parseRootEnd(): boolean {
    parseMarkdownCodeBlock(['```', '```]', '```}'])

    const parsedComma = parseCharacter(',')
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
    while (input.charAt(i) === '}' || input.charAt(i) === ']') {
      i++
      parseWhitespaceAndSkipComments()
    }

    if (!input.isEnd(i)) {
      throwUnexpectedCharacter()
    }

    return false
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
      if (_isWhiteSpace(input, i)) {
        whitespace += input.charAt(i)
        i++
      } else if (isSpecialWhitespace(input, i)) {
        // repair special whitespace
        whitespace += ' '
        i++
      } else {
        break
      }
    }

    if (whitespace.length > 0) {
      output.push(whitespace)
      return true
    }

    return false
  }

  function parseComment(): boolean {
    // find a block comment '/* ... */'
    if (input.charAt(i) === '/' && input.charAt(i + 1) === '*') {
      // repair block comment by skipping it
      while (!input.isEnd(i) && !atEndOfBlockComment(i)) {
        i++
      }
      i += 2

      return true
    }

    // find a line comment '// ...'
    if (input.charAt(i) === '/' && input.charAt(i + 1) === '/') {
      // repair line comment by skipping it
      while (!input.isEnd(i) && input.charAt(i) !== '\n') {
        i++
      }

      return true
    }

    return false
  }

  function parseMarkdownCodeBlock(blocks: string[]): boolean {
    // find and skip over a Markdown fenced code block:
    //     ``` ... ```
    // or
    //     ```json ... ```
    if (skipMarkdownCodeBlock(blocks)) {
      if (isFunctionNameCharStart(input.charAt(i))) {
        // strip the optional language specifier like "json"
        while (!input.isEnd(i) && isFunctionNameChar(input.charAt(i))) {
          i++
        }
      }

      parseWhitespaceAndSkipComments()

      return true
    }

    return false
  }

  function skipMarkdownCodeBlock(blocks: string[]): boolean {
    for (const block of blocks) {
      const end = i + block.length
      if (input.substring(i, end) === block) {
        i = end
        return true
      }
    }

    return false
  }

  function parseCharacter(char: string): boolean {
    if (input.charAt(i) === char) {
      output.push(input.charAt(i))
      i++
      return true
    }

    return false
  }

  function skipCharacter(char: string): boolean {
    if (input.charAt(i) === char) {
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

    if (input.charAt(i) === '.' && input.charAt(i + 1) === '.' && input.charAt(i + 2) === '.') {
      // repair: remove the ellipsis (three dots) and optionally a comma
      i += 3
      parseWhitespaceAndSkipComments()
      skipCharacter(',')

      return true
    }

    return false
  }

  /**
   * Read a small window of buffered input at the given index to detect an HTML
   * entity, clamped so it never reads past the buffered input.
   */
  function htmlEntityWindow(at: number): string {
    const max = Math.min(at + maxHtmlEntityLength, input.currentLength())
    return at < max ? input.substring(at, max) : ''
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
    let skipEscapeChars = input.charAt(i) === '\\'
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++
      skipEscapeChars = true
    }

    // a string can be opened by a quote character, or by an HTML entity that
    // decodes to a quote (like &quot;) when repairing HTML-encoded JSON
    const openEntity = input.charAt(i) === '&' ? matchHtmlEntity(htmlEntityWindow(i)) : null
    const openedByEntity = isDoubleQuoteEntity(openEntity) || isSingleQuoteEntity(openEntity)
    if (openedByEntity) {
      // the document is HTML-encoded: decode entities in every following string
      htmlEntityDecoding = true
    }

    if (isQuote(input.charAt(i)) || openedByEntity) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = isDoubleQuote(input.charAt(i))
        ? isDoubleQuote
        : isSingleQuote(input.charAt(i))
          ? isSingleQuote
          : isSingleQuoteLike(input.charAt(i))
            ? isSingleQuoteLike
            : isDoubleQuoteLike

      const iBefore = i
      const oBefore = output.length()

      output.push('"')
      // when opened by an entity, skip past the whole entity; otherwise skip the quote
      i += openedByEntity && openEntity ? openEntity.length : 1

      while (true) {
        if (input.isEnd(i)) {
          // end of text, we have a missing quote somewhere

          const iPrev = prevNonWhitespaceIndex(i - 1)
          if (!stopAtDelimiter && isDelimiter(input.charAt(iPrev))) {
            // if the text ends with a delimiter, like ["hello],
            // so the missing end quote should be inserted before this delimiter
            // retry parsing the string, stopping at the first next delimiter
            i = iBefore
            output.remove(oBefore)

            return parseString(true)
          }

          // repair missing quote
          output.insertBeforeLastWhitespace('"')

          return stack.update(Caret.afterValue)
        }

        if (i === stopAtIndex) {
          // use the stop index detected in the first iteration, and repair end quote
          output.insertBeforeLastWhitespace('"')

          return stack.update(Caret.afterValue)
        }

        // while decoding, a '&' may be an entity; it is the end quote when it
        // decodes to the opening quote
        const entity =
          htmlEntityDecoding && input.charAt(i) === '&'
            ? matchHtmlEntity(htmlEntityWindow(i))
            : null
        const isEnd = entity
          ? openedByEntity && openEntity
            ? entity.char === openEntity.char
            : isEndQuote(entity.char)
          : isEndQuote(input.charAt(i))

        if (isEnd) {
          // end quote
          // let us check what is before and after the quote to verify whether this is a legit end quote
          const iQuote = i
          const oQuote = output.length()
          output.push('"')
          i += entity ? entity.length : 1

          parseWhitespaceAndSkipComments(false)

          if (
            stopAtDelimiter ||
            input.isEnd(i) ||
            (isDelimiter(input.charAt(i)) &&
              // only count the brackets inside the string when actually needed,
              // i.e. when the quote is directly followed by a closing bracket
              !isInsideUnclosedBracket(input.substring(iBefore, iQuote), input.charAt(i))) ||
            (isQuote(input.charAt(i)) && !nextQuoteIsEndQuote(i)) ||
            isDigit(input.charAt(i))
          ) {
            // The quote is followed by the end of the text, a delimiter, or a next value
            // so the quote is indeed the end of the string
            parseConcatenatedString()

            return stack.update(Caret.afterValue)
          }

          const iPrevChar = prevNonWhitespaceIndex(iQuote - 1)
          const prevChar = input.charAt(iPrevChar)

          if (prevChar === ',') {
            // A comma followed by a quote, like '{"a":"b,c,"d":"e"}'.
            // We assume that the quote is a start quote, and that the end quote
            // should have been located right before the comma but is missing.
            i = iBefore
            output.remove(oBefore)

            return parseString(false, iPrevChar)
          }

          if (isDelimiter(prevChar)) {
            // This is not the right end quote: it is preceded by a delimiter,
            // and NOT followed by a delimiter. So, there is an end quote missing
            // parse the string again and then stop at the first next delimiter
            i = iBefore
            output.remove(oBefore)

            return parseString(true)
          }

          // revert to right after the quote but before any whitespace, and continue parsing the string
          output.remove(oQuote + 1)
          i = iQuote + (entity ? entity.length : 1)

          // repair unescaped quote
          output.insertAt(oQuote, '\\')
        } else if (stopAtDelimiter && isUnquotedStringDelimiter(input.charAt(i))) {
          // we're in the mode to stop the string at the first delimiter
          // because there is an end quote missing

          // test start of an url like "https://..." (this would be parsed as a comment)
          if (
            input.charAt(i - 1) === ':' &&
            regexUrlStart.test(input.substring(iBefore + 1, i + 2))
          ) {
            while (!input.isEnd(i) && regexUrlChar.test(input.charAt(i))) {
              output.push(input.charAt(i))
              i++
            }
          }

          // repair missing quote
          output.insertBeforeLastWhitespace('"')

          parseConcatenatedString()

          return stack.update(Caret.afterValue)
        } else if (entity) {
          // decode an HTML entity inside the string as content
          const char = entity.char
          if (char === '"') {
            // repair unescaped double quote
            output.push('\\"')
          } else if (isControlCharacter(char)) {
            output.push(controlCharacters[char])
          } else {
            output.push(char)
          }
          i += entity.length
        } else if (input.charAt(i) === '\\') {
          // handle escaped content like \n or \u2605
          const char = input.charAt(i + 1)
          const escapeChar = escapeCharacters[char]
          if (escapeChar !== undefined) {
            output.push(input.substring(i, i + 2))
            i += 2
          } else if (char === 'u') {
            let j = 2
            while (j < 6 && isHex(input.charAt(i + j))) {
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
          } else if (char === '\n') {
            // repair a backslash escaped newline (like in Bash scripts)
            output.push('\\n')
            i += 2
          } else {
            // repair invalid escape character: remove it
            output.push(char)
            i += 2
          }
        } else {
          // handle regular characters
          const char = input.charAt(i)

          if (char === '"' && input.charAt(i - 1) !== '\\') {
            // repair unescaped double quote
            output.push(`\\${char}`)
            i++
          } else if (isControlCharacter(char)) {
            // unescaped control character
            output.push(controlCharacters[char])
            i++
          } else {
            if (!isValidStringCharacter(char)) {
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
    }

    return false
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function parseConcatenatedString(): boolean {
    let parsed = false

    parseWhitespaceAndSkipComments()
    while (input.charAt(i) === '+') {
      parsed = true
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

    return parsed
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber(): boolean {
    const start = i
    let num = ''
    let invalid = false

    if (input.charAt(i) === '-') {
      num += input.charAt(i)
      i++

      if (!isDigit(input.charAt(i)) && atEndOfNumber()) {
        num += '0'
      }
    }

    if (input.charAt(i) === '0' && isDigit(input.charAt(i + 1))) {
      // the number has leading zeros like "00123" or "001.23"
      invalid = true
    }

    while (isDigit(input.charAt(i))) {
      num += input.charAt(i)
      i++
    }

    if (input.charAt(i) === '.') {
      if (num === '' || num === '-') {
        // repair missing leading zero before dot
        num += '0'
      }

      num += input.charAt(i)
      i++

      if (!isDigit(input.charAt(i))) {
        // repair a truncated number like "2." into "2.0"
        num += '0'
      }

      while (isDigit(input.charAt(i))) {
        num += input.charAt(i)
        i++
      }
    }

    if (i > start) {
      if (input.charAt(i) === 'e' || input.charAt(i) === 'E') {
        if (num === '-') {
          invalid = true
        }

        num += input.charAt(i)
        i++

        if (input.charAt(i) === '-' || input.charAt(i) === '+') {
          num += input.charAt(i)
          i++
        }

        if (!isDigit(input.charAt(i))) {
          // repair a truncated number like "2e" into "2e0"
          num += '0'
        }

        while (isDigit(input.charAt(i))) {
          num += input.charAt(i)
          i++
        }
      }

      // if we're not at the end of the number by this point, allow this to be parsed as another type
      if (!atEndOfNumber()) {
        i = start
        return false
      }

      output.push(invalid ? `"${input.substring(start, i)}"` : num)
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
    if (
      input.substring(i, i + name.length) === name &&
      !isFunctionNameChar(input.charAt(i + name.length))
    ) {
      output.push(value)
      i += name.length
      return stack.update(Caret.afterValue)
    }

    return false
  }

  function parseUnquotedKey(): boolean {
    let end = findNextDelimiter(true, i)

    if (end !== null) {
      // first, go back to prevent getting trailing whitespaces in the string
      while (isWhitespace(input, end - 1) && end > i) {
        end--
      }

      const symbol = input.substring(i, end)
      output.push(JSON.stringify(symbol))
      i = end

      if (input.charAt(i) === '"') {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++
      }

      return stack.update(Caret.afterValue) // we do not have a state Caret.afterKey, therefore we use afterValue here
    }

    return false
  }

  function findNextDelimiter(isKey: boolean, start: number): number | null {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    // also, note that we allow strings to contain a slash / in order to support repairing regular expressions
    let j = start
    while (
      !input.isEnd(j) &&
      !isUnquotedStringDelimiter(input.charAt(j)) &&
      !isQuote(input.charAt(j)) &&
      (!isKey || input.charAt(j) !== ':')
    ) {
      j++
    }

    return j > i ? j : null
  }

  function prevNonWhitespaceIndex(start: number): number {
    let prev = start

    while (prev > 0 && isWhitespace(input, prev)) {
      prev--
    }

    return prev
  }

  function nextQuoteIsEndQuote(index: number): boolean {
    // precondition: input.charAt(index) is a quote. Peek past it: if nothing meaningful
    // follows, that quote is the true end and this one is embedded (e.g. `"The TV is 72""`)
    let next = index + 1
    while (!input.isEnd(next) && isWhitespace(input, next)) {
      next++
    }

    return input.isEnd(next) || isDelimiter(input.charAt(next))
  }

  function atEndOfNumber() {
    return input.isEnd(i) || isDelimiter(input.charAt(i)) || isWhitespace(input, i)
  }

  function throwInvalidCharacter(char: string) {
    throw new JSONRepairError(`Invalid character ${JSON.stringify(char)}`, i)
  }

  function throwUnexpectedCharacter() {
    throw new JSONRepairError(`Unexpected character ${JSON.stringify(input.charAt(i))}`, i)
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

  function atEndOfBlockComment(i: number) {
    return input.charAt(i) === '*' && input.charAt(i + 1) === '/'
  }

  return {
    transform,
    flush
  }
}
