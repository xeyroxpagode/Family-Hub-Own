const { createHttpError } = require('./httpErrors')

const parseExpectedVersion = (req) => {
  const ifMatch = req.headers?.['if-match']
  if (typeof ifMatch === 'string') {
    const cleaned = ifMatch.replace(/^"|"$/g, '')
    const parsed = Number.parseInt(cleaned, 10)
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed
    }
    throw createHttpError(400, 'If-Match debe ser un entero >= 1.', 'invalid_expected_version')
  }

  if (req.body && typeof req.body.expected_version === 'number') {
    const parsed = req.body.expected_version
    if (Number.isFinite(parsed) && parsed >= 1) {
      return parsed
    }
    throw createHttpError(400, 'expected_version debe ser un entero >= 1.', 'invalid_expected_version')
  }

  return null
}

const assertExpectedVersion = (currentVersion, expectedVersion) => {
  if (expectedVersion === null || expectedVersion === undefined) {
    return
  }
  if (currentVersion !== expectedVersion) {
    throw createHttpError(
      409,
      'Este elemento cambió en otro dispositivo. Actualizá y volvé a intentar.',
      'version_conflict',
    )
  }
}

module.exports = {
  assertExpectedVersion,
  parseExpectedVersion,
}