// Only use native node.js API's and references to ./lib here, this file is not transpiled!
import cp from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  linkSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('command line interface', () => {
  const binFile = join(__dirname, '..', 'bin', 'cli.js')
  const inputFile = join(__dirname, 'data', 'invalid.json')
  const replaceFile = join(__dirname, 'output', 'replace.json')
  const outputFile = join(__dirname, 'output', 'repaired.json')
  const largeFile = join(__dirname, 'output', 'large.json')

  beforeEach(() => {
    if (existsSync(outputFile)) {
      rmSync(outputFile)
    }
    copyFileSync(inputFile, replaceFile)
  })

  afterEach(() => {
    if (existsSync(outputFile)) {
      rmSync(outputFile)
    }
    if (existsSync(replaceFile)) {
      rmSync(replaceFile)
    }
  })

  test('should write to the console', async () => {
    const result = await run(`node "${binFile}" "${inputFile}"`)
    expect(stripNewlines(result)).toBe('{"hello":"world"}')
  })

  test('should write output to a file', async () => {
    const result = await run(`node "${binFile}" "${inputFile}" > "${outputFile}"`)
    expect(result).toBe('')

    const content = String(readFileSync(outputFile))
    expect(stripNewlines(content)).toBe('{"hello":"world"}')
  })

  test.each([
    { flag: '--output', existing: false },
    { flag: '-o', existing: false },
    { flag: '--output', existing: true },
    { flag: '-o', existing: true }
  ])('should write to a distinct output file with $flag (existing: $existing)', async ({
    flag,
    existing
  }) => {
    const originalContent = readFileSync(inputFile, 'utf8')
    if (existing) {
      writeFileSync(outputFile, 'previous output\n')
    }

    const result = await run(`node "${binFile}" "${inputFile}" ${flag} "${outputFile}"`)

    expect(result).toBe('')
    expect(stripNewlines(readFileSync(outputFile, 'utf8'))).toBe('{"hello":"world"}')
    expect(readFileSync(inputFile, 'utf8')).toBe(originalContent)
  })

  test.each(['--output', '-o'])('should preserve the input when %s points to it', async (flag) => {
    const originalContent = readFileSync(replaceFile, 'utf8')

    await expect(
      run(`node "${binFile}" "${replaceFile}" ${flag} "${replaceFile}"`)
    ).rejects.toThrow('input and output refer to the same file')

    expect(readFileSync(replaceFile, 'utf8')).toBe(originalContent)
  })

  test('should preserve the input when the output uses a relative path to it', async () => {
    const originalContent = readFileSync(replaceFile, 'utf8')
    const relativeOutputFile = relative(process.cwd(), replaceFile)

    await expect(
      run(`node "${binFile}" "${replaceFile}" --output "${relativeOutputFile}"`)
    ).rejects.toThrow('input and output refer to the same file')

    expect(readFileSync(replaceFile, 'utf8')).toBe(originalContent)
  })

  test('should preserve the input when the output is a hard link to it', async () => {
    const originalContent = readFileSync(replaceFile, 'utf8')
    linkSync(replaceFile, outputFile)

    await expect(
      run(`node "${binFile}" "${replaceFile}" --output "${outputFile}"`)
    ).rejects.toThrow('input and output refer to the same file')

    expect(readFileSync(replaceFile, 'utf8')).toBe(originalContent)
    expect(readFileSync(outputFile, 'utf8')).toBe(originalContent)
  })

  test('should replace a file', async () => {
    const result = await run(`node ${binFile} "${replaceFile}" --overwrite`)
    expect(result).toBe('')

    const content = String(readFileSync(replaceFile))
    expect(stripNewlines(content)).toBe('{"hello":"world"}')
  })

  test('should configure buffer size', async () => {
    // create a document that is larger than the 64K chunk size of the library
    const largeDoc = new Array(10_000).fill('test test test ')
    const str = `{"a": ["${largeDoc.join('')}`
    expect(str.length).toBeGreaterThan(65536)
    writeFileSync(largeFile, str)

    await expect(() => {
      return run(`node ${binFile} "${largeFile}" --buffer 2`)
    }).rejects.toThrow(
      'Error: Index out of range, please configure a larger buffer size (index: 65536)'
    )

    unlinkSync(largeFile)
  })

  test('should throw an error in case of an invalid buffer size', async () => {
    await expect(() => {
      return run(`node ${binFile} "${inputFile}" --buffer FOO`)
    }).rejects.toThrow('Error: Buffer size "FOO" not recognized')
  })
})

function run(command) {
  return new Promise((resolve, reject) => {
    cp.exec(command, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

function stripNewlines(text) {
  return text.replace(/[\n\r]/g, '')
}
