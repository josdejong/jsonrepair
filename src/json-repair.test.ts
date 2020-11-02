import { strictEqual } from 'assert'
import repair from './json-repair'

describe('repair', () => {
  it('should leave valid JSON as is', () => {
    strictEqual(repair('{"a":2}'), '{"a":2}')
  })

  it('should replace JavaScript with JSON', () => {
    strictEqual(repair('{a:2}'), '{"a":2}')
    strictEqual(repair('{a: 2}'), '{"a": 2}')
    strictEqual(repair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
    strictEqual(repair('{\'a\':2}'), '{"a":2}')
    strictEqual(repair('{a:\'foo\'}'), '{"a":"foo"}')
    strictEqual(repair('{a:\'foo\',b:\'bar\'}'), '{"a":"foo","b":"bar"}')

    // should leave string content untouched
    strictEqual(repair('"{a:b}"'), '"{a:b}"')
  })

  it('should add/remove escape characters', () => {
    strictEqual(repair('"foo\'bar"'), '"foo\'bar"')
    strictEqual(repair('"foo\\"bar"'), '"foo\\"bar"')
    strictEqual(repair('\'foo"bar\''), '"foo\\"bar"')
    strictEqual(repair('\'foo\\\'bar\''), '"foo\'bar"')
    strictEqual(repair('"foo\\\'bar"'), '"foo\'bar"')
  })

  it('should replace special white space characters', () => {
    strictEqual(repair('{"a":\u00a0"foo\u00a0bar"}'), '{"a": "foo\u00a0bar"}')
    strictEqual(repair('{"a":\u2009"foo"}'), '{"a": "foo"}')
  })

  it('should escape unescaped control characters', () => {
    strictEqual(repair('"hello\bworld"'), '"hello\\bworld"')
    strictEqual(repair('"hello\fworld"'), '"hello\\fworld"')
    strictEqual(repair('"hello\nworld"'), '"hello\\nworld"')
    strictEqual(repair('"hello\rworld"'), '"hello\\rworld"')
    strictEqual(repair('"hello\tworld"'), '"hello\\tworld"')
    strictEqual(repair('{"value\n": "dc=hcm,dc=com"}'), '{"value\\n": "dc=hcm,dc=com"}')
  })

  it('should replace left/right quotes', () => {
    strictEqual(repair('\u2018foo\u2019'), '"foo"')
    strictEqual(repair('\u201Cfoo\u201D'), '"foo"')
    strictEqual(repair('\u0060foo\u00B4'), '"foo"')
  })

  it('remove comments', () => {
    strictEqual(repair('/* foo */ {}'), ' {}')
    strictEqual(repair('/* foo */ {}'), ' {}')
    strictEqual(repair('{a:\'foo\',/*hello*/b:\'bar\'}'), '{"a":"foo","b":"bar"}')
    strictEqual(repair('{\na:\'foo\',//hello\nb:\'bar\'\n}'), '{\n"a":"foo",\n"b":"bar"\n}')

    // should not remove comments in string
    strictEqual(repair('{"str":"/* foo */"}'), '{"str":"/* foo */"}')
  })

  it('should strip JSONP notation', () => {
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

  it('should strip trailing commas', () => {
    // matching
    strictEqual(repair('[1,2,3,]'), '[1,2,3]')
    strictEqual(repair('[1,2,3,\n]'), '[1,2,3\n]')
    strictEqual(repair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
    strictEqual(repair('{"a":2,}'), '{"a":2}')

    // not matching
    strictEqual(repair('"[1,2,3,]"'), '"[1,2,3,]"')
    strictEqual(repair('"{a:2,}"'), '"{a:2,}"')
  })

  it('should strip MongoDB data types', () => {
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

  it('should replace Python constants None, True, False', () => {
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

  it('should repair missing comma between objects', () => {
    const text = '{"aray": [{}{}]}'
    const expected = '{"aray": [{},{}]}'

    strictEqual(repair(text), expected)
  })

  it('should not repair normal array with comma separated objects', () => {
    const text = '[\n{},\n{}\n]'

    strictEqual(repair(text), text)
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
    const expected = '[\n{},\n\n{},\n\n{}\n\n]'

    strictEqual(repair(text), expected)
  })
})
