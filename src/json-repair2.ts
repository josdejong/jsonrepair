'use strict'

// token types enumeration
enum TOKEN_TYPE {
  DELIMITER,
  NUMBER,
  STRING,
  SYMBOL,
  WHITESPACE,
  COMMENT,
  UNKNOWN
}

// map with all delimiters
const DELIMITERS = {
  '': true,
  '{': true,
  '}': true,
  '[': true,
  ']': true,
  ':': true,
  ',': true
}

// map with all escape characters
const ESCAPE_CHARACTERS = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
  // \u is handled by getToken()
}

// TODO: can we unify CONTROL_CHARACTERS and ESCAPE_CHARACTERS?
const CONTROL_CHARACTERS = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
}

const SINGLE_QUOTES = [
  '\'', // quote
  '\u2018', // quote left
  '\u2019', // quote right
  '\u0060', // grave accent
  '\u00B4' // acute accent
]

const DOUBLE_QUOTES = [
  '"',
  '\u201C', // double quote left
  '\u201D' // double quote right
]

const SYMBOLS = {
  null: 'null',
  true: 'true',
  false: 'false'
}

const PYTHON_SYMBOLS = {
  None: 'null',
  True: 'true',
  False: 'false'
}

let input = '' // current json text
let output = '' // generated output
let index = 0 // current index in text
let c = '' // current token character in text
let token = '' // current token
let tokenType = TOKEN_TYPE.UNKNOWN // type of current token

/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     repair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export default function jsonRepair2 (text) {
  // initialize
  input = text
  output = ''
  index = 0
  c = input.charAt(0)
  token = ''
  tokenType = TOKEN_TYPE.UNKNOWN

  // get first token
  processNextToken()

  // parse everything
  parseObject()

  if (token !== '') {
    throw createSyntaxError('Unexpected characters')
  }

  return output
}

/**
 * Get the next character from the expression.
 * The character is stored into the char c. If the end of the expression is
 * reached, the function puts an empty string in c.
 */
function next () {
  index++
  c = input.charAt(index)
  // Note: not using input[index] because that returns undefined when index is out of range
}

/**
 * Process the previous token, and get next token in the current text
 */
function processNextToken () {
  output += token

  tokenType = TOKEN_TYPE.UNKNOWN
  token = ''

  getTokenDelimiter()

  // @ts-ignore
  if (tokenType === TOKEN_TYPE.WHITESPACE) {
    // we leave the whitespace as it is, except replacing special white
    // space character
    token = normalizeWhitespace(token)
    processNextToken()
  }

  // @ts-ignore
  if (tokenType === TOKEN_TYPE.COMMENT) {
    // ignore comments
    tokenType = TOKEN_TYPE.UNKNOWN
    token = ''

    processNextToken()
  }
}

// check for delimiters like ':', '{', ']'
function getTokenDelimiter () {
  if (DELIMITERS[c]) {
    tokenType = TOKEN_TYPE.DELIMITER
    token = c
    next()
    return
  }

  getTokenNumber()
}

// check for a number like "2.3e+5"
function getTokenNumber () {
  if (isDigit(c) || c === '-') {
    tokenType = TOKEN_TYPE.NUMBER

    if (c === '-') {
      token += c
      next()

      if (!isDigit(c)) {
        throw createSyntaxError('Invalid number, digit expected', index)
      }
    } else if (c === '0') {
      token += c
      next()
    } else {
      // digit 1-9, nothing extra to do
    }

    while (isDigit(c)) {
      token += c
      next()
    }

    if (c === '.') {
      token += c
      next()

      if (!isDigit(c)) {
        throw createSyntaxError('Invalid number, digit expected', index)
      }

      while (isDigit(c)) {
        token += c
        next()
      }
    }

    if (c === 'e' || c === 'E') {
      token += c
      next()

      // @ts-ignore
      if (c === '+' || c === '-') {
        token += c
        next()
      }

      if (!isDigit(c)) {
        throw createSyntaxError('Invalid number, digit expected', index)
      }

      while (isDigit(c)) {
        token += c
        next()
      }
    }

    return
  }

  getTokenString()
}

// get a token string like '"hello world"'
function getTokenString () {
  if (isQuote(c)) {
    const quote = normalizeQuote(c)

    token += '"' // output valid double quote
    tokenType = TOKEN_TYPE.STRING
    next()

    // @ts-ignore
    while (c !== '' && normalizeQuote(c) !== quote) {
      if (c === '\\') {
        // handle escape characters
        next()

        const unescaped = ESCAPE_CHARACTERS[c]
        if (unescaped !== undefined) {
          token += '\\' + c
          next()
          // @ts-ignore
        } else if (c === 'u') {
          // parse escaped unicode character, like '\\u260E'
          token += '\\u'
          next()

          for (let u = 0; u < 4; u++) {
            if (!isHex(c)) {
              throw createSyntaxError('Invalid unicode character')
            }
            token += c
            next()
          }
        // @ts-ignore
        } else if (c === '\'') {
          // escaped single quote character -> remove the escape character
          token += '\''
          next()
        } else {
          throw createSyntaxError('Invalid escape character "\\' + c + '"', index)
        }
      } else if (CONTROL_CHARACTERS[c]) {
        // unescaped special character
        // fix by adding an escape character
        token += CONTROL_CHARACTERS[c]
        next()
      } else if (c === '"') {
        // unescaped double quote -> escape it
        token += '\\"'
        next()
      } else {
        // a regular character
        token += c
        next()
      }
    }

    if (normalizeQuote(c) !== quote) {
      throw createSyntaxError('End of string expected')
    }
    token += '"' // output valid double quote
    next()

    return
  }

  getTokenAlpha()
}

// check for symbols (true, false, null)
function getTokenAlpha () {
  if (isAlpha(c)) {
    tokenType = TOKEN_TYPE.SYMBOL

    while (isAlpha(c) || isDigit(c) || c === '$') {
      token += c
      next()
    }

    return
  }

  getTokenWhitespace ()
}

// get whitespaces: space, tab, newline, and carriage return
function getTokenWhitespace () {
  if (isWhitespace(c) || isSpecialWhitespace(c)) {
    tokenType = TOKEN_TYPE.WHITESPACE

    while (isWhitespace(c) || isSpecialWhitespace(c)) {
      token += c
      next()
    }

    return
  }

  getTokenComment()
}

function getTokenComment () {
  // find a block comment '/* ... */'
  if (c === '/' && input[index + 1] === '*') {
    tokenType = TOKEN_TYPE.COMMENT

    // @ts-ignore
    while (c !== '' && (c !== '*' || (c === '*' && input[index + 1] !== '/'))) {
      token += c
      next()
    }

    if (c === '*' && input[index + 1] === '/') {
      token += c
      next()

      token += c
      next()
    }

    return
  }

  // find a comment '// ...'
  if (c === '/' && input[index + 1] === '/') {
    tokenType = TOKEN_TYPE.COMMENT

    // @ts-ignore
    while (c !== '' && c !== '\n') {
      token += c
      next()
    }

    return
  }

  getTokenUnknown()
}

// something unknown is found, wrong characters -> a syntax error
function getTokenUnknown () {
  tokenType = TOKEN_TYPE.UNKNOWN

  while (c !== '') {
    token += c
    next()
  }

  throw createSyntaxError('Syntax error in part "' + token + '"')
}

/**
 * Create an error
 * @param {string} message
 * @param {number} [c]  Optional index (character position) where the
 *                      error happened. If not provided, the start of
 *                      the current token is taken
 * @return {SyntaxError} instantiated error
 */
function createSyntaxError (message, c = undefined) {
  if (c === undefined) {
    c = index - token.length
  }
  const error = new SyntaxError(message + ' (char ' + c + ')')
  // @ts-ignore
  error.char = c

  return error
}

/**
 * Parse an object like '{"key": "value"}'
 * @return {*}
 */
function parseObject () {
  if (tokenType === TOKEN_TYPE.DELIMITER && token === '{') {
    processNextToken()

    // @ts-ignore
    // TODO: can we make this redundant?
    if (tokenType === TOKEN_TYPE.DELIMITER && token === '}') {
      // empty object
      processNextToken()
      return
    }

    while (true) {
      // parse key

      // @ts-ignore
      if (tokenType === TOKEN_TYPE.SYMBOL ||tokenType === TOKEN_TYPE.NUMBER) {
        // unquoted key -> add quotes around it, change it into a string
        tokenType = TOKEN_TYPE.STRING
        token = `"${token}"`
      }

      // @ts-ignore
      if (tokenType !== TOKEN_TYPE.STRING) {
        throw createSyntaxError('Object key expected')
      }
      processNextToken()

      // parse key/value separator
      // @ts-ignore
      if (tokenType !== TOKEN_TYPE.DELIMITER || token !== ':') {
        throw createSyntaxError('Colon expected')
      }
      processNextToken()

      // parse value
      parseObject()

      // parse key/value pair separator
      // @ts-ignore
      if (tokenType !== TOKEN_TYPE.DELIMITER || token !== ',') {
        break
      }
      processNextToken()

      // @ts-ignore
      if (tokenType === TOKEN_TYPE.DELIMITER && token === '}') {
        // we've just passed a trailing comma -> remove the trailing comma
        output = stripLastOccurrence(output, ',')
        break
      }
    }

    // @ts-ignore
    if (tokenType !== TOKEN_TYPE.DELIMITER || token !== '}') {
      throw createSyntaxError('Comma or end of object "}" expected')
    }
    processNextToken()

    return
  }

  parseArray()
}

/**
 * Parse an object like '["item1", "item2", ...]'
 * @return {*}
 */
function parseArray () : void {
  if (tokenType === TOKEN_TYPE.DELIMITER && token === '[') {
    processNextToken()

    // @ts-ignore
    if (tokenType === TOKEN_TYPE.DELIMITER && token === ']') {
      // empty array
      processNextToken()
      return
    }

    while (true) {
      // parse item
      parseObject()

      // parse item separator
      // @ts-ignore
      if (tokenType !== TOKEN_TYPE.DELIMITER || token !== ',') {
        break
      }
      processNextToken()

      // @ts-ignore
      if (tokenType === TOKEN_TYPE.DELIMITER && token === ']') {
        // we've just passed a trailing comma -> remove the trailing comma
        output = stripLastOccurrence(output, ',')
        break
      }
    }

    // @ts-ignore
    if (tokenType !== TOKEN_TYPE.DELIMITER || token !== ']') {
      throw createSyntaxError('Comma or end of array "]" expected')
    }
    processNextToken()
    return
  }

  parseString()
}

/**
 * Parse a string enclosed by double quotes "...". Can contain escaped quotes
 * @return {*}
 */
function parseString () : void {
  if (tokenType === TOKEN_TYPE.STRING) {
    processNextToken()
    return
  }

  parseNumber()
}

/**
 * Parse a number
 */
function parseNumber () : void {
  if (tokenType === TOKEN_TYPE.NUMBER) {
    processNextToken()
    return
  }

  parseSymbol()
}

/**
 * Parse constants true, false, null
 */
function parseSymbol () : void {
  if (tokenType === TOKEN_TYPE.SYMBOL) {
    if (SYMBOLS[token]) {
      processNextToken()
      return
    }

    // for example replace None with null
    if (PYTHON_SYMBOLS[token]) {
      token = PYTHON_SYMBOLS[token] // replace token
      processNextToken()
      return
    }

    // unknown symbol => turn into in a string
    output += '"'
    processNextToken()
    while (tokenType === TOKEN_TYPE.SYMBOL || tokenType === TOKEN_TYPE.NUMBER) {
      processNextToken()
    }
    output += '"'

    return
  }

  parseEnd()
}

/**
 * Evaluated when the expression is not yet ended but expected to end
 */
function parseEnd () {
  if (token === '') {
    // syntax error or unexpected end of expression
    throw createSyntaxError('Unexpected end of json string')
  } else {
    throw createSyntaxError('Value expected')
  }
}

/**
 * Check if the given character contains an alpha character, a-z, A-Z, _
 */
function isAlpha (c: string) : boolean {
  return /^[a-zA-Z_]$/.test(c)
}

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 */
function isHex (c: string) : boolean {
  return /^[0-9a-fA-F]$/.test(c)
}

/**
 * checks if the given char c is a digit
 */
function isDigit (c: string) : boolean {
  return (c >= '0' && c <= '9')
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
function isWhitespace (c: string) : boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

function isSpecialWhitespace (c: string) : boolean {
  return (
    c === '\u00A0' ||
    (c >= '\u2000' && c <= '\u200A') ||
    c === '\u202F' ||
    c === '\u205F' ||
    c === '\u3000')
}

function normalizeWhitespace (text: string) : string {
  let normalized = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    normalized += isSpecialWhitespace(char)
      ? ' '
      : char
  }

  return normalized
}

function isQuote (c: string) : boolean {
  return SINGLE_QUOTES.includes(c) || DOUBLE_QUOTES.includes(c)
}

function normalizeQuote (c: string) : string {
  if (SINGLE_QUOTES.includes(c)) {
    return '\''
  }

  if (DOUBLE_QUOTES.includes(c)) {
    return '"'
  }

  return c
}

function stripLastOccurrence(text, c) {
  const index = output.lastIndexOf(c)
  return (index !== -1)
    ? text.substring(0, index) + text.substring(index + 1)
    : text
}