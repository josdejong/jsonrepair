export class JSONRepairError extends Error {
  position: number

  constructor(message: string, position: number) {
    super(`${message} at position ${position}`)

    this.position = position
  }
}
