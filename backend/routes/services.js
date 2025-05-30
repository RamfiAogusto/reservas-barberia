const express = require('express')
const router = express.Router()

// GET /api/services
router.get('/', async (req, res) => {
  try {
    // TODO: Implementar obtener servicios
    res.json({ message: 'Lista de servicios' })
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo servicios', error: error.message })
  }
})

// POST /api/services
router.post('/', async (req, res) => {
  try {
    // TODO: Implementar crear servicio
    res.json({ message: 'Servicio creado' })
  } catch (error) {
    res.status(500).json({ message: 'Error creando servicio', error: error.message })
  }
})

// PUT /api/services/:id
router.put('/:id', async (req, res) => {
  try {
    // TODO: Implementar actualizar servicio
    res.json({ message: `Servicio ${req.params.id} actualizado` })
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando servicio', error: error.message })
  }
})

// DELETE /api/services/:id
router.delete('/:id', async (req, res) => {
  try {
    // TODO: Implementar eliminar servicio
    res.json({ message: `Servicio ${req.params.id} eliminado` })
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando servicio', error: error.message })
  }
})

module.exports = router 