// routes/scan.js
import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { handleScan } from '../controllers/scanController.js';

const router = express.Router();

/**
 * POST /scan
 * Admin-only: initiates a domain scan.
 */
router.post('/', authenticateToken, authorizeRole('admin'), handleScan);

export default router;
