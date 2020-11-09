/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     repair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export default function simpleJsonRepair(text: any): string
