export enum Caret {
  beforeValue = 'beforeValue',
  afterValue = 'afterValue',
  beforeKey = 'beforeKey'
}

export enum StackType {
  root = 'root',
  object = 'object',
  array = 'array',
  ndJson = 'ndJson',
  functionCall = 'dataType'
}

export function createStack() {
  const stack: StackType[] = [StackType.root]
  let caret = Caret.beforeValue

  return {
    get type() {
      return last(stack)
    },

    get caret() {
      return caret
    },

    closingBracket(depth: number): string | undefined {
      const type = stack[stack.length - 1 - depth]
      return type === StackType.object ? '}' : type === StackType.array ? ']' : undefined
    },

    pop(): true {
      stack.pop()
      caret = Caret.afterValue

      return true
    },

    push(type: StackType, newCaret: Caret): true {
      stack.push(type)
      caret = newCaret

      return true
    },

    update(newCaret: Caret): true {
      caret = newCaret

      return true
    }
  }
}

function last<T>(array: T[]): T | undefined {
  return array[array.length - 1]
}
