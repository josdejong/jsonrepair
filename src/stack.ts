export const enum Caret {
  beforeValue = 'beforeValue',
  afterValue = 'afterValue',
  beforeKey = 'beforeKey'
}

export const enum StackType {
  root = 'root',
  object = 'object',
  array = 'array',
  ndJson = 'ndJson',
  dataType = 'dataType'
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
