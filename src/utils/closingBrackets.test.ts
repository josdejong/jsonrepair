import { expect, test } from 'vitest'
import { redundantClosersEnd } from './closingBrackets'

test('does not repeatedly search unchanged ancestry for unmatched closers', () => {
  const depth = 1000
  const input = `${'}'.repeat(depth)},2]`
  let inspected = 0

  expect(
    redundantClosersEnd(input, 0, input.length, (level) => {
      inspected++
      return level < depth ? ']' : undefined
    })
  ).toBe(depth)
  expect(inspected).toBeLessThan(10 * depth)
})
