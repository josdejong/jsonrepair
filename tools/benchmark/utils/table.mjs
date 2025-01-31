export function table(items, gap = 2) {
  const widths = getWidths(items)
  const keys = Array.from(widths.keys())

  console.log(keys.map((key) => padRight(key, widths.get(key) + gap)).join(''))

  for (const item of items) {
    console.log(keys.map((key) => padRight(item[key], widths.get(key) + gap)).join(''))
  }
}

/**
 * @param {Record<string, unknown>[]} items
 * @returns {Map<any, any>}
 */
function getWidths(items) {
  const widths = new Map()

  for (const item of items) {
    for (const key of Object.keys(item)) {
      const length = item[key].length
      const maxLength = widths.get(key)?.length ?? 0
      const keyLength = key.length

      widths.set(key, Math.max(length, maxLength, keyLength))
    }
  }

  return widths
}

function padRight(text, len, char = ' ') {
  const add = Math.max(len - text.length, 0)

  return text + char.repeat(add)
}
