const express = require('express')
const router = express.Router()
const { pcoGet } = require('../pco-client')

router.get('/service-types', async (req, res) => {
  try {
    const data = await pcoGet('/services/v2/service_types')
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/service-types/:id/plans', async (req, res) => {
  try {
    const data = await pcoGet(`/services/v2/service_types/${req.params.id}/plans?filter=future&per_page=10`)
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/service-types/:typeId/plans/:planId/team-members', async (req, res) => {
  try {
    const data = await pcoGet(
      `/services/v2/service_types/${req.params.typeId}/plans/${req.params.planId}/team_members`
    )
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

module.exports = router
