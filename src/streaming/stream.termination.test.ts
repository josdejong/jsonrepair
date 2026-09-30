import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { jsonrepair } from '../index'
import { JSONRepairError } from '../utils/JSONRepairError'
import type { JsonRepairTransformOptions } from './stream'

type Outcome = { output: string } | { error: string }
type ChildResult = { output?: string; error?: string; isJSONRepairError?: boolean }

// Inputs on which jsonrepairTransform used to loop forever (#201), plus controls.
// Streaming always runs in a child process that is killed after 3000 ms, so a
// regression fails these tests instead of hanging the test runner.
const cases: {
  text: string
  options?: JsonRepairTransformOptions
  regular: Outcome
  streaming?: Outcome[]
}[] = [
  { text: '{"a":1 [1]}', regular: { error: 'Unexpected character "[" at position 7' } },
  { text: '{"a":1[1]}', regular: { error: 'Unexpected character "[" at position 6' } },
  { text: '{"a":1,[1]}', regular: { error: 'Unexpected character "[" at position 7' } },
  { text: '{[1]}', regular: { error: 'Unexpected character "[" at position 1' } },
  {
    text: `{"a":1 [1]}${' '.repeat(16)}`,
    options: { bufferSize: 4, chunkSize: 2 },
    regular: { error: 'Unexpected character "[" at position 7' }
  },
  { text: '[{"a":1 [1]}]', regular: { output: '[{"a":1}, [1]]' } },
  {
    text: '{"a":true\n[1]}',
    regular: { output: '[\n{"a":true},\n[1]\n]' },
    // streaming newline delimited JSON cannot (yet) skip the redundant "}" after
    // "[1]", so besides the regular output an error at that "}" is accepted
    streaming: [
      { output: '[\n{"a":true},\n[1]\n]' },
      { error: 'Unexpected end of json string at position 13' }
    ]
  },
  { text: '[1 [1]]', regular: { output: '[1, [1]]' } },
  { text: '{"a":1}\n[1]', regular: { output: '[\n{"a":1},\n[1]\n]' } },
  { text: '{"a":1{}}', regular: { error: 'Unexpected character "{" at position 6' } },
  { text: '{"a":1,"b":[1]}', regular: { output: '{"a":1,"b":[1]}' } }
]

const childScript = `import { jsonrepairTransform } from './stream.js'
import { JSONRepairError } from './utils/JSONRepairError.js'

const { text, options, split } = JSON.parse(process.argv[2])
const transform = jsonrepairTransform(options)
let output = ''
let done = false

// report only the first error or end
function report(result) {
  if (!done) {
    done = true
    process.stdout.write(JSON.stringify(result))
  }
}

transform.on('data', (chunk) => {
  output += chunk
})
transform.on('error', (err) => {
  report({ error: err.message, isJSONRepairError: err instanceof JSONRepairError })
})
transform.on('end', () => report({ output }))

if (split) {
  for (const char of text) {
    transform.write(char)
  }
  transform.end()
} else {
  transform.end(text)
}
`

describe('stream termination', () => {
  let dir: string

  beforeAll(() => {
    // the child process cannot import TypeScript sources, so transpile them
    dir = mkdtempSync(join(tmpdir(), 'jsonrepair-'))
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

    for (const file of readdirSync(srcDir, { encoding: 'utf8', recursive: true })) {
      if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
        const { outputText } = ts.transpileModule(readFileSync(join(srcDir, file), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 }
        })
        const target = join(dir, file.replace(/\.ts$/, '.js'))
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, outputText)
      }
    }

    writeFileSync(join(dir, 'package.json'), '{ "type": "module" }')
    writeFileSync(join(dir, 'child.js'), childScript)
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function runTransform(
    text: string,
    options: JsonRepairTransformOptions | undefined,
    split: boolean
  ): ChildResult {
    const args = [join(dir, 'child.js'), JSON.stringify({ text, options, split })]
    const result = spawnSync(process.execPath, ['--max-old-space-size=256', ...args], {
      encoding: 'utf8',
      timeout: 3000, // SIGKILL a hanging child without relying on the test runner's timers
      killSignal: 'SIGKILL',
      maxBuffer: 64 * 1024
    })

    expect(result.error, 'the child process should finish within 3000 ms').toBeUndefined()
    expect(result.status, result.stderr).toBe(0)

    return JSON.parse(result.stdout)
  }

  test.each(cases)('should terminate for $text', ({
    text,
    options,
    regular,
    streaming = [regular]
  }) => {
    expect(regularOutcome(text)).toEqual(regular)

    for (const split of [false, true]) {
      const { output, error, isJSONRepairError } = runTransform(text, options, split)

      if (error !== undefined) {
        expect(isJSONRepairError).toBe(true)
        expect(streaming).toContainEqual({ error })
      } else {
        expect(streaming).toContainEqual({ output })
      }
    }
  }, 10000)
})

function regularOutcome(text: string): Outcome {
  try {
    return { output: jsonrepair(text) }
  } catch (err) {
    expect(err).toBeInstanceOf(JSONRepairError)
    return { error: (err as Error).message }
  }
}
