// This script adds missing file extensions on imports in the /lib/esm
// build folder

const fs = require('fs')
const path = require('path')

const EXTENSION = '.js'
const DEBUG = true

// match a string like " from './myFile';"
const importRegex = /( from ['"])(\..+)(['"]\s*;?\s*\n)/g

const folder = path.join(__dirname, '../../lib/esm')

fs.readdirSync(folder)
  .filter(file => file.endsWith(EXTENSION))
  .forEach(file => {
    if (DEBUG) {
      console.log(`Adding import extensions in file ${file}`)
    }

    const code = String(fs.readFileSync(path.join(folder, file)))

    const fixedCode = code.replace(importRegex, (text, left, middle, right) => {
      if (!middle.endsWith(EXTENSION)) {
        if (DEBUG) {
          console.log(`  Change "${middle}" to "${middle + EXTENSION}"`)
        }

        return left + middle + EXTENSION + right
      } else {
        return text
      }
    })

    fs.writeFileSync(path.join(folder, file), fixedCode)
  })
