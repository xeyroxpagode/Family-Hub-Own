const os = require('os')
const path = require('path')

const loadSharp = () => {
  try {
    return require('sharp')
  } catch (localError) {
    const bundledSharpPath = path.join(
      os.homedir(),
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      'sharp',
    )

    try {
      return require(bundledSharpPath)
    } catch (bundledError) {
      const error = new Error(
        'sharp no esta disponible. Instala la dependencia en backend antes de subir avatars.',
      )
      error.cause = bundledError ?? localError
      error.statusCode = 500
      throw error
    }
  }
}

module.exports = {
  loadSharp,
}
