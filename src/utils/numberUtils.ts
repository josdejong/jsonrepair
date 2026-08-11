import { isDigit } from './stringUtils.js'

export interface NumberToken {
  end: number
  invalid: boolean
  value: string
}

export interface NumberInput {
  charAt: (index: number) => string
}

export function scanNumber(
  input: NumberInput,
  start: number,
  isEndOfNumber: (index: number) => boolean
): NumberToken | null {
  let index = start
  let value = ''
  let invalid = false

  if (input.charAt(index) === '-') {
    value += input.charAt(index)
    index++

    if (!isDigit(input.charAt(index)) && isEndOfNumber(index)) {
      value += '0'
    }
  }

  if (input.charAt(index) === '0' && isDigit(input.charAt(index + 1))) {
    invalid = true
  }

  while (isDigit(input.charAt(index))) {
    value += input.charAt(index)
    index++
  }

  if (input.charAt(index) === '.') {
    if (value === '' || value === '-') {
      value += '0'
    }

    value += input.charAt(index)
    index++

    if (!isDigit(input.charAt(index))) {
      value += '0'
    }

    while (isDigit(input.charAt(index))) {
      value += input.charAt(index)
      index++
    }
  }

  if (index <= start) {
    return null
  }

  if (input.charAt(index) === 'e' || input.charAt(index) === 'E') {
    if (value === '-') {
      invalid = true
    }

    value += input.charAt(index)
    index++

    if (input.charAt(index) === '-' || input.charAt(index) === '+') {
      value += input.charAt(index)
      index++
    }

    if (!isDigit(input.charAt(index))) {
      value += '0'
    }

    while (isDigit(input.charAt(index))) {
      value += input.charAt(index)
      index++
    }
  }

  return isEndOfNumber(index) ? { end: index, invalid, value } : null
}

export function isStandaloneNumber(
  input: NumberInput,
  start: number,
  isEnd: (index: number) => boolean,
  isWhitespace: (index: number) => boolean
): boolean {
  return (
    scanNumber(input, start, (index) => {
      if (isEnd(index)) return true
      const char = input.charAt(index)
      return char === ',' || char === '}' || char === ']' || isWhitespace(index)
    }) !== null
  )
}
