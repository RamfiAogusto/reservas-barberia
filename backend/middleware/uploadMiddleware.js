const multer = require('multer')
const path = require('path')

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage()

// Configuración de límites y validación de archivos
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  
  if (allowedTypes.includes(file.mimetype)) {
    // Aceptar el archivo
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
  handleUploadErrors
} 