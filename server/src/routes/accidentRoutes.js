const express = require('express');
const router = express.Router();
const accidentController = require('../controllers/accidentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Report accident
router.post('/', authorize('driver', 'admin'), accidentController.reportAccident);

// Get all accidents
router.get('/', accidentController.getAllAccidents);

// Get active alerts
router.get('/alerts', accidentController.getActiveAlerts);

module.exports = router;
