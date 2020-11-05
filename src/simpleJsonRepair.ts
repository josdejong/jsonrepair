import JsonRepairError from './JsonRepairError'
import {
  insertAtIndex,
  insertBeforeLastWhitespace,
  isAlpha,
  isDigit,
  isHex,
  isQuote,
  isSpecialWhitespace,
  isWhitespace,
  normalizeQuote,
  normalizeWhitespace,
  stripLastOccurrence
} from './stringUtils'

// token types enumeration
const DELIMITER = 0
const NUMBER = 1
const STRING = 2
const SYMBOL = 3
const WHITESPACE = 4
const COMMENT = 5
const UNKNOWN = 6

// TODO: is there a better way to define TokenType?
type TokenType = 0 | 1 | 2 | 3 | 4 | 5 | 6

// map with all delimiters
const DELIMITERS = {
  '': true,
  '{': true,
  '}': true,
  '[': true,
  ']': true,
  ':': true,
  ',': true,

  // for JSONP and MongoDB data type notation
  '(': true,
  ')': true,
  ';': true
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
let tokenType: TokenType = UNKNOWN // type of current token

/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     repair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export default function simpleJsonRepair (text) {
  // initialize
  input = text
  output = ''
  index = 0
  c = input.charAt(0)
  token = ''
  tokenType = UNKNOWN

  // get first token
  processNextToken()

  // @ts-ignore
  const isRootLevelObject = tokenType === DELIMITER && token === '{'

  // parse everything
  parseObject()

  if (token === '') {
    // reached the end of the document properly
    return output
  }

  if (isRootLevelObject && tokenIsStartOfValue()) {
    // start of a new value after end of the root level object: looks like
    // newline delimited JSON -> turn into a root level array

    while (tokenIsStartOfValue()) {
      output = insertBeforeLastWhitespace(output, ',')

      // parse next newline delimited item
      parseObject()
    }

    // wrap the output in an array
    return `[\n${output}\n]`
  }

  throw new JsonRepairError('Unexpected characters', index - token.length)
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

// check whether the current token is the start of a value:
// object, array, number, string, or symbol
function tokenIsStartOfValue () : boolean {
  return (tokenType === DELIMITER && (token === '[' || token === '{')) ||
    tokenType === STRING ||
    tokenType === NUMBER ||
    tokenType === SYMBOL
}

// check whether the current token is the start of a key (or possible key):
// number, string, or symbol
function tokenIsStartOfKey () : boolean {
  return tokenType === STRING ||
    tokenType === NUMBER ||
    tokenType === SYMBOL
}

/**
 * Process the previous token, and get next token in the current text
 */
function processNextToken () {
  output += token

  tokenType = UNKNOWN
  token = ''

  getTokenDelimiter()

  // @ts-ignore
  if (tokenType === WHITESPACE) {
    // we leave the whitespace as it is, except replacing special white
    // space character
    token = normalizeWhitespace(token)
    processNextToken()
  }

  // @ts-ignore
  if (tokenType === COMMENT) {
    // ignore comments
    tokenType = UNKNOWN
    token = ''

    processNextToken()
  }
}

// check for delimiters like ':', '{', ']'
function getTokenDelimiter () {
  if (DELIMITERS[c]) {
    tokenType = DELIMITER
    token = c
    next()
    return
  }

  getTokenNumber()
}

// check for a number like "2.3e+5"
function getTokenNumber () {
  if (isDigit(c) || c === '-') {
    tokenType = NUMBER

    if (c === '-') {
      token += c
      next()

      if (!isDigit(c)) {
        throw new JsonRepairError('Invalid number, digit expected', index)
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
        throw new JsonRepairError('Invalid number, digit expected', index)
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
        throw new JsonRepairError('Invalid number, digit expected', index)
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
    tokenType = STRING
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
              throw new JsonRepairError('Invalid unicode character', index - token.length)
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
          throw new JsonRepairError('Invalid escape character "\\' + c + '"', index)
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
      throw new JsonRepairError('End of string expected', index - token.length)
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
    tokenType = SYMBOL

    while (isAlpha(c) || isDigit(c) || c === '$') {
      token += c
      next()
    }

    return
  }

  getTokenWhitespace()
}

// get whitespaces: space, tab, newline, and carriage return
function getTokenWhitespace () {
  if (isWhitespace(c) || isSpecialWhitespace(c)) {
    tokenType = WHITESPACE

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
    tokenType = COMMENT

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
    tokenType = COMMENT

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
  tokenType = UNKNOWN

  while (c !== '') {
    token += c
    next()
  }

  throw new JsonRepairError('Syntax error in part "' + token + '"', index - token.length)
}

/**
 * Parse an object like '{"key": "value"}'
 * @return {*}
 */
function parseObject () {
  if (tokenType === DELIMITER && token === '{') {
    processNextToken()

    // @ts-ignore
    // TODO: can we make this redundant?
    if (tokenType === DELIMITER && token === '}') {
      // empty object
      processNextToken()
      return
    }

    while (true) {
      // parse key

      // @ts-ignore
      if (tokenType === SYMBOL || tokenType === NUMBER) {
        // unquoted key -> add quotes around it, change it into a string
        tokenType = STRING
        token = `"${token}"`
      }

      // @ts-ignore
      if (tokenType !== STRING) {
        throw new JsonRepairError('Object key expected', index - token.length)
      }
      processNextToken()

      // parse colon (key/value separator)
      // @ts-ignore
      if (tokenType === DELIMITER && token === ':') {
        processNextToken()
      } else {
        if (tokenIsStartOfValue()) {
          // we expect a colon here, but got the start of a value
          // -> insert a colon before any inserted whitespaces at the end of output
          output = insertBeforeLastWhitespace(output, ':')
        } else {
          throw new JsonRepairError('Colon expected', index - token.length)
        }
      }

      // parse value
      parseObject()

      // parse comma (key/value pair separator)
      // @ts-ignore
      if (tokenType === DELIMITER && token === ',') {
        processNextToken()

        // @ts-ignore
        if (tokenType === DELIMITER && token === '}') {
          // we've just passed a trailing comma -> remove the trailing comma
          output = stripLastOccurrence(output, ',')
          break
        }
      } else {
        if (tokenIsStartOfKey()) {
          // we expect a comma here, but got the start of a new key
          // -> insert a comma before any inserted whitespaces at the end of output
          output = insertBeforeLastWhitespace(output, ',')
        } else {
          break
        }
      }
    }

    // @ts-ignore
    if (tokenType !== DELIMITER || token !== '}') {
      throw new JsonRepairError('Comma or end of object "}" expected', index - token.length)
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
  if (tokenType === DELIMITER && token === '[') {
    processNextToken()

    // @ts-ignore
    if (tokenType === DELIMITER && token === ']') {
      // empty array
      processNextToken()
      return
    }

    while (true) {
      // parse item
      parseObject()

      // parse comma (item separator)
      // @ts-ignore
      if (tokenType === DELIMITER && token === ',') {
        processNextToken()

        // @ts-ignore
        if (tokenType === DELIMITER && token === ']') {
          // we've just passed a trailing comma -> remove the trailing comma
          output = stripLastOccurrence(output, ',')
          break
        }
      } else {
        if (tokenIsStartOfValue()) {
          // we expect a comma here, but got the start of a new item
          // -> insert a comma before any inserted whitespaces at the end of output
          output = insertBeforeLastWhitespace(output, ',')
        } else {
          break
        }
      }
    }

    // @ts-ignore
    if (tokenType !== DELIMITER || token !== ']') {
      throw new JsonRepairError('Comma or end of array "]" expected', index - token.length)
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
  if (tokenType === STRING) {
    processNextToken()
    return
  }

  parseNumber()
}

/**
 * Parse a number
 */
function parseNumber () : void {
  if (tokenType === NUMBER) {
    processNextToken()
    return
  }

  parseSymbol()
}

/**
 * Parse constants true, false, null
 */
function parseSymbol () : void {
  if (tokenType === SYMBOL) {
    // a supported symbol: true, false, null
    if (SYMBOLS[token]) {
      processNextToken()
      return
    }

    // for example replace None with null
    if (PYTHON_SYMBOLS[token]) {
      token = PYTHON_SYMBOLS[token]
      processNextToken()
      return
    }

    // make a copy of the symbol, let's see what comes next
    const symbol: string = token
    const symbolIndex = output.length
    token = ''
    processNextToken()

    // @ts-ignore
    // if (tokenType === DELIMITER && token === '(') {
    if (tokenType === DELIMITER && token === '(') {
      // a MongoDB function call or JSONP call
      // Can be a MongoDB data type like in {"_id": ObjectId("123")}
      // token = '' // do not output the function name
      // processNextToken()

      // next()
      token = '' // do not output the ( character
      processNextToken()

      // process the part inside the brackets
      parseObject()

      // skip the closing bracket ")" and ");"
      // @ts-ignore
      if (tokenType === DELIMITER && token === ')') {
        token = '' // do not output the ) character
        processNextToken()

        if (tokenType === DELIMITER && token === ';') {
          token = '' // do not output the semicolon character
          processNextToken()
        }
      }

      return
    }

    // unknown symbol => turn into in a string
    // it is possible that by reading the next token we already inserted
    // extra spaces in the output which should be inside the string,
    // hence the symbolIndex
    output = insertAtIndex(output, `"${symbol}`, symbolIndex)
    while (tokenType === SYMBOL || tokenType === NUMBER) {
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
    throw new JsonRepairError('Unexpected end of json string', index - token.length)
  } else {
    throw new JsonRepairError('Value expected', index - token.length)
  }
}
