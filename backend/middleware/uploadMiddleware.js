const multer = require('multer')
const path = require('path')

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage()

// Configuración de límites y validación de archivos (primer filtro, no confiable por sí solo)
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']

  if (allowedTypes.includes(file.mimetype)) {
    // Aceptar el archivo (validación real de magic bytes ocurre después, ver validateFileSignature)
    cb(null, true)
  } else {
    // Rechazar el archivo
    cb(new Error('Tipo de archivo no soportado. Solo se permiten JPG, PNG y WebP.'), false)
  }
}

// Configuración de Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Máximo 1 archivo por solicitud
  },
  fileFilter: fileFilter
})

// Validación real de tipo de archivo por firma binaria (magic bytes).
// El campo `file.mimetype` lo controla el cliente y no es confiable por sí solo;
// esta verificación lee los primeros bytes del buffer (multer memoryStorage)
// para confirmar que el contenido real es JPEG, PNG o WebP.
// Nota: no se agregó la dependencia `file-type` (no estaba en package.json);
// esta es una comprobación ligera sin dependencias nuevas.
const SIGNATURES = {
  jpeg: { mime: 'image/jpeg', check: (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF },
  png: { mime: 'image/png', check: (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A },
  // WebP: 'RIFF' .... 'WEBP' (bytes 0-3 y 8-11)
  webp: {
    mime: 'image/webp',
    check: (buf) => buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  }
}

/**
 * Verifica que el buffer del archivo corresponda realmente a una imagen
 * JPEG, PNG o WebP, comparando los primeros bytes (magic numbers) en vez
 * de confiar en el mimetype declarado por el cliente.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidImageSignature(buffer) {
  if (!buffer || buffer.length === 0) return false
  return Object.values(SIGNATURES).some(sig => sig.check(buffer))
}

/**
 * Middleware a usar DESPUÉS de `upload.single(...)`: valida la firma binaria
 * real del archivo subido. Debe ejecutarse antes de enviar el buffer a Cloudinary.
 */
const validateFileSignature = (req, res, next) => {
  if (!req.file) {
    return next()
  }

  if (!isValidImageSignature(req.file.buffer)) {
    return res.status(400).json({
      success: false,
      message: 'El contenido del archivo no corresponde a una imagen JPG, PNG o WebP válida.'
    })
  }

  next()
}

// Middleware para manejar errores de Multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Errores de Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Archivo demasiado grande. El tamaño máximo es 5MB.'
      })
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        message: 'Demasiados archivos. Solo se permite 1 archivo por solicitud.'
      })
    }
    
    return res.status(400).json({
      success: false,
      message: `Error en la subida de archivos: ${err.message}`
    })
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Error al procesar el archivo'
    })
  }
  
  next()
}

module.exports = {
  upload,
  handleUploadErrors,
  validateFileSignature,
  isValidImageSignature
}