const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { upload, handleUploadErrors } = require('../middleware/uploadMiddleware')
const cloudinaryService = require('../services/cloudinaryService')
const BusinessImage = require('../models/BusinessImage')

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken)

// GET /api/gallery - Obtener todas las imágenes del usuario
router.get('/', async (req, res) => {
  try {
    const images = await BusinessImage.getActiveByUser(req.user._id)
    
    res.json({
      success: true,
      count: images.length,
      data: images
    })
  } catch (error) {
    console.error('Error obteniendo imágenes:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/gallery/featured - Obtener imágenes destacadas del usuario
router.get('/featured', async (req, res) => {
  try {
    const images = await BusinessImage.getFeaturedByUser(req.user._id)
    
    res.json({
      success: true,
      count: images.length,
      data: images
    })
  } catch (error) {
    console.error('Error obteniendo imágenes destacadas:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/gallery - Subir una nueva imagen
router.post('/', upload.single('image'), handleUploadErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      })
    }

    // Extraer datos del formulario
    const { title, description, category, isFeatured } = req.body

    // Subir imagen a Cloudinary
    const uploadResult = await cloudinaryService.uploadImage(req.file.buffer, {
      folder: `reservas_barberia/${req.user._id}`,
      public_id: `business_${Date.now()}`
    })

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir la imagen a Cloudinary',
        error: uploadResult.message
      })
    }

    // Crear registro en la base de datos
    const newImage = new BusinessImage({
      userId: req.user._id,
      imageUrl: uploadResult.data.url,
      cloudinaryPublicId: uploadResult.data.publicId,
      title: title || '',
      description: description || '',
      category: category || 'otros',
      isFeatured: isFeatured === 'true' || false,
      order: 0 // Por defecto al final
    })

    await newImage.save()

    res.status(201).json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: newImage
    })
  } catch (error) {
    console.error('Error subiendo imagen:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/gallery/:id - Actualizar información de la imagen
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, isFeatured, order } = req.body

    const image = await BusinessImage.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      })
    }

    // Actualizar los campos proporcionados
    if (title !== undefined) image.title = title
    if (description !== undefined) image.description = description
    if (category !== undefined) image.category = category
    if (isFeatured !== undefined) image.isFeatured = isFeatured === true || isFeatured === 'true'
    if (order !== undefined) image.order = Number(order)

    await image.save()

    res.json({
      success: true,
      message: 'Imagen actualizada exitosamente',
      data: image
    })
  } catch (error) {
    console.error('Error actualizando imagen:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// DELETE /api/gallery/:id - Eliminar una imagen
router.delete('/:id', async (req, res) => {
  try {
    const image = await BusinessImage.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      })
    }

    // Eliminar de Cloudinary
    const deleteResult = await cloudinaryService.deleteImage(image.cloudinaryPublicId)
    
    if (!deleteResult.success) {
      console.warn('No se pudo eliminar la imagen de Cloudinary:', deleteResult.message)
    }

    // Eliminación lógica (soft delete)
    image.isActive = false
    await image.save()

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error eliminando imagen:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/gallery/reorder - Reordenar varias imágenes
router.put('/reorder', async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'El formato de los datos es incorrecto'
      })
    }

    // Actualizar el orden de cada imagen
    for (const item of items) {
      if (!item.id || item.order === undefined) continue

      await BusinessImage.findOneAndUpdate(
        { _id: item.id, userId: req.user._id },
        { order: item.order }
      )
    }

    res.json({
      success: true,
      message: 'Orden de imágenes actualizado exitosamente'
    })
  } catch (error) {
    console.error('Error reordenando imágenes:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router 