const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { upload, handleUploadErrors } = require('../middleware/uploadMiddleware')
const cloudinaryService = require('../services/cloudinaryService')
const { prisma } = require('../lib/prisma')

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken)

// GET /api/gallery - Obtener todas las imágenes del usuario
router.get('/', async (req, res) => {
  try {
    const images = await prisma.businessImage.findMany({
      where: { 
        userId: req.user.id,
        isActive: true
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    
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
    const images = await prisma.businessImage.findMany({
      where: { 
        userId: req.user.id,
        isActive: true,
        isFeatured: true
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    
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
      folder: `reservas_barberia/${req.user.id}`,
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
    const newImage = await prisma.businessImage.create({
      data: {
        userId: req.user.id,
        imageUrl: uploadResult.data.url,
        cloudinaryPublicId: uploadResult.data.publicId,
        title: title || '',
        description: description || '',
        category: category ? category.toUpperCase() : 'OTROS',
        isFeatured: isFeatured === 'true' || false,
        order: 0 // Por defecto al final
      }
    })

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

    // Verificar que la imagen existe y pertenece al usuario
    const existingImage = await prisma.businessImage.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      })
    }

    // Preparar datos de actualización
    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category.toUpperCase()
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === true || isFeatured === 'true'
    if (order !== undefined) updateData.order = Number(order)

    // Actualizar la imagen
    const image = await prisma.businessImage.update({
      where: { id: req.params.id },
      data: updateData
    })

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
    const image = await prisma.businessImage.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
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
    await prisma.businessImage.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })

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
        { _id: item.id, userId: req.user.id },
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