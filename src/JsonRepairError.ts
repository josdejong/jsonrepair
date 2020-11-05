export default class JsonRepairError extends SyntaxError {
  char: number

  /**
   * @param {string} message  Explanatory message
   * @param {number} char     Character index where the error happened
   */
  constructor (message: string, char: number) {
    super(message + ' (char ' + char + ')')

    this.char = char
  }
}
