import assert from 'node:assert'
import { pathToFileURL } from 'node:url'
import { Bench } from 'tinybench'
import { table } from './utils/table.mjs'

// Optionally pass the directory of another build to benchmark it instead,
// for example to compare against a previous version:
//
//     node tools/benchmark/stream.mjs path/to/other/lib/esm
//
const libDir = process.argv[2] ?? new URL('../../lib/esm', import.meta.url).pathname
const { jsonrepairCore } = await import(pathToFileURL(`${libDir}/streaming/core.js`).href)

const inputChunkSize = 16 * 1024

const documents = [
  { name: 'formatted', text: JSON.stringify(generateData(2000), null, 2) },
  { name: 'minified', text: JSON.stringify(generateData(2000)) },
  { name: 'repair', text: generateBrokenText(2000) }
]

for (const { name, text } of documents) {
  console.log(`Document "${name}": ${Math.round(text.length / 1024)} kB`)
}

const expectedRepaired = documents.map(({ text }) => repairStream(text))
assert.strictEqual(expectedRepaired[0], documents[0].text)
assert.strictEqual(expectedRepaired[1], documents[1].text)
JSON.parse(expectedRepaired[2])

const bench = new Bench({ time: 2000 })
for (const { name, text } of documents) {
  bench.add(name, () => repairStream(text))
}

await bench.run()

table(
  bench.tasks.map((task, index) => {
    const { mean, rme } = task.result.latency
    const megabytes = documents[index].text.length / 1024 / 1024

    return {
      name: task.name,
      mean: `${mean.toFixed(2)} ms`,
      throughput: `${(megabytes / (mean / 1000)).toFixed(1)} MB/s`,
      rme: `±${rme.toFixed(2)}%`
    }
  })
)

/**
 * Repair the text via the streaming core, feeding it in chunks like a
 * Node.js stream would do, using the default buffer and chunk sizes.
 */
function repairStream(text) {
  const chunks = []
  const { transform, flush } = jsonrepairCore({ onData: (chunk) => chunks.push(chunk) })

  for (let start = 0; start < text.length; start += inputChunkSize) {
    transform(text.substring(start, start + inputChunkSize))
  }
  flush()

  return chunks.join('')
}

/**
 * create a JSON document containing all different things that JSON can have:
 * - nested objects and arrays
 * - strings (with control chars and unicode)
 * - numbers (various notations)
 * - boolean
 * - null
 */
function generateData(itemCount) {
  return [...new Array(itemCount)].map((_value, index) => {
    return {
      id: index,
      name: `Item ${index}`,
      details: {
        description: 'Here we try out control characters and unicode',
        newline: 'Some text with a newline \n',
        tab: 'Some text with a tab \t',
        unicode: 'Test with unicode characters 😀,💩',
        'escaped double quote': '"abc"',
        'unicode double quote': '"abc"'
      },
      isTrue: true,
      isFalse: false,
      isNull: null,
      values: [1, 2.44481, 23.33e4, -5.71, 500023105]
    }
  })
}

/**
 * Create a document with typical issues as produced by LLMs and JavaScript:
 * unquoted keys, single quoted strings, Python keywords, trailing commas,
 * comments, and a truncated end.
 */
function generateBrokenText(itemCount) {
  const items = [...new Array(itemCount)].map((_value, index) => {
    return `  {
    id: ${index},
    name: 'Item ${index}',
    // a line comment
    details: {description: "Some text with a newline \n", tags: ['a', 'b', 'c',],},
    isTrue: True, isFalse: False, isNull: None,
    values: [1, 2.44481, 23.33e4, -5.71, 500023105,]
  },`
  })

  return `\`\`\`json\n[\n${items.join('\n')}\n  {id: ${itemCount}, name: 'truncat`
}
