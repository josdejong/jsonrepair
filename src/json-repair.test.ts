import { strictEqual, deepStrictEqual, throws } from 'assert'
import jsonRepair from './json-repair'

describe('jsonRepair2', () => {
  describe('parse valid JSON', () => {
    it('parse full JSON object', function () {
      const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}'
      const parsed = jsonRepair(text)

      deepStrictEqual(parsed, text, 'should parse a JSON object correctly')
    })

    it('parse whitespace', function () {
      assertRepair('  { \n } \t ')
    })

    it('parse object', function () {
      assertRepair('{}')
      assertRepair('{"a": {}}')
      assertRepair('{"a": "b"}')
      assertRepair('{"a": 2}')
    })

    it('parse array', function () {
      assertRepair('[]')
      assertRepair('[{}]')
      assertRepair('{"a":[]}')
      assertRepair('[1, "hi", true, false, null, {}, []]')
    })

    it('parse number', function () {
      assertRepair('23')
      assertRepair('0')
      assertRepair('0e+2')
      assertRepair('0.0')
      assertRepair('-0')
      assertRepair('2.3')
      assertRepair('2300e3')
      assertRepair('2300e+3')
      assertRepair('2300e-3')
      assertRepair('-2')
      assertRepair('2e-3')
      assertRepair('2.3e-3')
    })

    it('parse string', function () {
      assertRepair('"str"')
      assertRepair('"\\"\\\\\\/\\b\\f\\n\\r\\t"')
      assertRepair('"\\u260E"')
    })

    it('parse keywords', function () {
      assertRepair('true')
      assertRepair('false')
      assertRepair('null')
    })

    it('correctly handle strings equaling a JSON delimiter', function () {
      assertRepair('""')
      assertRepair('"["')
      assertRepair('"]"')
      assertRepair('"{"')
      assertRepair('"}"')
      assertRepair('":"')
      assertRepair('","')
    })
  })

  describe('repair invalid JSON', () => {
    it('should replace JavaScript with JSON', () => {
      strictEqual(jsonRepair('{a:2}'), '{"a":2}')
      strictEqual(jsonRepair('{a: 2}'), '{"a": 2}')
      strictEqual(jsonRepair('{2: 2}'), '{"2": 2}')
      strictEqual(jsonRepair('{true: 2}'), '{"true": 2}')
      strictEqual(jsonRepair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
      strictEqual(jsonRepair('{\'a\':2}'), '{"a":2}')
      strictEqual(jsonRepair('{a:\'foo\'}'), '{"a":"foo"}')
      strictEqual(jsonRepair('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}')

      // should leave string content untouched
      strictEqual(jsonRepair('"{a:b}"'), '"{a:b}"')
    })

    it('should add/remove escape characters', () => {
      strictEqual(jsonRepair('"foo\'bar"'), '"foo\'bar"')
      strictEqual(jsonRepair('"foo\\"bar"'), '"foo\\"bar"')
      strictEqual(jsonRepair('\'foo"bar\''), '"foo\\"bar"')
      strictEqual(jsonRepair('\'foo\\\'bar\''), '"foo\'bar"')
      strictEqual(jsonRepair('"foo\\\'bar"'), '"foo\'bar"')
    })

    it('should escape unescaped control characters', () => {
      strictEqual(jsonRepair('"hello\bworld"'), '"hello\\bworld"')
      strictEqual(jsonRepair('"hello\fworld"'), '"hello\\fworld"')
      strictEqual(jsonRepair('"hello\nworld"'), '"hello\\nworld"')
      strictEqual(jsonRepair('"hello\rworld"'), '"hello\\rworld"')
      strictEqual(jsonRepair('"hello\tworld"'), '"hello\\tworld"')
      strictEqual(jsonRepair('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
    })

    it('should replace special white space characters', () => {
      strictEqual(jsonRepair('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}')
      strictEqual(jsonRepair('{"a":\u2009"foo"}'), '{"a": "foo"}')
    })

    it('should replace non normalized left/right quotes', () => {
      strictEqual(jsonRepair('\u2018foo\u2019'), '"foo"')
      strictEqual(jsonRepair('\u201Cfoo\u201D'), '"foo"')
      strictEqual(jsonRepair('\u0060foo\u00B4'), '"foo"')

      // mix single quotes
      strictEqual(jsonRepair('\u0060foo\''), '"foo"')

      strictEqual(jsonRepair('\u0060foo\''), '"foo"')
    })

    it('remove comments', () => {
      strictEqual(jsonRepair('/* foo */ {}'), ' {}')
      strictEqual(jsonRepair('/* foo */ {}'), ' {}')
      strictEqual(jsonRepair('{"a":"foo",/*hello*/"b":"bar"}'), '{"a":"foo","b":"bar"}')
      strictEqual(jsonRepair('{\n"a":"foo",//hello\n"b":"bar"\n}'), '{\n"a":"foo",\n"b":"bar"\n}')

      // should not remove comments in string
      strictEqual(jsonRepair('{"str":"/* foo */"}'), '{"str":"/* foo */"}')
    })

    it('should strip JSONP notation', () => {
      // matching
      strictEqual(jsonRepair('callback_123({});'), '{}')
      strictEqual(jsonRepair('callback_123([]);'), '[]')
      strictEqual(jsonRepair('callback_123(2);'), '2')
      strictEqual(jsonRepair('callback_123("foo");'), '"foo"')
      strictEqual(jsonRepair('callback_123(null);'), 'null')
      strictEqual(jsonRepair('callback_123(true);'), 'true')
      strictEqual(jsonRepair('callback_123(false);'), 'false')
      strictEqual(jsonRepair('callback({}'), '{}')
      strictEqual(jsonRepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(jsonRepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(jsonRepair('/* foo bar */\ncallback_123({})'), '\n{}')
      strictEqual(jsonRepair('/* foo bar */ callback_123 (  {}  )'), '    {}  ')
      strictEqual(jsonRepair('  /* foo bar */   callback_123({});  '), '     {}  ')
      strictEqual(jsonRepair('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '\n\n {}\n\n')

      // non-matching
      throws(() => jsonRepair('callback {}'), /Unexpected characters/)
    })

    it('should strip trailing commas from an array', () => {
      strictEqual(jsonRepair('[1,2,3,]'), '[1,2,3]')
      strictEqual(jsonRepair('[1,2,3,\n]'), '[1,2,3\n]')
      strictEqual(jsonRepair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
      strictEqual(jsonRepair('[1,2,3,/*foo*/]'), '[1,2,3]')

      // not matching: inside a string
      strictEqual(jsonRepair('"[1,2,3,]"'), '"[1,2,3,]"')
    })

    it('should strip trailing commas from an object', () => {
      strictEqual(jsonRepair('{"a":2,}'), '{"a":2}')
      strictEqual(jsonRepair('{"a":2  ,  }'), '{"a":2    }')
      strictEqual(jsonRepair('{"a":2  , \n }'), '{"a":2   \n }')
      strictEqual(jsonRepair('{"a":2/*foo*/,/*foo*/}'), '{"a":2}')

      // not matching: inside a string
      strictEqual(jsonRepair('"{a:2,}"'), '"{a:2,}"')
    })

    it('should strip MongoDB data types', () => {
      // simple
      strictEqual(jsonRepair('{"_id":ObjectId("123")}'), '{"_id":"123"}')

      // extensive
      const mongoDocument = '{\n' +
        '   "_id" : ObjectId("123"),\n' +
        '   "isoDate" : ISODate("2012-12-19T06:01:17.171Z"),\n' +
        '   "regularNumber" : 67,\n' +
        '   "long" : NumberLong("2"),\n' +
        '   "long2" : NumberLong(2),\n' +
        '   "int" : NumberInt("3"),\n' +
        '   "int2" : NumberInt(3),\n' +
        '   "decimal" : NumberDecimal("4"),\n' +
        '   "decimal2" : NumberDecimal(4)\n' +
        '}'

      const expectedJson = '{\n' +
        '   "_id" : "123",\n' +
        '   "isoDate" : "2012-12-19T06:01:17.171Z",\n' +
        '   "regularNumber" : 67,\n' +
        '   "long" : "2",\n' +
        '   "long2" : 2,\n' +
        '   "int" : "3",\n' +
        '   "int2" : 3,\n' +
        '   "decimal" : "4",\n' +
        '   "decimal2" : 4\n' +
        '}'

      strictEqual(jsonRepair(mongoDocument), expectedJson)
    })

    it('should replace Python constants None, True, False', () => {
      const pythonDocument = '{\n' +
        '  "null": None,\n' +
        '  "true": True,\n' +
        '  "false": False,\n' +
        '  "array": [1, None, True, False]\n' +
        '}'

      const expectedJson = '{\n' +
        '  "null": null,\n' +
        '  "true": true,\n' +
        '  "false": false,\n' +
        '  "array": [1, null, true, false]\n' +
        '}'

      strictEqual(jsonRepair(pythonDocument), expectedJson)
    })

    it('should turn unknown symbols into a string', () => {
      strictEqual(jsonRepair('[1,foo,4]'), '[1,"foo",4]')
      strictEqual(jsonRepair('foo'), '"foo"')
      strictEqual(jsonRepair('{foo: bar}'), '{"foo": "bar"}')

      strictEqual(jsonRepair('foo 2 bar'), '"foo 2 bar"')
      strictEqual(jsonRepair('{greeting: hello world}'), '{"greeting": "hello world"}')
      // strictEqual(jsonRepair2('{greeting: hello world!}'), '{"greeting": "hello world!"}') // TODO
    })

    it('should repair missing comma between array items', () => {
      strictEqual(jsonRepair('{"aray": [{}{}]}'), '{"aray": [{},{}]}')
      strictEqual(jsonRepair('{"aray": [{} {}]}'), '{"aray": [{}, {}]}')
      strictEqual(jsonRepair('{"aray": [{}\n{}]}'), '{"aray": [{},\n{}]}')

      // should leave normal array as is
      strictEqual(jsonRepair('[\n{},\n{}\n]'), '[\n{},\n{}\n]')
    })

    it('should repair missing comma between object properties', () => {
      strictEqual(jsonRepair('{"a":2\n"b":3\n}'), '{"a":2,\n"b":3\n}')
      strictEqual(jsonRepair('{"a":2\n"b":3\nc:4}'), '{"a":2,\n"b":3,\n"c":4}')
    })

    it('should repair missing comma colon between object key and value', () => {
      strictEqual(jsonRepair('{"a" "b"}'), '{"a": "b"}')
    })

    it('should repair newline separated json (for example from MongoDB)', () => {
      const text = '' +
        '/* 1 */\n' +
        '{}\n' +
        '\n' +
        '/* 2 */\n' +
        '{}\n' +
        '\n' +
        '/* 3 */\n' +
        '{}\n'
      const expected = '[\n\n{},\n\n\n{},\n\n\n{}\n\n]'

      strictEqual(jsonRepair(text), expected)
    })
  })

  it('should throw an exception in case of non-repairable issues', function () {
    throws(function () { jsonRepair('') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair('{') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('{"a",') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('{:2}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('{"a":2,]') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('{"a" ]') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('{}}') }, { message: /Unexpected characters/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair('[') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('[2,') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('[2,}') }, { message: /Value expected/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair('2.3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('2..3') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('2e3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('2e') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('-') }, { message: /Invalid number, digit expected \(char 1\)/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair('"a') }, { message: /End of string expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('foo [') }, { message: /Unexpected characters \(char 4\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('"\\a"') }, { message: /Invalid escape character "\\a" / }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('"\\u26"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair('"\\uZ000"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
  })
})

function assertRepair (text: string) {
  strictEqual(jsonRepair(text), text)
}
