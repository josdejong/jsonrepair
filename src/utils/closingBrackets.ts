import { isStartOfValue } from './stringUtils.js'

/**
 * Find redundant closers before a comma and a continuation of the current
 * container. Prefer closing a child when an ancestor can own the continuation;
 * otherwise keep the current container open. This does not rewind output.
 *
 * Return null when more input is needed to decide, rather than letting the
 * streaming parser consume a closer before its continuation arrives.
 */
export function redundantClosersEnd(
  text: { charAt: (index: number) => string },
  start: number,
  end: number,
  closingBracket: (depth: number) => string | undefined,
  complete = true
): number | null {
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
  const absent = new Set<string>()
  while (charAt(i) === '}' || charAt(i) === ']') {
    let ancestor = depth
    const closer = charAt(i)
    if (!absent.has(closer)) {
      while (closingBracket(ancestor) && closer !== closingBracket(ancestor)) ancestor++
      if (!closingBracket(ancestor)) absent.add(closer)
    }
    if (!absent.has(closer)) {
      matched = matched && ancestor === depth
      depth = ancestor + 1
    } else {
      matched = false
    }
    // Give a matching ancestor first refusal. Doing this while scanning also
    // avoids repeatedly looking through long runs of valid nested closers.
    // Missing intermediate closers must remain repairable too: in
    // {"a":[{"b":1],"c":2}, the ] belongs to the array and c to the root.
    if (!absent.has(closer) && closingBracket(depth) === closingBracket(0)) return start
    i = skipWhitespace(i + 1)
  }
  if (i >= end && !complete) return null
  // A matched closer is not surplus just because another value could fit here.
  // Let the existing missing-colon/parent-closer repairs handle the continuation.
  if (matched) return start
  if (charAt(i) !== ',') return start

  const comma = i
  i = skipWhitespace(i + 1)
  if (i >= end && !complete) return null
  if (!isStartOfValue(charAt(i))) return start

  // Distinguish an object key from an array value without interpreting content.
  const quote = charAt(i)
  if (quote === '"' || quote === "'") {
    i++
    while (charAt(i) && charAt(i) !== quote) {
      i += charAt(i) === '\\' ? 2 : 1
    }
    if (!charAt(i)) return complete ? start : null
    i = skipWhitespace(i + 1)
  } else {
    while (/[\w$]/.test(charAt(i))) i++
    i = skipWhitespace(i)
  }
  if (i >= end) return complete ? start : null
  const continuation = charAt(i) === ':' ? '}' : ']'
  if (closingBracket(0) !== continuation) return start

  return comma
}
