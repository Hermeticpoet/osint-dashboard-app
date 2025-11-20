// controllers/resultsController.js
import { deleteResult } from '../db/db.js';

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