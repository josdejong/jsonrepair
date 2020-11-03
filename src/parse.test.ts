import { strictEqual, deepStrictEqual, throws } from 'assert'
import { parse } from './parse'

// deepEqual objects compared as plain JSON instead of JavaScript classes
function deepEqual (t, a, b, message) {
  deepStrictEqual(jsonify(a), jsonify(b), message)
}

// turn a JavaScript object into plain JSON
function jsonify (obj) {
  return JSON.parse(JSON.stringify(obj))
}

describe('parse', () => {
  it('full JSON object', function () {
    const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}'
    const expected = { a: 2.3e100, b: 'str', c: null, d: false, e: [1, 2, 3] }
    const parsed = parse(text)

    deepStrictEqual(parsed, expected, 'should parse a JSON object correctly')
  })

  it('object', function () {
    deepStrictEqual(parse('{}'), {}, 'should parse an empty object')
    deepStrictEqual(parse('  { \n } \t '), {}, 'should parse an empty object with whitespaces')
    deepStrictEqual(parse('{"a": {}}'), { a: {} }, 'should parse an object containing an object')
    deepStrictEqual(parse('{"a": "b"}'), { a: 'b' }, 'should parse a non-empty object')
    deepStrictEqual(parse('{"a": 2}'), { a: 2 }, 'should parse a non-empty object')
  })

  it('array', function () {
    deepStrictEqual(parse('[]'), [], 'should parse an empty array')
    deepStrictEqual(parse('[{}]'), [{}], 'should parse an array containing an object')
    deepStrictEqual(parse('{"a":[]}'), { a: [] }, 'should parse an object containing an array')
    deepStrictEqual(parse('[1, "hi", true, false, null, {}, []]'), [1, 'hi', true, false, null, {}, []], 'should parse a non-empty array')
  })

  it('number', function () {
    deepStrictEqual(parse('23'), 23)
    deepStrictEqual(parse('0'), 0)
    deepStrictEqual(parse('0e+2'), 0)
    deepStrictEqual(parse('0.0'), 0)
    deepStrictEqual(parse('-0'), -0)
    deepStrictEqual(parse('2.3'), 2.3)
    deepStrictEqual(parse('2300e3'), 2300e3)
    deepStrictEqual(parse('2300e+3'), 2300e+3)
    deepStrictEqual(parse('2300e-3'), 2300e-3)
    deepStrictEqual(parse('-2'), -2)
    deepStrictEqual(parse('2e-3'), 2e-3)
    deepStrictEqual(parse('2.3e-3'), 2.3e-3)
  })

  it('string', function () {
    strictEqual(parse('"str"'), 'str', 'should parse a string')
    strictEqual(parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"'), '"\\/\b\f\n\r\t', 'should parse a string with escape characters')
    strictEqual(JSON.parse('"\\"\\\\\\/\\b\\f\\n\\r\\t"'), '"\\/\b\f\n\r\t', 'should parse a string with escape characters')
    strictEqual(parse('"\\u260E"'), '\u260E', 'should parse a string with unicode')
    strictEqual(JSON.parse('"\\u260E"'), '\u260E', 'should parse a string with unicode')
  })

  it('keywords', function () {
    strictEqual(parse('true'), true, 'should parse true')
    strictEqual(parse('false'), false, 'should parse false')
    strictEqual(parse('null'), null, 'should parse null')
  })

  it('correctly handle strings equaling a JSON delimiter', function () {
    deepStrictEqual(parse('""'), '')
    deepStrictEqual(parse('"["'), '[')
    deepStrictEqual(parse('"]"'), ']')
    deepStrictEqual(parse('"{"'), '{')
    deepStrictEqual(parse('"}"'), '}')
    deepStrictEqual(parse('":"'), ':')
    deepStrictEqual(parse('","'), ',')
  })

  it('throw exceptions', function () {
    throws(function () { parse('') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { parse('{') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('{"a",') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('{a:2}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('{"a":2,}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('{"a" "b"}') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('{}{}') }, { message: /Unexpected characters/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { parse('[') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('[2,') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('[2,]') }, { message: /Value expected/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { parse('2.3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('2..3') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('2e3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('2e') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('-') }, { message: /Invalid number, digit expected \(char 1\)/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { parse('"a') }, { message: /End of string expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('foo') }, { message: /Unknown symbol "foo"/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('"\\a"') }, { message: /Invalid escape character "\\a" / }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('"\\u26"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { parse('"\\uZ000"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
  })
})
