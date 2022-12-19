#!/usr/bin/env node
import { createReadStream, createWriteStream, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { jsonrepair } from '../lib/esm/jsonrepair.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function outputVersion() {
  const file = join(__dirname, '../package.json')
  const pkg = JSON.parse(String(readFileSync(file, 'utf-8')))

  console.log(pkg.version)
}

function outputHelp() {
  console.log('jsonrepair')
  console.log('https://github.com/josdejong/jsonrepair')
  console.log()
  console.log(
    'Repair invalid JSON documents. When a document could not be repaired, the output will be left unchanged.'
  )
  console.log()
  console.log('Usage:')
  console.log('    jsonrepair [filename] {OPTIONS}')
  console.log()
  console.log('Options:')
  console.log('    --version, -v       Show application version')
  console.log('    --help,    -h       Show this message')
  console.log()
  console.log('Example usage:')
  console.log(
    '    jsonrepair broken.json                        # Repair a file, output to console'
  )
  console.log('    jsonrepair broken.json > repaired.json        # Repair a file, output to file')
  console.log(
    '    jsonrepair broken.json --overwrite            # Repair a file, replace the file itself'
  )
  console.log(
    '    cat broken.json | jsonrepair                  # Repair data from an input stream'
  )
  console.log(
    '    cat broken.json | jsonrepair > repaired.json  # Repair data from an input stream, output to file'
  )
  console.log()
}

function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    let text = ''

    readableStream.on('data', (chunk) => {
      text += String(chunk)
    })
    readableStream.on('end', () => {
      readableStream.destroy()
      resolve(text)
    })
    readableStream.on('error', (err) => reject(err))
  })
}

function processArgs(args) {
  const options = {
    version: false,
    help: false,
    overwrite: false,
    inputFile: null
  }

  // we skip the first two args, since they contain node and the script path
  args.slice(2).forEach(function (arg) {
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

      default:
        if (options.inputFile == null) {
          options.inputFile = arg
        } else {
          throw new Error('Unexpected argument "' + arg + '"')
        }
    }
  })

  return options
}

const options = processArgs(process.argv)

if (options.version) {
  outputVersion()
} else if (options.help) {
  outputHelp()
} else if (options.inputFile != null) {
  if (options.overwrite) {
    streamToString(createReadStream(options.inputFile))
      .then((text) => {
        const outputStream = createWriteStream(options.inputFile)
        outputStream.write(jsonrepair(text))
      })
      .catch((err) => process.stderr.write(err.toString()))
  } else {
    streamToString(createReadStream(options.inputFile))
      .then((text) => process.stdout.write(jsonrepair(text)))
      .catch((err) => process.stderr.write(err.toString()))
  }
} else {
  streamToString(process.stdin)
    .then((text) => process.stdout.write(jsonrepair(text)))
    .catch((err) => process.stderr.write(err.toString()))
}
