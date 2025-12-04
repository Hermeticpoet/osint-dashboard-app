// controllers/resultsController.js
import { getResults, deleteResult } from '../db/db.js';

/**
 * GET /results handler.
 * Validates pagination/filter params and returns matching rows.
 */
export function handleGetResults(req, res) {
  const {
    domain,
    limit,
    offset,
    since,
    ssl_valid: sslValidParam,
    registrar,
    created_from: createdFrom,
    created_to: createdTo,
    whois_expiration_from: whoisExpirationFrom,
    whois_expiration_to: whoisExpirationTo,
  } = req.query;

  const numericLimit =
    limit === undefined ? undefined : Number(limit);
  if (
    numericLimit !== undefined &&
    (!Number.isInteger(numericLimit) || numericLimit <= 0)
  ) {
    return res
      .status(400)
      .json({ error: 'limit must be a positive integer' });
  }

  const numericOffset =
    offset === undefined ? 0 : Number(offset);
  if (!Number.isInteger(numericOffset) || numericOffset < 0) {
    return res
      .status(400)
      .json({ error: 'offset must be a non-negative integer' });
  }

  let sslValid;
  if (sslValidParam !== undefined) {
    if (
      sslValidParam !== 'true' &&
      sslValidParam !== 'false'
    ) {
      return res
        .status(400)
        .json({ error: 'ssl_valid must be true or false' });
    }
    sslValid = sslValidParam === 'true';
  }

  const isValidDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  for (const [label, value] of [
    ['created_from', createdFrom],
    ['created_to', createdTo],
    ['whois_expiration_from', whoisExpirationFrom],
    ['whois_expiration_to', whoisExpirationTo],
  ]) {
    if (value && !isValidDate(value)) {
      return res
        .status(400)
        .json({ error: `${label} must be YYYY-MM-DD` });
    }
  }

  try {
    const rows = getResults({
      domain: domain || undefined,
      limit: numericLimit === undefined ? undefined : numericLimit,
      offset: numericOffset,
      since: since || undefined,
      sslValid,
      registrar: registrar || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      whoisExpirationFrom: whoisExpirationFrom || undefined,
      whoisExpirationTo: whoisExpirationTo || undefined,
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