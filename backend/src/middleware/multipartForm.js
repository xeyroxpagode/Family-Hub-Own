const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_MULTIPART_BODY_BYTES = MAX_AVATAR_FILE_SIZE_BYTES + 512 * 1024

const buildFilePayload = async (entry) => {
  const buffer = Buffer.from(await entry.arrayBuffer())

  return {
    fieldname: 'avatar',
    originalname: entry.name,
    mimetype: entry.type,
    size: entry.size,
    buffer,
  }
}

const parseMultipartForm = async (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return res.status(415).json({
      error: 'Content-Type invalido. Usa multipart/form-data.',
    })
  }

  try {
    const chunks = []
    let totalBytes = 0

    for await (const chunk of req) {
      totalBytes += chunk.length

      if (totalBytes > MAX_MULTIPART_BODY_BYTES) {
        return res.status(413).json({
          error: 'El archivo supera el limite permitido de 5MB.',
        })
      }

      chunks.push(chunk)
    }

    const bodyBuffer = Buffer.concat(chunks)
    const request = new Request(`http://localhost${req.originalUrl}`, {
      method: req.method,
      headers: req.headers,
      body: bodyBuffer,
    })

    const formData = await request.formData()
    const body = {}
    let avatarFile = null

    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        body[key] = value
        continue
      }

      if (key === 'avatar') {
        avatarFile = await buildFilePayload(value)
      }
    }

    if (avatarFile) {
      if (avatarFile.size > MAX_AVATAR_FILE_SIZE_BYTES) {
        return res.status(413).json({
          error: 'El archivo supera el limite permitido de 5MB.',
        })
      }

      if (!avatarFile.mimetype || !avatarFile.mimetype.startsWith('image/')) {
        return res.status(415).json({
          error: 'El avatar debe ser una imagen valida.',
        })
      }
    }

    req.body = body
    req.file = avatarFile

    return next()
  } catch (error) {
    return res.status(400).json({
      error: 'No se pudo procesar el formulario multipart.',
      detalle: error.message,
    })
  }
}

module.exports = {
  parseMultipartForm,
  MAX_AVATAR_FILE_SIZE_BYTES,
}
