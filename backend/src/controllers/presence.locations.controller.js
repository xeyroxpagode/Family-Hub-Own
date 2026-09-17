const { getPlannerContext } = require('../services/planner.context.service')
const locationsService = require('../services/presence.locations.service')

const listLocations = async (req, res, next) => {
  try {
    const context = await getPlannerContext(req)
    res.json(await locationsService.listLocations(context))
  } catch (error) {
    next(error)
  }
}

const updateMyLocation = async (req, res, next) => {
  try {
    const context = await getPlannerContext(req)
    res.json(await locationsService.upsertMyLocation(context, req.body))
  } catch (error) {
    next(error)
  }
}

const listLocationHistory = async (req, res, next) => {
  try {
    const context = await getPlannerContext(req)
    res.json(await locationsService.listLocationHistory(context, req.params.membershipId))
  } catch (error) {
    next(error)
  }
}

const listPlaces = async (req, res, next) => {
  try {
    const context = await getPlannerContext(req)
    res.json(await locationsService.listPlaces(context))
  } catch (error) {
    next(error)
  }
}

const savePlace = async (req, res, next) => {
  try {
    const context = await getPlannerContext(req)
    res.json(await locationsService.savePlace(context, req.body))
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listLocations,
  updateMyLocation,
  listLocationHistory,
  listPlaces,
  savePlace,
}


