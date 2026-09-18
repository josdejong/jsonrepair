import { isStartOfValue } from './stringUtils.js'

/**
 * Find redundant closers before a comma and a continuation of the current
 * container. Prefer closing a child when an ancestor can own the continuation;
 * otherwise keep the current container open. This does not rewind output.
 *
 * Lookahead is limited to available input so streaming never reads past its
 * buffer merely to attempt this optional repair.
 */
export function redundantClosersEnd(
  text: { charAt: (index: number) => string },
  start: number,
  end: number,
  closingBracket: (depth: number) => string | undefined
): number {
  if (start >= end || (text.charAt(start) !== '}' && text.charAt(start) !== ']')) return start
  const charAt = (index: number) => (index < end ? text.charAt(index) : '')
  const skipWhitespace = (from: number) => {
    let index = from
    while (/\s/.test(charAt(index))) index++
    return index
  }

  let i = start
  let depth = 0
  let matched = true
  while (charAt(i) === '}' || charAt(i) === ']') {
    let ancestor = depth
    while (closingBracket(ancestor) && charAt(i) !== closingBracket(ancestor)) ancestor++
    if (closingBracket(ancestor)) {
      matched = matched && ancestor === depth
      depth = ancestor + 1
    } else {
      matched = false
    }
    // Give a matching ancestor first refusal. Doing this while scanning also
    // avoids repeatedly looking through long runs of valid nested closers.
    // Missing intermediate closers must remain repairable too: in
    // {"a":[{"b":1],"c":2}, the ] belongs to the array and c to the root.
    if (closingBracket(ancestor) && closingBracket(depth) === closingBracket(0)) return start
    i = skipWhitespace(i + 1)
  }
  if (charAt(i) !== ',') return start

  const comma = i
  i = skipWhitespace(i + 1)
  if (!isStartOfValue(charAt(i))) return start

  // Distinguish an object key from an array value without interpreting content.
  const quote = charAt(i)
  if (quote === '"' || quote === "'") {
    i++
    while (charAt(i) && charAt(i) !== quote) {
      i += charAt(i) === '\\' ? 2 : 1
    }
    if (!charAt(i)) return start
    i = skipWhitespace(i + 1)
  } else {
    while (/[\w$]/.test(charAt(i))) i++
    i = skipWhitespace(i)
  }
  if (i >= end) return start
  const continuation = charAt(i) === ':' ? '}' : ']'
  if (closingBracket(0) !== continuation) return start

  // Matched closers followed by another value can be NDJSON. Leave the
  // existing root handling in charge instead of absorbing a separate value.
  if (matched && closingBracket(depth) === undefined && continuation === ']') {
    return start
  }

  return comma
}
