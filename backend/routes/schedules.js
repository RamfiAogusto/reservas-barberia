const express = require('express')
const router = express.Router()

// GET /api/schedules
router.get('/', async (req, res) => {
  try {
    // TODO: Implementar obtener horarios
    res.json({ message: 'Horarios de trabajo' })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo horarios', error: error.message })
  }
})

// POST /api/schedules
router.post('/', async (req, res) => {
  try {
    // TODO: Implementar crear/actualizar horarios
    res.json({ message: 'Horarios actualizados' })
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando horarios', error: error.message })
  }
})

// GET /api/schedules/availability
router.get('/availability', async (req, res) => {
  try {
    // TODO: Implementar obtener disponibilidad
    res.json({ message: 'Disponibilidad de horarios' })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo disponibilidad', error: error.message })
  }
})

module.exports = router 