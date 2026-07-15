/** Compatibility adapter; version parsing and conflict semantics live in HomePlus Core. */
const {
  parseExpectedVersion,
  assertExpectedVersionMatches,
} = require('./mutationContracts')

const assertExpectedVersion = (currentVersion, expectedVersion) => {
  if (expectedVersion === null || expectedVersion === undefined) return
  assertExpectedVersionMatches(currentVersion, expectedVersion)
}

module.exports = {
  assertExpectedVersion,
  parseExpectedVersion,
}
