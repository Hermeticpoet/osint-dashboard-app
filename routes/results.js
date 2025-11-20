// routes/results.js
import express from 'express';
import { getResults } from '../db/db.js';
import { handleDeleteResult } from '../controllers/resultsController.js';

const router = express.Router();

/**
 * GET /results
 * Query params:
 *  - domain: filter by exact domain (optional)
 *  - limit: max number of rows to return (optional, default 50)
 *  - since: ISO timestamp; only return rows after this time (optional)
 */
router.get('/', (req, res) => {
  try {
    const { domain, limit, since } = req.query;
    const rows = getResults({
      domain: domain || undefined,
      limit: limit ? Number(limit) : undefined,
      since: since || undefined,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch results' });
  }
});

/**
 * DELETE /results/:id
 * Removes a stored result row by ID.
 */
router.delete('/:id', handleDeleteResult);

export default router;