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
  return new Stack()
}

// Implemented as a class (rather than closures) so all stacks share the same
// methods, which allows the JavaScript engine to inline them in the parser.
class Stack {
  private readonly stack: StackType[] = [StackType.root]
  private _caret = Caret.beforeValue

  get type(): StackType | undefined {
    return this.stack[this.stack.length - 1]
  }

  get caret(): Caret {
    return this._caret
  }

  pop(): true {
    this.stack.pop()
    this._caret = Caret.afterValue

    return true
  }

  push(type: StackType, newCaret: Caret): true {
    this.stack.push(type)
    this._caret = newCaret

    return true
  }

  update(newCaret: Caret): true {
    this._caret = newCaret

    return true
  }
}
