import { strictEqual, deepStrictEqual, throws } from 'assert'
import repair from './json-repair'
import { jsonRepair2 } from './json-repair2'

describe('repair', () => {
  it('parse full JSON object', function () {
    const text = '{"a":2.3e100,"b":"str","c":null,"d":false,"e":[1,2,3]}'
    const parsed = jsonRepair2(text)

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

  it.skip('should replace JavaScript with JSON', () => {
    strictEqual(repair('{a:2}'), '{"a":2}')
    strictEqual(repair('{a: 2}'), '{"a": 2}')
    strictEqual(repair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
    strictEqual(repair('{\'a\':2}'), '{"a":2}')
    strictEqual(repair('{a:\'foo\'}'), '{"a":"foo"}')
    strictEqual(repair('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}')

    // should leave string content untouched
    strictEqual(repair('"{a:b}"'), '"{a:b}"')
  })

  it.skip('should add/remove escape characters', () => {
    strictEqual(repair('"foo\'bar"'), '"foo\'bar"')
    strictEqual(repair('"foo\\"bar"'), '"foo\\"bar"')
    strictEqual(repair('\'foo"bar\''), '"foo\\"bar"')
    strictEqual(repair('\'foo\\\'bar\''), '"foo\'bar"')
    strictEqual(repair('"foo\\\'bar"'), '"foo\'bar"')
  })

  it.skip('should replace special white space characters', () => {
    strictEqual(repair('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}')
    strictEqual(repair('{"a":\u2009"foo"}'), '{"a": "foo"}')
  })

  it.skip('should escape unescaped control characters', () => {
    strictEqual(repair('"hello\bworld"'), '"hello\\bworld"')
    strictEqual(repair('"hello\fworld"'), '"hello\\fworld"')
    strictEqual(repair('"hello\nworld"'), '"hello\\nworld"')
    strictEqual(repair('"hello\rworld"'), '"hello\\rworld"')
    strictEqual(repair('"hello\tworld"'), '"hello\\tworld"')
    strictEqual(repair('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
  })

  it.skip('should replace left/right quotes', () => {
    strictEqual(repair('\u2018foo\u2019'), '"foo"')
    strictEqual(repair('\u201Cfoo\u201D'), '"foo"')
    strictEqual(repair('\u0060foo\u00B4'), '"foo"')
  })

  it.skip('remove comments', () => {
    strictEqual(repair('/* foo */ {}'), ' {}')
    strictEqual(repair('/* foo */ {}'), ' {}')
    strictEqual(repair('{a:\'foo\',/*hello*/b:\'bar\'}'), '{"a":"foo","b":"bar"}')
    strictEqual(repair('{\na:\'foo\',//hello\nb:\'bar\'\n}'), '{\n"a":"foo",\n"b":"bar"\n}')

    // should not remove comments in string
    strictEqual(repair('{"str":"/* foo */"}'), '{"str":"/* foo */"}')
  })

  it.skip('should strip JSONP notation', () => {
    // matching
    strictEqual(repair('callback_123({});'), '{}')
    strictEqual(repair('callback_123([]);'), '[]')
    strictEqual(repair('callback_123(2);'), '2')
    strictEqual(repair('callback_123("foo");'), '"foo"')
    strictEqual(repair('callback_123(null);'), 'null')
    strictEqual(repair('callback_123(true);'), 'true')
    strictEqual(repair('callback_123(false);'), 'false')
    strictEqual(repair('/* foo bar */ callback_123 ({})'), '{}')
    strictEqual(repair('/* foo bar */ callback_123 ({})'), '{}')
    strictEqual(repair('/* foo bar */\ncallback_123({})'), '{}')
    strictEqual(repair('/* foo bar */ callback_123 (  {}  )'), '  {}  ')
    strictEqual(repair('  /* foo bar */   callback_123 ({});  '), '{}')
    strictEqual(repair('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '{}')

    // non-matching
    strictEqual(repair('callback {}'), 'callback {}')
    strictEqual(repair('callback({}'), 'callback({}')
  })

  it.skip('should strip trailing commas', () => {
    // matching
    strictEqual(repair('[1,2,3,]'), '[1,2,3]')
    strictEqual(repair('[1,2,3,\n]'), '[1,2,3\n]')
    strictEqual(repair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
    strictEqual(repair('{"a":2,}'), '{"a":2}')

    // not matching
    strictEqual(repair('"[1,2,3,]"'), '"[1,2,3,]"')
    strictEqual(repair('"{a:2,}"'), '"{a:2,}"')
  })

  it.skip('should strip MongoDB data types', () => {
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

    strictEqual(repair(mongoDocument), expectedJson)
  })

  it.skip('should replace Python constants None, True, False', () => {
    const pythonDocument = '{\n' +
      '  "null": None,\n' +
      '  "true": True,\n' +
      '  "false": False\n' +
      '  "array": [1, foo, None, True, False]\n' +
      '}'

    const expectedJson = '{\n' +
      '  "null": null,\n' +
      '  "true": true,\n' +
      '  "false": false\n' +
      '  "array": [1, "foo", null, true, false]\n' +
      '}'

    strictEqual(repair(pythonDocument), expectedJson)
  })

  it.skip('should repair missing comma between objects', () => {
    const text = '{"aray": [{}{}]}'
    const expected = '{"aray": [{},{}]}'

    strictEqual(repair(text), expected)
  })

  it.skip('should not repair normal array with comma separated objects', () => {
    const text = '[\n{},\n{}\n]'

    strictEqual(repair(text), text)
  })

  it.skip('should repair newline separated json (for example from MongoDB)', () => {
    const text = '' +
      '/* 1 */\n' +
      '{}\n' +
      '\n' +
      '/* 2 */\n' +
      '{}\n' +
      '\n' +
      '/* 3 */\n' +
      '{}\n'
    const expected = '[\n{},\n\n{},\n\n{}\n\n]'

    strictEqual(repair(text), expected)
  })

  it('should throw exceptions', function () {
    throws(function () { jsonRepair2('') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair2('{') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('{"a",') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('{a:2}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('{"a":2,}') }, { message: /Object key expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('{"a" "b"}') }, { message: /Colon expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('{}{}') }, { message: /Unexpected characters/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair2('[') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('[2,') }, { message: /Unexpected end of json string/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('[2,]') }, { message: /Value expected/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair2('2.3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('2..3') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('2e3.4') }, { message: /Syntax error in part ".4" \(char 3\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('2e') }, { message: /Invalid number, digit expected \(char 2\)/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('-') }, { message: /Invalid number, digit expected \(char 1\)/ }, 'should throw an exception when parsing an invalid number')

    throws(function () { jsonRepair2('"a') }, { message: /End of string expected/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('foo') }, { message: /Unknown symbol "foo"/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('"\\a"') }, { message: /Invalid escape character "\\a" / }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('"\\u26"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
    throws(function () { jsonRepair2('"\\uZ000"') }, { message: /Invalid unicode character/ }, 'should throw an exception when parsing an invalid number')
  })
})

function assertRepair(text: string) {
  deepStrictEqual(jsonRepair2(text), text, 'should parse an empty object')
}
