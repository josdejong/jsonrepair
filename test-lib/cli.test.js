// Only use native node.js API's and references to ./lib here, this file is not transpiled!
import cp from 'child_process'
import { copyFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('command line interface', function () {
  const binFile = join(__dirname, '..', 'bin', 'cli.js')
  const inputFile = join(__dirname, 'data', 'invalid.json')
  const replaceFile = join(__dirname, 'output', 'replace.json')
  const outputFile = join(__dirname, 'output', 'repaired.json')

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
    const result = await run(`node "${binFile}" "` + inputFile + '"')
    expect(stripNewlines(result)).toBe('{"hello":"world"}')
  })

  test('should write output to a file', async () => {
    const result = await run(`node "${binFile}" "${inputFile}" > "${outputFile}"`)
    expect(result).toBe('')

    const content = String(readFileSync(outputFile))
    expect(stripNewlines(content)).toBe('{"hello":"world"}')
  })

  test('should replace a file', async () => {
    const result = await run(`node ${binFile} "${replaceFile}" --overwrite`)
    expect(result).toBe('')

    const content = String(readFileSync(replaceFile))
    expect(stripNewlines(content)).toBe('{"hello":"world"}')
  })
})

function run(command) {
  return new Promise((resolve, reject) => {
    cp.exec(command, function (error, result) {
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
