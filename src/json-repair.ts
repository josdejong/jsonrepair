/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     repair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export default function repair (jsString: string) : string {
  // TODO: refactor this function, it's too large and complicated now

  // escape all single and double quotes inside strings
  const chars = []
  let i = 0
  let indent = 0
  let isLineSeparatedJson = false

  // If JSON starts with a function (characters/digits/"_-"), remove this function.
  // This is useful for "stripping" JSONP objects to become JSON
  // For example: /* some comment */ function_12321321 ( [{"a":"b"}] ); => [{"a":"b"}]
  const match = jsString.match(/^\s*(\/\*(.|[\r\n])*?\*\/)?\s*[\da-zA-Z_$]+\s*\(([\s\S]*)\)\s*;?\s*$/)
  if (match) {
    jsString = match[3]
  }

  const controlChars = {
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t'
  }

  const quote = '\''
  const quoteDbl = '"'
  const quoteLeft = '\u2018'
  const quoteRight = '\u2019'
  const quoteDblLeft = '\u201C'
  const quoteDblRight = '\u201D'
  const graveAccent = '\u0060'
  const acuteAccent = '\u00B4'

  const pythonConstants = {
    None: 'null',
    True: 'true',
    False: 'false'
  }

  // helper functions to get the current/prev/next character
  function curr () { return jsString.charAt(i) }
  function next () { return jsString.charAt(i + 1) }
  function prev () { return jsString.charAt(i - 1) }

  function isWhiteSpace (c) {
    return c === ' ' || c === '\n' || c === '\r' || c === '\t'
  }

  // get the last parsed non-whitespace character
  function lastNonWhitespace () {
    let p = chars.length - 1

    while (p >= 0) {
      const pp = chars[p]
      if (!isWhiteSpace(pp)) {
        return pp
      }
      p--
    }

    return ''
  }

  // get at the first next non-white space character
  function nextNonWhiteSpace () {
    let iNext = i + 1
    while (iNext < jsString.length && isWhiteSpace(jsString[iNext])) {
      iNext++
    }

    return jsString[iNext]
  }

  // get at the first non-white space character starting at the current character
  function currNonWhiteSpace () {
    let iNext = i
    while (iNext < jsString.length && isWhiteSpace(jsString[iNext])) {
      iNext++
    }

    return jsString[iNext]
  }

  // skip a block comment '/* ... */'
  function skipBlockComment () {
    if (curr() === '/' && next() === '*') {
      i += 2
      while (i < jsString.length && (curr() !== '*' || next() !== '/')) {
        i++
      }
      i += 2

      if (curr() === '\n') {
        i++
      }
    }
  }

  // skip a comment '// ...'
  function skipComment () {
    if (curr() === '/' && next() === '/') {
      i += 2
      while (i < jsString.length && (curr() !== '\n')) {
        i++
      }
    }
  }

  function parseWhiteSpace () {
    let whitespace = ''
    while (i < jsString.length && isWhiteSpace(curr())) {
      whitespace += curr()
      i++
    }

    return whitespace
  }

  /**
   * parse single or double quoted string. Returns the parsed string
   * @param {string} endQuote
   * @return {string}
   */
  function parseString (endQuote) {
    let string = ''

    string += '"'
    i++
    let c = curr()
    while (i < jsString.length && c !== endQuote) {
      if (c === '"' && prev() !== '\\') {
        // unescaped double quote, escape it
        string += '\\"'
      } else if (c in controlChars) {
        // replace unescaped control characters with escaped ones
        string += controlChars[c]
      } else if (c === '\\') {
        // remove the escape character when followed by a single quote ', not needed
        i++
        c = curr()
        if (c !== '\'') {
          string += '\\'
        }
        string += c
      } else {
        // regular character
        string += c
      }

      i++
      c = curr()
    }
    if (c === endQuote) {
      string += '"'
      i++
    }

    return string
  }

  // parse an unquoted key
  function parseKey () {
    const specialValues = ['null', 'true', 'false']
    let key = ''
    let c = curr()

    const regexp = /[a-zA-Z_$\d]/ // letter, number, underscore, dollar character
    while (regexp.test(c)) {
      key += c
      i++
      c = curr()
    }

    if (key in pythonConstants) {
      return pythonConstants[key]
    } else if (specialValues.indexOf(key) === -1) {
      return '"' + key + '"'
    } else {
      return key
    }
  }

  function parseValue () {
    let c = curr()
    let value = ''
    while (/\w/.test(c)) {
      value += c
      i++
      c = curr()
    }

    if (value.length > 0 && c === '(') {
      // This is an MongoDB data type like in {"_id": ObjectId("123")}
      let innerValue
      i++
      c = curr()
      if (c === '"') {
        // a data type containing a string, like ISODate("2012-12-19T06:01:17.171Z")
        innerValue = parseString(c)
        c = curr()
      } else {
        // a data type containing a value, like 'NumberLong(2)'
        innerValue = ''
        while (c !== ')' && c !== '') {
          innerValue += c
          i++
          c = curr()
        }
      }

      if (c === ')') {
        // skip the closing bracket at the end
        i++

        // return the value (strip the data type object)
        return innerValue
      } else {
        // huh? that's unexpected. don't touch it
        return value + '(' + innerValue + c
      }
    } else if (typeof pythonConstants[value] === 'string') {
      // it's a python constant like None
      return pythonConstants[value]
    } else {
      // just leave as is
      return value
    }
  }

  function isSpecialWhiteSpace (c) {
    return (
      c === '\u00A0' ||
      (c >= '\u2000' && c <= '\u200A') ||
      c === '\u202F' ||
      c === '\u205F' ||
      c === '\u3000')
  }

  while (i < jsString.length) {
    skipBlockComment()
    skipComment()

    const c = curr()

    if (c === '{') {
      indent++
    }
    if (c === '}') {
      indent--
    }

    if (isSpecialWhiteSpace(c)) {
      // special white spaces (like non breaking space)
      chars.push(' ')
      i++
    } else if (c === quote) {
      chars.push(parseString(c))
    } else if (c === quoteDbl) {
      chars.push(parseString(quoteDbl))
    } else if (c === graveAccent) {
      chars.push(parseString(acuteAccent))
    } else if (c === quoteLeft) {
      chars.push(parseString(quoteRight))
    } else if (c === quoteDblLeft) {
      chars.push(parseString(quoteDblRight))
    } else if (c === '}') {
      // check for missing comma between objects
      chars.push(c)
      i++

      const whitespaces = parseWhiteSpace()
      skipBlockComment()

      if (currNonWhiteSpace() === '{') {
        chars.push(',')
        if (indent === 0) {
          isLineSeparatedJson = true
        }
      }
      chars.push(whitespaces)
    } else if (c === ',' && [']', '}'].indexOf(nextNonWhiteSpace()) !== -1) {
      // skip trailing commas
      i++
    } else if (/[a-zA-Z_$]/.test(c) && ['{', ','].indexOf(lastNonWhitespace()) !== -1) {
      // an unquoted object key (like a in '{a:2}')
      // FIXME: array values are also parsed via parseKey, work this out properly
      chars.push(parseKey())
    } else if (/\w/.test(c)) {
      chars.push(parseValue())
    } else {
      chars.push(c)
      i++
    }
  }

  if (isLineSeparatedJson) {
    // FIXME: only add enclosing [...] when not already there
    chars.unshift('[\n')
    chars.push('\n]')
  }

  return chars.join('')
}
