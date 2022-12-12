import Benchmark from 'benchmark'
import { readFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import jsonrepair from '../../lib/esm/jsonrepair.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const text = readFileSync(__dirname + '/largefile.json', 'utf-8')

const suite = new Benchmark.Suite('jsonrepair benchmark')
suite
  .add('jsonrepair', () => jsonrepair(text))
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .run()
