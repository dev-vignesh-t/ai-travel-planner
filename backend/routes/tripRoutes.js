const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  generateNewTrip, getTrips, getTripById, updateTrip, regenerateDay, deleteTrip
} = require('../controllers/tripController');

router.use(auth); // protects every route below

router.post('/', generateNewTrip);
router.get('/', getTrips);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.put('/:id/regenerate-day/:dayNumber', regenerateDay);
router.delete('/:id', deleteTrip);

module.exports = router;