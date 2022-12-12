export default class JsonRepairError extends Error {
  char: number

  constructor (message: string, char: number) {
    super(message + ' (char ' + char + ')')

    this.char = char
  }
}
