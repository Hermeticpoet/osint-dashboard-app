const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController.js');

router.post('/', scanController.handleScan);

module.exports = router;
