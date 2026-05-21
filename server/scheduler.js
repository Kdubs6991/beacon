const cron = require('node-cron')
const db = require('./db')

const activeTasks = new Map()

function startScheduler() {
  const schedules = db.prepare(`
    SELECT s.*, st.name as service_type_name, st.pco_service_type_id
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE s.enabled = 1
  `).all()

  for (const schedule of schedules) {
    registerSchedule(schedule)
  }

  console.log(`Scheduler started with ${schedules.length} active schedule(s)`)
}

function registerSchedule(schedule) {
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).stop()
  }

  if (!cron.validate(schedule.cron_expr)) {
    console.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expr}`)
    return
  }

  const task = cron.schedule(schedule.cron_expr, () => runSchedule(schedule.id))
  activeTasks.set(schedule.id, task)
  console.log(`Registered schedule ${schedule.id} (${schedule.service_type_name}): ${schedule.cron_expr}`)
}

function unregisterSchedule(scheduleId) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).stop()
    activeTasks.delete(scheduleId)
  }
}

async function runSchedule(scheduleId) {
  const schedule = db.prepare(`
    SELECT s.*, st.pco_service_type_id
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE s.id = ?
  `).get(scheduleId)

  if (!schedule) return

  console.log(`Running schedule ${scheduleId}...`)

  try {
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Mock mode: skipping PCO fetch for schedule', scheduleId)
    } else {
      const { pcoGet } = require('./pco-client')
      const plans = await pcoGet(
        `/services/v2/service_types/${schedule.pco_service_type_id}/plans?filter=future&per_page=1`
      )
      console.log('Fetched upcoming plan:', plans?.data?.[0]?.id)
      // TODO: wire up assignment automation
    }

    db.prepare('UPDATE schedules SET last_run = datetime(\'now\') WHERE id = ?').run(scheduleId)
  } catch (err) {
    console.error(`Schedule ${scheduleId} failed:`, err.message)
  }
}

module.exports = { startScheduler, registerSchedule, unregisterSchedule, runSchedule }
