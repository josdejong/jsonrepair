import assert from "assert"
import Benchmark from "benchmark"
import jsonrepair from "../../lib/esm/jsonrepair.js"

const text = generateText()
console.log(`Document size: ${Math.round(text.length / 1024)} kB`)

assert.strictEqual(text, jsonrepair(text))

const suite = new Benchmark.Suite('jsonrepair benchmark')
suite
  .add('jsonrepair', () => jsonrepair(text))
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .run()

/**
 * create a JSON document containing all different things that JSON can have:
 * - nested objects and arrays
 * - strings (with control chars and unicode)
 * - numbers (various notations)
 * - boolean
 * - null
 * - indentation and newlines
 */
function generateText(itemCount = 100) {
  const json = [...new Array(itemCount)].map((value, index) => {
    return {
      id: index,
      name: 'Item ' + index,
      details: {
        description: 'Here we try out control characters and unicode',
        newline: 'Some text with a newline \n',
        tab: 'Some text with a tab \t',
        "unicode": "Test with unicode characters 😀,💩",
        "escaped double quote": "\"abc\"",
        "unicode double quote": "\u0022abc\u0022"
      },
      isTrue: true,
      isFalse: false,
      isNull: null,
      values: [1, 2.44481, 23.33e4, -5.71, 500023105]
    }
  })

  return JSON.stringify(json, null, 2)
}
