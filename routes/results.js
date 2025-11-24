// routes/results.js
import express from 'express';
import { handleGetResults, handleDeleteResult } from '../controllers/resultsController.js';

const router = express.Router();

/**
 * GET /results
 * Query params:
 *  - domain: filter by exact domain (optional)
 *  - limit: max number of rows to return (optional, default 50)
 *  - offset: number of rows to skip before returning data (optional, default 0)
 *  - since: ISO timestamp; only return rows after this time (optional)
 */
router.get('/', handleGetResults);

/**
 * DELETE /results/:id
 * Removes a stored result row by ID.
 */
router.delete('/:id', handleDeleteResult);

export default router;