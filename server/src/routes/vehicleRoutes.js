const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all vehicles
router.get('/', vehicleController.getAllVehicles);

// Get vehicles near a point
router.get('/nearby', vehicleController.findNearby);

// Get single vehicle
router.get('/:id', vehicleController.getVehicle);

// Update vehicle location (drivers only)
router.post('/:id/location', authorize('driver', 'admin'), vehicleController.updateLocation);

// Get location history
router.get('/:id/history', vehicleController.getLocationHistory);

module.exports = router;
