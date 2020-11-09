export default function JsonRepairError (message, char) {
  if (!(this instanceof JsonRepairError)) {
    throw new SyntaxError('Constructor must be called with the new operator')
  }

  this.message = message + ' (char ' + char + ')'
  this.char = char
  this.stack = (new Error()).stack
}

JsonRepairError.prototype = new Error()
JsonRepairError.prototype.constructor = Error
