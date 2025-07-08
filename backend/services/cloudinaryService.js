const cloudinary = require('cloudinary').v2
require('dotenv').config()

class CloudinaryService {
  constructor() {
    this.isConfigured = false
    this.initialize()
  }

  initialize() {
    try {
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        })
        this.isConfigured = true
        console.log('✅ Cloudinary configurado correctamente')
      } else {
        console.warn('⚠️ Cloudinary no configurado - subida de imágenes limitada')
        this.isConfigured = false
      }
    } catch (error) {
      console.error('❌ Error configurando Cloudinary:', error)
      this.isConfigured = false
    }
  }

  async uploadImage(fileBuffer, options = {}) {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Cloudinary no está configurado en el servidor'
      }
    }

    try {
      // Convertir el buffer a una string base64
      const base64String = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`

      // Configurar opciones de subida
      const uploadOptions = {
        folder: options.folder || 'reservas_barberia',
        resource_type: 'image',
        ...options
      }

      // Subir la imagen a Cloudinary
      const result = await cloudinary.uploader.upload(base64String, uploadOptions)

      return {
        success: true,
        data: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format
        }
      }
    } catch (error) {
      console.error('Error subiendo imagen a Cloudinary:', error)
      return {
        success: false,
        message: 'Error al subir la imagen',
        error: error.message
      }
    }
  }

  async deleteImage(publicId) {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Cloudinary no está configurado en el servidor'
      }
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId)
      
      if (result.result === 'ok') {
        return {
          success: true,
          message: 'Imagen eliminada correctamente'
        }
      } else {
        return {
          success: false,
          message: 'No se pudo eliminar la imagen',
          details: result
        }
      }
    } catch (error) {
      console.error('Error eliminando imagen de Cloudinary:', error)
      return {
        success: false,
        message: 'Error al eliminar la imagen',
        error: error.message
      }
    }
  }

  getStatus() {
    return {
      isConfigured: this.isConfigured
    }
  }
}

module.exports = new CloudinaryService() 