const express = require('express')
const { body, validationResult } = require('express-validator')
const { authenticateToken } = require('../middleware/auth')
const { upload, handleUploadErrors } = require('../middleware/uploadMiddleware')
const cloudinaryService = require('../services/cloudinaryService')
const { prisma } = require('../lib/prisma')
const router = express.Router()

// Middleware de autenticación para rutas protegidas
router.use('/profile', authenticateToken)
router.use('/onboarding', authenticateToken)

// GET /api/users/profile - Obtener perfil del usuario autenticado
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        salonName: true,
        address: true,
        role: true,
        isActive: true,
        avatar: true,
        requiresDeposit: true,
        depositAmount: true,
        onboardingCompleted: true,
        holdDurationMinutes: true,
        bookingMode: true,
        autoConfirmAfterPayment: true,
        cancellationMinutesBefore: true,
        noShowWaitMinutes: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error obteniendo perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/users/profile - Actualizar perfil del usuario autenticado
router.put('/profile', async (req, res) => {
  try {
    const { salonName, phone, address, avatar, requiresDeposit, depositAmount,
            bookingMode, autoConfirmAfterPayment, holdDurationMinutes,
            cancellationMinutesBefore, noShowWaitMinutes } = req.body
    const updateData = { salonName, phone, address, avatar }
    if (requiresDeposit !== undefined) updateData.requiresDeposit = !!requiresDeposit
    if (depositAmount !== undefined) updateData.depositAmount = parseFloat(depositAmount) || 0
    // Campos de modo de reserva
    const validModes = ['LIBRE', 'PREPAGO', 'PAGO_POST_APROBACION']
    if (bookingMode && validModes.includes(bookingMode)) updateData.bookingMode = bookingMode
    if (autoConfirmAfterPayment !== undefined) updateData.autoConfirmAfterPayment = !!autoConfirmAfterPayment
    if (holdDurationMinutes !== undefined) updateData.holdDurationMinutes = Math.max(5, Math.min(60, parseInt(holdDurationMinutes) || 15))
    if (cancellationMinutesBefore !== undefined) updateData.cancellationMinutesBefore = Math.max(0, parseInt(cancellationMinutesBefore) || 60)
    if (noShowWaitMinutes !== undefined) updateData.noShowWaitMinutes = Math.max(5, Math.min(60, parseInt(noShowWaitMinutes) || 15))
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        salonName: true,
        address: true,
        role: true,
        isActive: true,
        avatar: true,
        requiresDeposit: true,
        depositAmount: true,
        onboardingCompleted: true,
        holdDurationMinutes: true,
        bookingMode: true,
        autoConfirmAfterPayment: true,
        cancellationMinutesBefore: true,
        noShowWaitMinutes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: user
    })
  } catch (error) {
    console.error('Error actualizando perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/users/profile/avatar - Subir avatar
router.post('/profile/avatar', upload.single('avatar'), handleUploadErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ninguna imagen'
      })
    }

    // Subir imagen a Cloudinary
    const uploadResult = await cloudinaryService.uploadImage(req.file.buffer, {
      folder: `reservas_barberia/${req.user.id}/avatars`,
      public_id: `avatar_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    })

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir la imagen'
      })
    }

    // Actualizar avatar en el perfil
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: uploadResult.data.url },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        salonName: true,
        address: true,
        role: true,
        isActive: true,
        avatar: true,
        requiresDeposit: true,
        depositAmount: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: 'Avatar actualizado exitosamente',
      data: user
    })
  } catch (error) {
    console.error('Error subiendo avatar:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/users/onboarding - Completar configuración inicial del salón
router.post('/onboarding', [
  body('ownerCutsHair')
    .isBoolean()
    .withMessage('ownerCutsHair debe ser booleano'),
  body('barbers')
    .optional()
    .isArray()
    .withMessage('barbers debe ser un array'),
  body('barbers.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del barbero es requerido'),
  body('businessHours')
    .isArray({ min: 1 })
    .withMessage('Debes configurar al menos un horario'),
  body('businessHours.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('Día de semana inválido'),
  body('businessHours.*.isActive')
    .isBoolean()
    .withMessage('isActive debe ser booleano'),
  body('services')
    .isArray({ min: 1 })
    .withMessage('Debes agregar al menos un servicio'),
  body('services.*.name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del servicio es requerido'),
  body('services.*.price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('services.*.duration')
    .isInt({ min: 5 })
    .withMessage('La duración mínima es 5 minutos')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de configuración inválidos',
        errors: errors.array()
      })
    }

    const userId = req.user.id
    const { ownerCutsHair, ownerBarberName, barbers = [], businessHours, services } = req.body

    // Verificar que no haya completado el onboarding ya
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true, salonName: true, username: true }
    })

    if (currentUser.onboardingCompleted) {
      return res.status(400).json({
        success: false,
        message: 'La configuración inicial ya fue completada'
      })
    }

    // Ejecutar todo en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Si el dueño corta pelo, crear barbero-dueño
      if (ownerCutsHair) {
        await tx.barber.create({
          data: {
            userId,
            name: ownerBarberName || currentUser.salonName,
            isOwner: true,
            isActive: true
          }
        })
      }

      // 2. Crear otros barberos
      if (barbers.length > 0) {
        await tx.barber.createMany({
          data: barbers.map(b => ({
            userId,
            name: b.name.trim(),
            phone: b.phone || null,
            specialty: b.specialty || null,
            isOwner: false,
            isActive: true
          }))
        })
      }

      // 3. Configurar horarios de negocio
      for (const hour of businessHours) {
        if (hour.isActive) {
          await tx.businessHour.upsert({
            where: {
              userId_dayOfWeek: {
                userId,
                dayOfWeek: hour.dayOfWeek
              }
            },
            update: {
              startTime: hour.startTime,
              endTime: hour.endTime,
              isActive: true
            },
            create: {
              userId,
              dayOfWeek: hour.dayOfWeek,
              startTime: hour.startTime,
              endTime: hour.endTime,
              isActive: true
            }
          })
        }
      }

      // 4. Crear servicios
      await tx.service.createMany({
        data: services.map(s => ({
          userId,
          name: s.name.trim(),
          description: s.description || null,
          price: parseFloat(s.price),
          duration: parseInt(s.duration),
          category: s.category || 'CORTE',
          isActive: true
        }))
      })

      // 5. Marcar onboarding como completado
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          salonName: true,
          address: true,
          role: true,
          isActive: true,
          avatar: true,
          onboardingCompleted: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return updatedUser
    })

    res.status(201).json({
      success: true,
      message: 'Configuración inicial completada exitosamente',
      data: result
    })
  } catch (error) {
    console.error('Error en onboarding:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/users/:username - Obtener perfil público por username (NO PROTEGIDA)
router.get('/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        username: req.params.username.toLowerCase(),
        isActive: true 
      },
      select: {
        username: true,
        salonName: true,
        phone: true,
        address: true,
        avatar: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        salonName: user.salonName,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar
      }
    })
  } catch (error) {
    console.error('Error obteniendo perfil público:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router