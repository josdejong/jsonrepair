/**
 * Repair a string containing an invalid JSON document.
 * For example changes JavaScript notation into JSON notation.
 *
 * Example:
 *
 *     jsonrepair('{name: \'John\'}") // '{"name": "John"}'
 *
 */
export default function jsonrepair(text: any): string
