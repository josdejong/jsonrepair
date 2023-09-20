import { strictEqual, deepStrictEqual, throws } from 'assert'
import { jsonrepair } from './jsonrepair.js'
import { JSONRepairError } from './JSONRepairError.js'

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

    it('supports unicode characters in a string', () => {
      strictEqual(jsonrepair('"★"'), '"★"')
      strictEqual(jsonrepair('"\u2605"'), '"\u2605"')
      strictEqual(jsonrepair('"😀"'), '"😀"')
      strictEqual(jsonrepair('"\ud83d\ude00"'), '"\ud83d\ude00"')
      strictEqual(jsonrepair('"йнформация"'), '"йнформация"')
    })

    it('supports escaped unicode characters in a string', () => {
      strictEqual(jsonrepair('"\\u2605"'), '"\\u2605"')
      strictEqual(jsonrepair('"\\ud83d\\ude00"'), '"\\ud83d\\ude00"')
      strictEqual(
        jsonrepair('"\\u0439\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f"'),
        '"\\u0439\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f"'
      )
    })

    it('supports unicode characters in a key', () => {
      strictEqual(jsonrepair('{"★":true}'), '{"★":true}')
      strictEqual(jsonrepair('{"\u2605":true}'), '{"\u2605":true}')
      strictEqual(jsonrepair('{"😀":true}'), '{"😀":true}')
      strictEqual(jsonrepair('{"\ud83d\ude00":true}'), '{"\ud83d\ude00":true}')
    })
  })

  describe('repair invalid JSON', () => {
    it('should add missing quotes', () => {
      strictEqual(jsonrepair('abc'), '"abc"')
      strictEqual(jsonrepair('hello   world'), '"hello   world"')
      strictEqual(jsonrepair('{a:2}'), '{"a":2}')
      strictEqual(jsonrepair('{a: 2}'), '{"a": 2}')
      strictEqual(jsonrepair('{2: 2}'), '{"2": 2}')
      strictEqual(jsonrepair('{true: 2}'), '{"true": 2}')
      strictEqual(jsonrepair('{\n  a: 2\n}'), '{\n  "a": 2\n}')
      strictEqual(jsonrepair('[a,b]'), '["a","b"]')
      strictEqual(jsonrepair('[\na,\nb\n]'), '[\n"a",\n"b"\n]')
    })

    it('should add missing end quote', () => {
      strictEqual(jsonrepair('"abc'), '"abc"')
      strictEqual(jsonrepair("'abc"), '"abc"')
      strictEqual(jsonrepair('\u2018abc'), '"abc"')
    })

    it('should replace single quotes with double quotes', () => {
      strictEqual(jsonrepair("{'a':2}"), '{"a":2}')
      strictEqual(jsonrepair("{'a':'foo'}"), '{"a":"foo"}')
      strictEqual(jsonrepair('{"a":\'foo\'}'), '{"a":"foo"}')
      strictEqual(jsonrepair("{a:'foo',b:'bar'}"), '{"a":"foo","b":"bar"}')
    })

    it('should replace special quotes with double quotes', () => {
      strictEqual(jsonrepair('{“a”:“b”}'), '{"a":"b"}')
      strictEqual(jsonrepair('{‘a’:‘b’}'), '{"a":"b"}')
      strictEqual(jsonrepair('{`a´:`b´}'), '{"a":"b"}')
    })

    it('should not replace special quotes inside a normal string', () => {
      strictEqual(jsonrepair('"Rounded “ quote"'), '"Rounded “ quote"')
    })

    it('should leave string content untouched', () => {
      strictEqual(jsonrepair('"{a:b}"'), '"{a:b}"')
    })

    it('should add/remove escape characters', () => {
      strictEqual(jsonrepair('"foo\'bar"'), '"foo\'bar"')
      strictEqual(jsonrepair('"foo\\"bar"'), '"foo\\"bar"')
      strictEqual(jsonrepair("'foo\"bar'"), '"foo\\"bar"')
      strictEqual(jsonrepair("'foo\\'bar'"), '"foo\'bar"')
      strictEqual(jsonrepair('"foo\\\'bar"'), '"foo\'bar"')
      strictEqual(jsonrepair('"\\a"'), '"a"')
    })

    it('should repair a missing object value', () => {
      strictEqual(jsonrepair('{"a":}'), '{"a":null}')
      strictEqual(jsonrepair('{"a":,"b":2}'), '{"a":null,"b":2}')
      strictEqual(jsonrepair('{"a":'), '{"a":null}')
    })

    it('should repair undefined values', () => {
      strictEqual(jsonrepair('{"a":undefined}'), '{"a":null}')
      strictEqual(jsonrepair('[undefined]'), '[null]')
      strictEqual(jsonrepair('undefined'), 'null')
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
      strictEqual(jsonrepair('{"a":\u202F"foo"}'), '{"a": "foo"}')
      strictEqual(jsonrepair('{"a":\u205F"foo"}'), '{"a": "foo"}')
      strictEqual(jsonrepair('{"a":\u3000"foo"}'), '{"a": "foo"}')
    })

    it('should replace non normalized left/right quotes', () => {
      strictEqual(jsonrepair('\u2018foo\u2019'), '"foo"')
      strictEqual(jsonrepair('\u201Cfoo\u201D'), '"foo"')
      strictEqual(jsonrepair('\u0060foo\u00B4'), '"foo"')

      // mix single quotes
      strictEqual(jsonrepair("\u0060foo'"), '"foo"')

      strictEqual(jsonrepair("\u0060foo'"), '"foo"')
    })

    it('should remove block comments', () => {
      strictEqual(jsonrepair('/* foo */ {}'), ' {}')
      strictEqual(jsonrepair('{} /* foo */ '), '{}  ')
      strictEqual(jsonrepair('{} /* foo '), '{} ')
      strictEqual(jsonrepair('\n/* foo */\n{}'), '\n\n{}')
      strictEqual(jsonrepair('{"a":"foo",/*hello*/"b":"bar"}'), '{"a":"foo","b":"bar"}')
    })

    it('should remove line comments', () => {
      strictEqual(jsonrepair('{} // comment'), '{} ')
      strictEqual(jsonrepair('{\n"a":"foo",//hello\n"b":"bar"\n}'), '{\n"a":"foo",\n"b":"bar"\n}')
    })

    it('should not remove comments inside a string', () => {
      strictEqual(jsonrepair('"/* foo */"'), '"/* foo */"')
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
      strictEqual(jsonrepair('/* foo bar */ callback_123 ({})'), ' {}')
      strictEqual(jsonrepair('/* foo bar */ callback_123 ({})'), ' {}')
      strictEqual(jsonrepair('/* foo bar */\ncallback_123({})'), '\n{}')
      strictEqual(jsonrepair('/* foo bar */ callback_123 (  {}  )'), '   {}  ')
      strictEqual(jsonrepair('  /* foo bar */   callback_123({});  '), '     {}  ')
      strictEqual(jsonrepair('\n/* foo\nbar */\ncallback_123 ({});\n\n'), '\n\n{}\n\n')

      // non-matching
      throws(
        () => console.log({ output: jsonrepair('callback {}') }),
        new JSONRepairError('Unexpected character "{"', 9)
      )
    })

    it('should repair escaped string contents', () => {
      strictEqual(jsonrepair('\\"hello world\\"'), '"hello world"')
      strictEqual(jsonrepair('\\"hello world\\'), '"hello world"')
      strictEqual(jsonrepair('\\"hello \\\\"world\\\\"\\"'), '"hello \\"world\\""')
      strictEqual(jsonrepair('[\\"hello \\\\"world\\\\"\\"]'), '["hello \\"world\\""]')
      strictEqual(
        jsonrepair('{\\"stringified\\": \\"hello \\\\"world\\\\"\\"}'),
        '{"stringified": "hello \\"world\\""}'
      )

      // the following is weird but understandable
      strictEqual(jsonrepair('[\\"hello\\, \\"world\\"]'), '["hello, ","world\\\\","]"]')

      // the following is sort of invalid: the end quote should be escaped too,
      // but the fixed result is most likely what you want in the end
      strictEqual(jsonrepair('\\"hello"'), '"hello"')
    })

    it('should strip trailing commas from an array', () => {
      strictEqual(jsonrepair('[1,2,3,]'), '[1,2,3]')
      strictEqual(jsonrepair('[1,2,3,\n]'), '[1,2,3\n]')
      strictEqual(jsonrepair('[1,2,3,  \n  ]'), '[1,2,3  \n  ]')
      strictEqual(jsonrepair('[1,2,3,/*foo*/]'), '[1,2,3]')
      strictEqual(jsonrepair('{"array":[1,2,3,]}'), '{"array":[1,2,3]}')

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

    it('should strip trailing comma at the end', () => {
      strictEqual(jsonrepair('4,'), '4')
      strictEqual(jsonrepair('4 ,'), '4 ')
      strictEqual(jsonrepair('4 , '), '4  ')
      strictEqual(jsonrepair('{"a":2},'), '{"a":2}')
      strictEqual(jsonrepair('[1,2,3],'), '[1,2,3]')
    })

    it('should add a missing closing bracket for an object', () => {
      strictEqual(jsonrepair('{'), '{}')
      strictEqual(jsonrepair('{"a":2'), '{"a":2}')
      strictEqual(jsonrepair('{"a":2,'), '{"a":2}')
      strictEqual(jsonrepair('{"a":{"b":2}'), '{"a":{"b":2}}')
      strictEqual(jsonrepair('{\n  "a":{"b":2\n}'), '{\n  "a":{"b":2\n}}')
      strictEqual(jsonrepair('[{"b":2]'), '[{"b":2}]')
      strictEqual(jsonrepair('[{"b":2\n]'), '[{"b":2}\n]')
      strictEqual(jsonrepair('[{"i":1{"i":2}]'), '[{"i":1},{"i":2}]')
      strictEqual(jsonrepair('[{"i":1,{"i":2}]'), '[{"i":1},{"i":2}]')
    })

    it('should add a missing closing bracket for an array', () => {
      strictEqual(jsonrepair('['), '[]')
      strictEqual(jsonrepair('[1,2,3'), '[1,2,3]')
      strictEqual(jsonrepair('[1,2,3,'), '[1,2,3]')
      strictEqual(jsonrepair('[[1,2,3,'), '[[1,2,3]]')
      strictEqual(jsonrepair('{\n"values":[1,2,3\n}'), '{\n"values":[1,2,3]\n}')
      strictEqual(jsonrepair('{\n"values":[1,2,3\n'), '{\n"values":[1,2,3]}\n')
    })

    it('should strip MongoDB data types', () => {
      // simple
      strictEqual(jsonrepair('NumberLong("2")'), '"2"')
      strictEqual(jsonrepair('{"_id":ObjectId("123")}'), '{"_id":"123"}')

      // extensive
      const mongoDocument =
        '{\n' +
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

      const expectedJson =
        '{\n' +
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
      strictEqual(jsonrepair('True'), 'true')
      strictEqual(jsonrepair('False'), 'false')
      strictEqual(jsonrepair('None'), 'null')
    })

    it('should turn unknown symbols into a string', () => {
      strictEqual(jsonrepair('foo'), '"foo"')
      strictEqual(jsonrepair('[1,foo,4]'), '[1,"foo",4]')
      strictEqual(jsonrepair('{foo: bar}'), '{"foo": "bar"}')

      strictEqual(jsonrepair('foo 2 bar'), '"foo 2 bar"')
      strictEqual(jsonrepair('{greeting: hello world}'), '{"greeting": "hello world"}')
      strictEqual(
        jsonrepair('{greeting: hello world\nnext: "line"}'),
        '{"greeting": "hello world",\n"next": "line"}'
      )
      strictEqual(jsonrepair('{greeting: hello world!}'), '{"greeting": "hello world!"}')
    })

    it('should concatenate strings', () => {
      strictEqual(jsonrepair('"hello" + " world"'), '"hello world"')
      strictEqual(jsonrepair('"hello" +\n " world"'), '"hello world"')
      strictEqual(jsonrepair('"a"+"b"+"c"'), '"abc"')
      strictEqual(jsonrepair('"hello" + /*comment*/ " world"'), '"hello world"')
      strictEqual(
        jsonrepair("{\n  \"greeting\": 'hello' +\n 'world'\n}"),
        '{\n  "greeting": "helloworld"\n}'
      )
    })

    it('should repair missing comma between array items', () => {
      strictEqual(jsonrepair('{"array": [{}{}]}'), '{"array": [{},{}]}')
      strictEqual(jsonrepair('{"array": [{} {}]}'), '{"array": [{}, {}]}')
      strictEqual(jsonrepair('{"array": [{}\n{}]}'), '{"array": [{},\n{}]}')
      strictEqual(jsonrepair('{"array": [\n{}\n{}\n]}'), '{"array": [\n{},\n{}\n]}')
      strictEqual(jsonrepair('{"array": [\n1\n2\n]}'), '{"array": [\n1,\n2\n]}')
      strictEqual(jsonrepair('{"array": [\n"a"\n"b"\n]}'), '{"array": [\n"a",\n"b"\n]}')

      // should leave normal array as is
      strictEqual(jsonrepair('[\n{},\n{}\n]'), '[\n{},\n{}\n]')
    })

    it('should repair missing comma between object properties', () => {
      // strictEqual(jsonrepair('{"a":2\n"b":3\n}'), '{"a":2,\n"b":3\n}')
      strictEqual(jsonrepair('{"a":2\n"b":3\nc:4}'), '{"a":2,\n"b":3,\n"c":4}')
    })

    it('should repair numbers at the end', () => {
      strictEqual(jsonrepair('{"a":2.'), '{"a":2.0}')
      strictEqual(jsonrepair('{"a":2e'), '{"a":2e0}')
      strictEqual(jsonrepair('{"a":2e-'), '{"a":2e-0}')
      strictEqual(jsonrepair('{"a":-'), '{"a":-0}')
    })

    it('should repair missing colon between object key and value', () => {
      strictEqual(jsonrepair('{"a" "b"}'), '{"a": "b"}')
      strictEqual(jsonrepair('{"a" 2}'), '{"a": 2}')
      strictEqual(jsonrepair('{\n"a" "b"\n}'), '{\n"a": "b"\n}')
      strictEqual(jsonrepair('{"a" \'b\'}'), '{"a": "b"}')
      strictEqual(jsonrepair("{'a' 'b'}"), '{"a": "b"}')
      strictEqual(jsonrepair('{“a” “b”}'), '{"a": "b"}')
      strictEqual(jsonrepair("{a 'b'}"), '{"a": "b"}')
      strictEqual(jsonrepair('{a “b”}'), '{"a": "b"}')
    })

    it('should repair missing a combination of comma, quotes and brackets', () => {
      strictEqual(jsonrepair('{"array": [\na\nb\n]}'), '{"array": [\n"a",\n"b"\n]}')
      strictEqual(jsonrepair('1\n2'), '[\n1,\n2\n]')
      strictEqual(jsonrepair('[a,b\nc]'), '["a","b",\n"c"]')
    })

    it('should repair newline separated json (for example from MongoDB)', () => {
      const text =
        '' + '/* 1 */\n' + '{}\n' + '\n' + '/* 2 */\n' + '{}\n' + '\n' + '/* 3 */\n' + '{}\n'
      const expected = '[\n\n{},\n\n\n{},\n\n\n{}\n\n]'

      strictEqual(jsonrepair(text), expected)
    })

    it('should repair newline separated json having commas', () => {
      const text =
        '' + '/* 1 */\n' + '{},\n' + '\n' + '/* 2 */\n' + '{},\n' + '\n' + '/* 3 */\n' + '{}\n'
      const expected = '[\n\n{},\n\n\n{},\n\n\n{}\n\n]'

      strictEqual(jsonrepair(text), expected)
    })

    it('should repair newline separated json having commas and trailing comma', () => {
      const text =
        '' + '/* 1 */\n' + '{},\n' + '\n' + '/* 2 */\n' + '{},\n' + '\n' + '/* 3 */\n' + '{},\n'
      const expected = '[\n\n{},\n\n\n{},\n\n\n{}\n\n]'

      strictEqual(jsonrepair(text), expected)
    })

    it('should repair a comma separated list with value', () => {
      strictEqual(jsonrepair('1,2,3'), '[\n1,2,3\n]')
      strictEqual(jsonrepair('1,2,3,'), '[\n1,2,3\n]')
      strictEqual(jsonrepair('1\n2\n3'), '[\n1,\n2,\n3\n]')
      strictEqual(jsonrepair('a\nb'), '[\n"a",\n"b"\n]')
      strictEqual(jsonrepair('a,b'), '[\n"a","b"\n]')
    })
  })

  it('should throw an exception in case of non-repairable issues', function () {
    throws(function () {
      console.log({ output: jsonrepair('') })
    }, new JSONRepairError('Unexpected end of json string', 0))

    throws(function () {
      console.log({ output: jsonrepair('{"a",') })
    }, new JSONRepairError('Colon expected', 4))

    throws(function () {
      console.log({ output: jsonrepair('{:2}') })
    }, new JSONRepairError('Object key expected', 1))

    throws(function () {
      console.log({ output: jsonrepair('{"a":2,]') })
    }, new JSONRepairError('Unexpected character "]"', 7))

    throws(function () {
      console.log({ output: jsonrepair('{"a" ]') })
    }, new JSONRepairError('Colon expected', 5))

    throws(function () {
      console.log({ output: jsonrepair('{}}') })
    }, new JSONRepairError('Unexpected character "}"', 2))

    throws(function () {
      console.log({ output: jsonrepair('[2,}') })
    }, new JSONRepairError('Unexpected character "}"', 3))

    throws(function () {
      console.log({ output: jsonrepair('2.3.4') })
    }, new JSONRepairError('Unexpected character "."', 3))

    throws(function () {
      console.log({ output: jsonrepair('234..5') })
    }, new JSONRepairError("Invalid number '234.', expecting a digit but got '.'", 4))

    throws(function () {
      console.log({ output: jsonrepair('2e3.4') })
    }, new JSONRepairError('Unexpected character "."', 3))

    throws(function () {
      console.log({ output: jsonrepair('[2e,') })
    }, new JSONRepairError("Invalid number '2e', expecting a digit but got ','", 3))

    throws(function () {
      console.log({ output: jsonrepair('[-,') })
    }, new JSONRepairError("Invalid number '-', expecting a digit but got ','", 2))

    throws(function () {
      console.log({ output: jsonrepair('foo [') })
    }, new JSONRepairError('Unexpected character "["', 4))

    throws(function () {
      console.log({ output: jsonrepair('"\\u26"') })
    }, new JSONRepairError('Invalid unicode character "\\u26"', 1))

    throws(function () {
      console.log({ output: jsonrepair('"\\uZ000"') })
    }, new JSONRepairError('Invalid unicode character "\\uZ000"', 1))
  })
})

function assertRepair(text: string) {
  strictEqual(jsonrepair(text), text)
}
