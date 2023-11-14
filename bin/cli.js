#!/usr/bin/env node
import { createReadStream, createWriteStream, readFileSync, renameSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { jsonrepairTransform } from '../lib/esm/stream.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function processArgs(args) {
  const options = {
    version: false,
    help: false,
    overwrite: false,
    inputFile: null,
    outputFile: null
  }

  // we skip the first two args, since they contain node and the script path
  let i = 2
  while (i < args.length) {
    const arg = args[i]

    switch (arg) {
      case '-v':
      case '--version':
        options.version = true
        break

      case '-h':
      case '--help':
        options.help = true
        break

      case '--overwrite':
        options.overwrite = true
        break

      case '-o':
      case '--output':
        i++
        options.outputFile = args[i]
        break

      default:
        if (options.inputFile == null) {
          options.inputFile = arg
        } else {
          throw new Error('Unexpected argument "' + arg + '"')
        }
    }

    i++
  }

  return options
}

function run(options) {
  if (options.version) {
    outputVersion()
    return
  }

  if (options.help) {
    outputHelp()
    return
  }

  if (options.overwrite) {
    if (!options.inputFile) {
      console.error('Error: cannot use --overwrite: no input file provided')
      process.exit(1)
    }
    if (options.outputFile) {
      console.error('Error: cannot use --overwrite: there is also an --output provided')
      process.exit(1)
    }

    const tempFileSuffix = '.repair-' + new Date().toISOString().replace(/\W/g, '-') + '.json'
    const tempFile = options.inputFile + tempFileSuffix

    streamIt({
      readStream: createReadStream(options.inputFile),
      writeStream: createWriteStream(tempFile),
      onFinish: () => renameSync(tempFile, options.inputFile)
    })

    return
  }

  streamIt({
    readStream: options.inputFile ? createReadStream(options.inputFile) : process.stdin,
    writeStream: options.outputFile ? createWriteStream(options.outputFile) : process.stdout
  })
}

function noop() {}

// Warning: onFinish does not fire when using process.stdout,
// see https://github.com/nodejs/node/issues/7606
function streamIt({ readStream, writeStream, onFinish = noop }) {
  readStream
    .pipe(jsonrepairTransform())
    .pipe(writeStream)
    .on('error', (err) => process.stderr.write(err.toString()))
    .on('finish', onFinish)
}

function outputVersion() {
  const file = join(__dirname, '../package.json')
  const pkg = JSON.parse(String(readFileSync(file, 'utf-8')))

  console.log(pkg.version)
}

const help = `
jsonrepair
https://github.com/josdejong/jsonrepair

Repair invalid JSON documents. When a document could not be repaired, the output will be left unchanged.

Usage:
    jsonrepair [filename] {OPTIONS}

Options:
    --version, -v       Show application version
    --help,    -h       Show this message
    --output,  -o       Output file
    --overwrite         Overwrite the input file

Example usage:
    jsonrepair broken.json                        # Repair a file, output to console
    jsonrepair broken.json > repaired.json        # Repair a file, output to file
    jsonrepair broken.json --output repaired.json # Repair a file, output to file
    jsonrepair broken.json --overwrite            # Repair a file, replace the file itself
    cat broken.json | jsonrepair                  # Repair data from an input stream
    cat broken.json | jsonrepair > repaired.json  # Repair data from an input stream, output to file
`

function outputHelp() {
  console.log(help)
}

const options = processArgs(process.argv)
run(options)
