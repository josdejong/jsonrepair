'use strict'

// token types enumeration
const TOKENTYPE = {
  NULL: 0,
  DELIMITER: 1,
  NUMBER: 2,
  STRING: 3,
  SYMBOL: 4,
  UNKNOWN: 5
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

let input = '' // current json text
let output = '' // generated output
let index = 0 // current index in text
let c = '' // current token character in text
let token = '' // current token
let tokenType = TOKENTYPE.NULL // type of current token

/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     repair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export function jsonRepair2 (text) {
  // initialize
  input = text
  output = ''
  index = 0
  c = input.charAt(0)
  token = ''
  tokenType = TOKENTYPE.NULL

  // get first token
  getToken()

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
 * @private
 */
function next () {
  index++
  c = input.charAt(index)
  // not using input[index] because that returns undefined when index is out of range
}

/**
 * Get next token in the current text.
 * The token and token type are available as token and tokenType
 * @private
 */
function getToken () {
  tokenType = TOKENTYPE.NULL
  token = ''

  // skip over whitespaces: space, tab, newline, and carriage return
  while (isWhiteSpace(c)) {
    output += c
    next()
  }

  // check for delimiters
  if (DELIMITERS[c]) {
    tokenType = TOKENTYPE.DELIMITER
    token = c
    next()
    return
  }

  // check for a number
  if (isDigit(c) || c === '-') {
    tokenType = TOKENTYPE.NUMBER

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

  // check for a string
  if (c === '"') {
    token += c
    tokenType = TOKENTYPE.STRING
    next()

    // @ts-ignore
    while (c !== '' && c !== '"') {
      if (c === '\\') {
        // handle escape characters
        token += c
        next()

        const unescaped = ESCAPE_CHARACTERS[c]
        if (unescaped !== undefined) {
          token += c
          next()
        } else if (c === 'u') {
          // parse escaped unicode character, like '\\u260E'
          token += c
          next()

          for (let u = 0; u < 4; u++) {
            if (!isHex(c)) {
              throw createSyntaxError('Invalid unicode character')
            }
            token += c
            next()
          }
        } else {
          throw createSyntaxError('Invalid escape character "\\' + c + '"', index)
        }
      } else {
        // a regular character
        token += c
        next()
      }
    }

    if (c !== '"') {
      throw createSyntaxError('End of string expected')
    }
    token += c
    next()

    return
  }

  // check for symbols (true, false, null)
  if (isAlpha(c)) {
    tokenType = TOKENTYPE.SYMBOL

    while (isAlpha(c)) {
      token += c
      next()
    }

    return
  }

  // something unknown is found, wrong characters -> a syntax error
  tokenType = TOKENTYPE.UNKNOWN
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
 * @private
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
  if (tokenType === TOKENTYPE.DELIMITER && token === '{') {
    output += token
    getToken()

    // @ts-ignore
    if (tokenType === TOKENTYPE.DELIMITER && token === '}') {
      // empty object
      output += token
      getToken()
      return
    }

    while (true) {
      // parse key
      if (tokenType !== TOKENTYPE.STRING) {
        throw createSyntaxError('Object key expected')
      }
      output += token
      getToken()

      // parse key/value separator
      // @ts-ignore
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ':') {
        throw createSyntaxError('Colon expected')
      }
      output += token
      getToken()

      // parse value
      parseObject()

      // parse key/value pair separator
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ',') {
        break
      }
      output += token
      getToken()
    }

    if (tokenType !== TOKENTYPE.DELIMITER || token !== '}') {
      throw createSyntaxError('Comma or end of object "}" expected')
    }
    output += token
    getToken()

    return
  }

  parseArray()
}

/**
 * Parse an object like '["item1", "item2", ...]'
 * @return {*}
 */
function parseArray () : void {
  if (tokenType === TOKENTYPE.DELIMITER && token === '[') {
    output += token
    getToken()

    // @ts-ignore
    if (tokenType === TOKENTYPE.DELIMITER && token === ']') {
      // empty array
      output += token
      getToken()
      return
    }

    while (true) {
      // parse item
      parseObject()

      // parse item separator
      // @ts-ignore
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ',') {
        break
      }
      output += token
      getToken()
    }

    // @ts-ignore
    if (tokenType !== TOKENTYPE.DELIMITER || token !== ']') {
      throw createSyntaxError('Comma or end of array "]" expected')
    }
    output += token
    getToken()
    return
  }

  parseString()
}

/**
 * Parse a string enclosed by double quotes "...". Can contain escaped quotes
 * @return {*}
 */
function parseString () : void {
  if (tokenType === TOKENTYPE.STRING) {
    output += token
    getToken()
    return
  }

  parseNumber()
}

/**
 * Parse a number
 */
function parseNumber () : void {
  if (tokenType === TOKENTYPE.NUMBER) {
    output += token
    getToken()
    return
  }

  parseSymbol()
}

/**
 * Parse constants true, false, null
 */
function parseSymbol () : void {
  if (tokenType === TOKENTYPE.SYMBOL) {
    if (token === 'true' || token === 'false' || token === 'null') {
      output += token
      getToken()
      return
    }

    throw createSyntaxError('Unknown symbol "' + token + '"')
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
 * @param {string} c   a string with one character
 * @return {boolean}
 */
function isAlpha (c) {
  return /^[a-zA-Z_]$/.test(c)
}

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 * @param {string} c   a string with one character
 * @return {boolean}
 */
function isHex (c) {
  return /^[0-9a-fA-F]$/.test(c)
}

/**
 * checks if the given char c is a digit
 * @param {string} c   a string with one character
 * @return {boolean}
 */
function isDigit (c) {
  return (c >= '0' && c <= '9')
}

/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
function isWhiteSpace (c: string) : boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}
