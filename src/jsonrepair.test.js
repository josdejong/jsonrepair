import { strictEqual, deepStrictEqual, throws } from 'assert'
import jsonrepair from './jsonrepair.js'

describe('jsonRepair', () => {
  describe('parse valid JSON', () => {
    it('parse full JSON object', function () {
      const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}'
      const parsed = jsonrepair(text)

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
      strictEqual(jsonrepair('{a:2}'), '{"a":2}')
      strictEqual(jsonrepair('{a: 2}'), '{"a": 2}')
      strictEqual(jsonrepair('{2: 2}'), '{"2": 2}')
      strictEqual(jsonrepair('{true: 2}'), '{"true": 2}')
      strictEqual(jsonrepair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
      strictEqual(jsonrepair('{\'a\':2}'), '{"a":2}')
      strictEqual(jsonrepair('{a:\'foo\'}'), '{"a":"foo"}')
      strictEqual(jsonrepair('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}')

      // should leave string content untouched
      strictEqual(jsonrepair('"{a:b}"'), '"{a:b}"')
    })

    it('should add/remove escape characters', () => {
      strictEqual(jsonrepair('"foo\'bar"'), '"foo\'bar"')
      strictEqual(jsonrepair('"foo\\"bar"'), '"foo\\"bar"')
      strictEqual(jsonrepair('\'foo"bar\''), '"foo\\"bar"')
      strictEqual(jsonrepair('\'foo\\\'bar\''), '"foo\'bar"')
      strictEqual(jsonrepair('"foo\\\'bar"'), '"foo\'bar"')
    })

    it('should escape unescaped control characters', () => {
      strictEqual(jsonrepair('"hello\bworld"'), '"hello\\bworld"')
      strictEqual(jsonrepair('"hello\fworld"'), '"hello\\fworld"')
      strictEqual(jsonrepair('"hello\nworld"'), '"hello\\nworld"')
      strictEqual(jsonrepair('"hello\rworld"'), '"hello\\rworld"')
      strictEqual(jsonrepair('"hello\tworld"'), '"hello\\tworld"')
      strictEqual(jsonrepair('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
    })

    it('should replace special white space characters', () => {
      strictEqual(jsonrepair('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}')
      strictEqual(jsonrepair('{"a":\u2009"foo"}'), '{"a": "foo"}')
    })

    it('should replace non normalized left/right quotes', () => {
      strictEqual(jsonrepair('\u2018foo\u2019'), '"foo"')
      strictEqual(jsonrepair('\u201Cfoo\u201D'), '"foo"')
      strictEqual(jsonrepair('\u0060foo\u00B4'), '"foo"')

      // mix single quotes
      strictEqual(jsonrepair('\u0060foo\''), '"foo"')

      strictEqual(jsonrepair('\u0060foo\''), '"foo"')
    })

    it('remove comments', () => {
      strictEqual(jsonrepair('/* foo */ {}'), ' {}')
      strictEqual(jsonrepair('/* foo */ {}'), ' {}')
      strictEqual(jsonrepair('{"a":"foo",/*hello*/"b":"bar"}'), '{"a":"foo","b":"bar"}')
      strictEqual(jsonrepair('{\n"a":"foo",//hello\n"b":"bar"\n}'), '{\n"a":"foo",\n"b":"bar"\n}')

      // should not remove comments in string
      strictEqual(jsonrepair('{"str":"/* foo */"}'), '{"str":"/* foo */"}')
    })

    it('should strip JSONP notation', () => {
      // matching
      strictEqual(jsonrepair('callback_123({});'), '{}')
      strictEqual(jsonrepair('callback_123([]);'), '[]')
      strictEqual(jsonrepair('callback_123(2);'), '2')
      strictEqual(jsonrepair('callback_123("foo");'), '"foo"')
      strictEqual(jsonrepair('callback_123(null);'), 'null')
      strictEqual(jsonrepair('callback_123(true);'), 'true')
      strictEqual(jsonrepair('callback_123(false);'), 'false')
      strictEqual(jsonrepair('callback({}'), '{}')
      strictEqual(jsonrepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(jsonrepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(jsonrepair('/* foo bar */\ncallback_123({})'), '\n{}')
      strictEqual(jsonrepair('/* foo bar */ callback_123 (  {}  )'), '    {}  ')
      strictEqual(jsonrepair('  /* foo bar */   callback_123({});  '), '     {}  ')
      strictEqual(jsonrepair('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '\n\n {}\n\n')

      // non-matching
      throws(() => jsonrepair('callback {}'), /Unexpected characters/)
    })

    it('should strip trailing commas from an array', () => {
      strictEqual(jsonrepair('[1,2,3,]'), '[1,2,3]')
      strictEqual(jsonrepair('[1,2,3,\n]'), '[1,2,3\n]')
      strictEqual(jsonrepair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
      strictEqual(jsonrepair('[1,2,3,/*foo*/]'), '[1,2,3]')

      // not matching: inside a string
      strictEqual(jsonrepair('"[1,2,3,]"'), '"[1,2,3,]"')
    })

    it('should strip trailing commas from an object', () => {
      strictEqual(jsonrepair('{"a":2,}'), '{"a":2}')
      strictEqual(jsonrepair('{"a":2  ,  }'), '{"a":2    }')
      strictEqual(jsonrepair('{"a":2  , \n }'), '{"a":2   \n }')
      strictEqual(jsonrepair('{"a":2/*foo*/,/*foo*/}'), '{"a":2}')

      // not matching: inside a string
      strictEqual(jsonrepair('"{a:2,}"'), '"{a:2,}"')
    })

    it('should add a missing closing bracket for an object', () => {
      strictEqual(jsonrepair('{"a":2'), '{"a":2}')
      strictEqual(jsonrepair('{"a":{"b":2}'), '{"a":{"b":2}}')
      strictEqual(jsonrepair('{\n  "a":{"b":2\n}'), '{\n  "a":{"b":2\n}}')
      strictEqual(jsonrepair('[{"b":2]'), '[{"b":2}]')
      strictEqual(jsonrepair('[{"b":2\n]'), '[{"b":2}\n]')
      strictEqual(jsonrepair('[{"i":1{"i":2}]'), '[{"i":1},{"i":2}]')
      // strictEqual(jsonrepair('[{"i":1,{"i":2}]'), '[{"i":1},{"i":2}]') // TODO
    })

    it('should add a missing closing bracket for an array', () => {
      strictEqual(jsonrepair('[1,2,3'), '[1,2,3]')
      strictEqual(jsonrepair('{\n"values":[1,2,3\n}'), '{\n"values":[1,2,3]\n}')
    })

    it('should strip MongoDB data types', () => {
      // simple
      strictEqual(jsonrepair('{"_id":ObjectId("123")}'), '{"_id":"123"}')

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

      strictEqual(jsonrepair(mongoDocument), expectedJson)
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

      strictEqual(jsonrepair(pythonDocument), expectedJson)
    })

    it('should turn unknown symbols into a string', () => {
      strictEqual(jsonrepair('[1,foo,4]'), '[1,"foo",4]')
      strictEqual(jsonrepair('foo'), '"foo"')
      strictEqual(jsonrepair('{foo: bar}'), '{"foo": "bar"}')

      strictEqual(jsonrepair('foo 2 bar'), '"foo 2 bar"')
      strictEqual(jsonrepair('{greeting: hello world}'), '{"greeting": "hello world"}')
      // strictEqual(jsonrepair('{greeting: hello world\nnext: "line"}'), '{"greeting": "hello world",\n"next": "line"}') // TODO
      // strictEqual(jsonRepair2('{greeting: hello world!}'), '{"greeting": "hello world!"}') // TODO
    })

    it('should concatenate strings', () => {
      strictEqual(jsonrepair('"hello" + " world"'), '"hello world"')
      strictEqual(jsonrepair('"hello" +\n " world"'), '"hello world"')
      strictEqual(jsonrepair('"hello" + /*comment*/ " world"'), '"hello world"')
      strictEqual(jsonrepair('{\n  "greeting": \'hello\' +\n \'world\'\n}'), '{\n  "greeting": "helloworld"\n}')
    })

    it('should repair missing comma between array items', () => {
      strictEqual(jsonrepair('{"aray": [{}{}]}'), '{"aray": [{},{}]}')
      strictEqual(jsonrepair('{"aray": [{} {}]}'), '{"aray": [{}, {}]}')
      strictEqual(jsonrepair('{"aray": [{}\n{}]}'), '{"aray": [{},\n{}]}')

      // should leave normal array as is
      strictEqual(jsonrepair('[\n{},\n{}\n]'), '[\n{},\n{}\n]')
    })

    it('should repair missing comma between object properties', () => {
      strictEqual(jsonrepair('{"a":2\n"b":3\n}'), '{"a":2,\n"b":3\n}')
      strictEqual(jsonrepair('{"a":2\n"b":3\nc:4}'), '{"a":2,\n"b":3,\n"c":4}')
    })

    it('should repair missing comma colon between object key and value', () => {
      strictEqual(jsonrepair('{"a" "b"}'), '{"a": "b"}')
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

      strictEqual(jsonrepair(text), expected)
    })
  })

  it('should throw an exception in case of non-repairable issues', function () {
    throws(function () { jsonrepair('') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonrepair('{') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('{"a",') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('{:2}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('{"a":2,]') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('{"a" ]') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('{}}') }, { message: /Unexpected characters/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonrepair('[') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('[2,') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('[2,}') }, { message: /Value expected/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonrepair('2.3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('2..3') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('2e3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('2e') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('-') }, { message: /Invalid number, digit expected \(char 1\)/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonrepair('"a') }, { message: /End of string expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('foo [') }, { message: /Unexpected characters \(char 4\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('"\\a"') }, { message: /Invalid escape character "\\a" / }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('"\\u26"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonrepair('"\\uZ000"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
  })
})

/**
 * @param {string} text
 */
function assertRepair (text) {
  strictEqual(jsonrepair(text), text)
}
