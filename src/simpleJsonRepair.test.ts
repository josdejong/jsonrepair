import { strictEqual, deepStrictEqual, throws } from 'assert'
import simpleJsonRepair from './simpleJsonRepair'

describe('jsonRepair2', () => {
  describe('parse valid JSON', () => {
    it('parse full JSON object', function () {
      const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}'
      const parsed = simpleJsonRepair(text)

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
      strictEqual(simpleJsonRepair('{a:2}'), '{"a":2}')
      strictEqual(simpleJsonRepair('{a: 2}'), '{"a": 2}')
      strictEqual(simpleJsonRepair('{2: 2}'), '{"2": 2}')
      strictEqual(simpleJsonRepair('{true: 2}'), '{"true": 2}')
      strictEqual(simpleJsonRepair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
      strictEqual(simpleJsonRepair('{\'a\':2}'), '{"a":2}')
      strictEqual(simpleJsonRepair('{a:\'foo\'}'), '{"a":"foo"}')
      strictEqual(simpleJsonRepair('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}')

      // should leave string content untouched
      strictEqual(simpleJsonRepair('"{a:b}"'), '"{a:b}"')
    })

    it('should add/remove escape characters', () => {
      strictEqual(simpleJsonRepair('"foo\'bar"'), '"foo\'bar"')
      strictEqual(simpleJsonRepair('"foo\\"bar"'), '"foo\\"bar"')
      strictEqual(simpleJsonRepair('\'foo"bar\''), '"foo\\"bar"')
      strictEqual(simpleJsonRepair('\'foo\\\'bar\''), '"foo\'bar"')
      strictEqual(simpleJsonRepair('"foo\\\'bar"'), '"foo\'bar"')
    })

    it('should escape unescaped control characters', () => {
      strictEqual(simpleJsonRepair('"hello\bworld"'), '"hello\\bworld"')
      strictEqual(simpleJsonRepair('"hello\fworld"'), '"hello\\fworld"')
      strictEqual(simpleJsonRepair('"hello\nworld"'), '"hello\\nworld"')
      strictEqual(simpleJsonRepair('"hello\rworld"'), '"hello\\rworld"')
      strictEqual(simpleJsonRepair('"hello\tworld"'), '"hello\\tworld"')
      strictEqual(simpleJsonRepair('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
    })

    it('should replace special white space characters', () => {
      strictEqual(simpleJsonRepair('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}')
      strictEqual(simpleJsonRepair('{"a":\u2009"foo"}'), '{"a": "foo"}')
    })

    it('should replace non normalized left/right quotes', () => {
      strictEqual(simpleJsonRepair('\u2018foo\u2019'), '"foo"')
      strictEqual(simpleJsonRepair('\u201Cfoo\u201D'), '"foo"')
      strictEqual(simpleJsonRepair('\u0060foo\u00B4'), '"foo"')

      // mix single quotes
      strictEqual(simpleJsonRepair('\u0060foo\''), '"foo"')

      strictEqual(simpleJsonRepair('\u0060foo\''), '"foo"')
    })

    it('remove comments', () => {
      strictEqual(simpleJsonRepair('/* foo */ {}'), ' {}')
      strictEqual(simpleJsonRepair('/* foo */ {}'), ' {}')
      strictEqual(simpleJsonRepair('{"a":"foo",/*hello*/"b":"bar"}'), '{"a":"foo","b":"bar"}')
      strictEqual(simpleJsonRepair('{\n"a":"foo",//hello\n"b":"bar"\n}'), '{\n"a":"foo",\n"b":"bar"\n}')

      // should not remove comments in string
      strictEqual(simpleJsonRepair('{"str":"/* foo */"}'), '{"str":"/* foo */"}')
    })

    it('should strip JSONP notation', () => {
      // matching
      strictEqual(simpleJsonRepair('callback_123({});'), '{}')
      strictEqual(simpleJsonRepair('callback_123([]);'), '[]')
      strictEqual(simpleJsonRepair('callback_123(2);'), '2')
      strictEqual(simpleJsonRepair('callback_123("foo");'), '"foo"')
      strictEqual(simpleJsonRepair('callback_123(null);'), 'null')
      strictEqual(simpleJsonRepair('callback_123(true);'), 'true')
      strictEqual(simpleJsonRepair('callback_123(false);'), 'false')
      strictEqual(simpleJsonRepair('callback({}'), '{}')
      strictEqual(simpleJsonRepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(simpleJsonRepair('/* foo bar */ callback_123 ({})'), '  {}')
      strictEqual(simpleJsonRepair('/* foo bar */\ncallback_123({})'), '\n{}')
      strictEqual(simpleJsonRepair('/* foo bar */ callback_123 (  {}  )'), '    {}  ')
      strictEqual(simpleJsonRepair('  /* foo bar */   callback_123({});  '), '     {}  ')
      strictEqual(simpleJsonRepair('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '\n\n {}\n\n')

      // non-matching
      throws(() => simpleJsonRepair('callback {}'), /Unexpected characters/)
    })

    it('should strip trailing commas from an array', () => {
      strictEqual(simpleJsonRepair('[1,2,3,]'), '[1,2,3]')
      strictEqual(simpleJsonRepair('[1,2,3,\n]'), '[1,2,3\n]')
      strictEqual(simpleJsonRepair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
      strictEqual(simpleJsonRepair('[1,2,3,/*foo*/]'), '[1,2,3]')

      // not matching: inside a string
      strictEqual(simpleJsonRepair('"[1,2,3,]"'), '"[1,2,3,]"')
    })

    it('should strip trailing commas from an object', () => {
      strictEqual(simpleJsonRepair('{"a":2,}'), '{"a":2}')
      strictEqual(simpleJsonRepair('{"a":2  ,  }'), '{"a":2    }')
      strictEqual(simpleJsonRepair('{"a":2  , \n }'), '{"a":2   \n }')
      strictEqual(simpleJsonRepair('{"a":2/*foo*/,/*foo*/}'), '{"a":2}')

      // not matching: inside a string
      strictEqual(simpleJsonRepair('"{a:2,}"'), '"{a:2,}"')
    })

    it('should strip MongoDB data types', () => {
      // simple
      strictEqual(simpleJsonRepair('{"_id":ObjectId("123")}'), '{"_id":"123"}')

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

      strictEqual(simpleJsonRepair(mongoDocument), expectedJson)
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

      strictEqual(simpleJsonRepair(pythonDocument), expectedJson)
    })

    it('should turn unknown symbols into a string', () => {
      strictEqual(simpleJsonRepair('[1,foo,4]'), '[1,"foo",4]')
      strictEqual(simpleJsonRepair('foo'), '"foo"')
      strictEqual(simpleJsonRepair('{foo: bar}'), '{"foo": "bar"}')

      strictEqual(simpleJsonRepair('foo 2 bar'), '"foo 2 bar"')
      strictEqual(simpleJsonRepair('{greeting: hello world}'), '{"greeting": "hello world"}')
      // strictEqual(simpleJsonRepair('{greeting: hello world\nnext: "line"}'), '{"greeting": "hello world",\n"next": "line"}') // TODO
      // strictEqual(jsonRepair2('{greeting: hello world!}'), '{"greeting": "hello world!"}') // TODO
    })

    it('should repair missing comma between array items', () => {
      strictEqual(simpleJsonRepair('{"aray": [{}{}]}'), '{"aray": [{},{}]}')
      strictEqual(simpleJsonRepair('{"aray": [{} {}]}'), '{"aray": [{}, {}]}')
      strictEqual(simpleJsonRepair('{"aray": [{}\n{}]}'), '{"aray": [{},\n{}]}')

      // should leave normal array as is
      strictEqual(simpleJsonRepair('[\n{},\n{}\n]'), '[\n{},\n{}\n]')
    })

    it('should repair missing comma between object properties', () => {
      strictEqual(simpleJsonRepair('{"a":2\n"b":3\n}'), '{"a":2,\n"b":3\n}')
      strictEqual(simpleJsonRepair('{"a":2\n"b":3\nc:4}'), '{"a":2,\n"b":3,\n"c":4}')
    })

    it('should repair missing comma colon between object key and value', () => {
      strictEqual(simpleJsonRepair('{"a" "b"}'), '{"a": "b"}')
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

      strictEqual(simpleJsonRepair(text), expected)
    })
  })

  it('should throw an exception in case of non-repairable issues', function () {
    throws(function () { simpleJsonRepair('') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { simpleJsonRepair('{') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('{"a",') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('{:2}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('{"a":2,]') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('{"a" ]') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('{}}') }, { message: /Unexpected characters/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { simpleJsonRepair('[') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('[2,') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('[2,}') }, { message: /Value expected/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { simpleJsonRepair('2.3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('2..3') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('2e3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('2e') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('-') }, { message: /Invalid number, digit expected \(char 1\)/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { simpleJsonRepair('"a') }, { message: /End of string expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('foo [') }, { message: /Unexpected characters \(char 4\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('"\\a"') }, { message: /Invalid escape character "\\a" / }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('"\\u26"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { simpleJsonRepair('"\\uZ000"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
  })
})

function assertRepair (text: string) {
  strictEqual(simpleJsonRepair(text), text)
}
