// controllers/resultsController.js
import { getResults, deleteResult } from '../db/db.js';

/**
 * GET /results handler.
 * Validates pagination/filter params and returns matching rows.
 */
export function handleGetResults(req, res) {
  const { domain, limit, since, offset } = req.query;

  const numericLimit =
    limit === undefined ? undefined : Number(limit);

  if (numericLimit !== undefined && (!Number.isInteger(numericLimit) || numericLimit <= 0)) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }

  const numericOffset =
    offset === undefined ? 0 : Number(offset);

  if (!Number.isInteger(numericOffset) || numericOffset < 0) {
    return res.status(400).json({ error: 'offset must be a non-negative integer' });
  }

  try {
    const rows = getResults({
      domain: domain || undefined,
      limit: numericLimit === undefined ? undefined : numericLimit,
      offset: numericOffset,
      since: since || undefined,
    });
    return res.json(rows);
  } catch (err) {
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to fetch results' });
  }
}

/**
 * DELETE /results/:id handler.
 * Validates the ID parameter, deletes the row, and returns status.
 */
export async function handleDeleteResult(req, res) {
  const { id } = req.params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ error: 'Invalid result id' });
  }

  try {
    const deleted = deleteResult(numericId);
    if (!deleted) {
      return res.status(404).json({ error: 'Result not found' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to delete result' });
  }
}