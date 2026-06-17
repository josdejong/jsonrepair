export function repairNumber(num: string): string {
  return num
    .replace(/^(0\d.*)$|^-[eE].*$/, (match) => `"${match}"`) // repair a number with leading zeros like "00789" and invalid values like "-e5"
    .replace(/^\./, '0.') // repair a missing leading zero like in ".2"
    .replace(/^-\./, '-0.') // repair a missing leading zero like in "-.2"
    .replace(/\.$/, '.0') // repair a missing zero at the end like "2."
    .replace(/([eE]|[eE][+-]|-)$/, (match) => `${match}0`) // repair a missing zero at the end like "2e" or "2e-" or "-"
}
