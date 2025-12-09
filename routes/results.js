// routes/results.js
import express from 'express';
import {
  handleGetResults,
  handleDeleteResult,
} from '../controllers/resultsController.js';
import { handleExportResults } from '../controllers/exportResultsController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /results
 * Accessible to both admin and read-only roles.
 */
router.get('/', authenticateToken, authorizeRole(['admin', 'read-only']), handleGetResults);

/**
 * GET /results/export.csv
 * Admin-only.
 */
router.get('/export.csv', authenticateToken, authorizeRole('admin'), handleExportResults);

/**
 * DELETE /results/:id
 * Admin-only.
 */
router.delete('/:id', authenticateToken, authorizeRole('admin'), handleDeleteResult);

export default router;
