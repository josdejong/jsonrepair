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

let jsonText = '' // current json text
let index = 0 // current index in text
let c = '' // current token character in text
let token = '' // current token
let tokenType = TOKENTYPE.NULL // type of current token

/**
 * The LosslessJSON.parse() method parses a string as JSON, optionally transforming
 * the value produced by parsing.
 *
 * @param {string} text
 * The string to parse as JSON. See the JSON object for a description of JSON syntax.
 *
 * @returns Returns the Object corresponding to the given JSON text.
 *
 * @throws Throws a SyntaxError exception if the string to parse is not valid JSON.
 */
export function parse (text) {
  // initialize
  jsonText = text
  index = 0
  c = jsonText.charAt(0)
  token = ''
  tokenType = TOKENTYPE.NULL

  // get first token
  getToken()

  // parse everything
  const json = parseObject()

  if (token !== '') {
    throw createSyntaxError('Unexpected characters')
  }

  return json
}

/**
 * Get the next character from the expression.
 * The character is stored into the char c. If the end of the expression is
 * reached, the function puts an empty string in c.
 * @private
 */
function next () {
  index++
  c = jsonText.charAt(index)
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
  while (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
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
    tokenType = TOKENTYPE.STRING
    next()

    // @ts-ignore
    while (c !== '' && c !== '"') {
      if (c === '\\') {
        // handle escape characters
        next()

        const unescaped = ESCAPE_CHARACTERS[c]
        if (unescaped !== undefined) {
          token += unescaped
          next()
        } else if (c === 'u') {
          // parse escaped unicode character, like '\\u260E'
          next()

          let hex = ''
          for (let u = 0; u < 4; u++) {
            if (!isHex(c)) {
              throw createSyntaxError('Invalid unicode character')
            }
            hex += c
            next()
          }

          token += String.fromCharCode(parseInt(hex, 16))
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
 * Check if the given character contains an alpha character, a-z, A-Z, _
 * @param {string} c   a string with one character
 * @return {boolean}
 */
function isAlpha (c) {
  return /^[a-zA-Z_]/.test(c)
}

/**
 * Check if the given character contains a hexadecimal character 0-9, a-f, A-F
 * @param {string} c   a string with one character
 * @return {boolean}
 */
function isHex (c) {
  return /^[0-9a-fA-F]/.test(c)
}

/**
 * checks if the given char c is a digit
 * @param {string} c   a string with one character
 * @return {boolean}
 * @private
 */
function isDigit (c) {
  return (c >= '0' && c <= '9')
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
    getToken()

    let key
    const object = {}

    // @ts-ignore
    if (tokenType === TOKENTYPE.DELIMITER && token === '}') {
      // empty object
      getToken()
      return object
    }

    while (true) {
      // parse key
      if (tokenType !== TOKENTYPE.STRING) {
        throw createSyntaxError('Object key expected')
      }
      key = token
      getToken()

      // parse key/value separator
      // @ts-ignore
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ':') {
        throw createSyntaxError('Colon expected')
      }
      getToken()

      // parse value
      object[key] = parseObject()

      // parse key/value pair separator
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ',') {
        break
      }
      getToken()
    }

    if (tokenType !== TOKENTYPE.DELIMITER || token !== '}') {
      throw createSyntaxError('Comma or end of object "}" expected')
    }
    getToken()

    return object
  }

  return parseArray()
}

/**
 * Parse an object like '["item1", "item2", ...]'
 * @return {*}
 */
function parseArray () {
  if (tokenType === TOKENTYPE.DELIMITER && token === '[') {
    getToken()

    const array = []

    // @ts-ignore
    if (tokenType === TOKENTYPE.DELIMITER && token === ']') {
      // empty array
      getToken()
      return array
    }

    while (true) {
      // parse item
      array.push(parseObject())

      // parse item separator
      // @ts-ignore
      if (tokenType !== TOKENTYPE.DELIMITER || token !== ',') {
        break
      }
      getToken()
    }

    // @ts-ignore
    if (tokenType !== TOKENTYPE.DELIMITER || token !== ']') {
      throw createSyntaxError('Comma or end of array "]" expected')
    }
    getToken()

    return array
  }

  return parseString()
}

/**
 * Parse a string enclosed by double quotes "...". Can contain escaped quotes
 * @return {*}
 */
function parseString () {
  if (tokenType === TOKENTYPE.STRING) {
    const str = token
    getToken()
    return str
  }

  return parseNumber()
}

/**
 * Parse a number. The number will be parsed as a LosslessNumber.
 * @return {*}
 */
function parseNumber () {
  if (tokenType === TOKENTYPE.NUMBER) {
    const number = parseFloat(token)
    getToken()
    return number
  }

  return parseSymbol()
}

/**
 * Parse constants true, false, null
 * @return {boolean | null}
 */
function parseSymbol () {
  if (tokenType === TOKENTYPE.SYMBOL) {
    if (token === 'true') {
      getToken()
      return true
    }
    if (token === 'false') {
      getToken()
      return false
    }
    if (token === 'null') {
      getToken()
      return null
    }

    throw createSyntaxError('Unknown symbol "' + token + '"')
  }

  return parseEnd()
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
