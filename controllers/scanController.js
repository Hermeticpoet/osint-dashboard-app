// controllers/scanController.js
import { scanDomain } from '../services/scanService.js';
import { insertResult } from '../db/db.js';
import { normalizeDomain, isValidDomain } from '../utils/domainUtils.js';

/**
 * Handles POST /scan requests.
 * Validates input, performs domain scan, and saves result to database.
 *
 * Response shapes:
 * - Success: { id: <number>, result: <object> }
 * - Invalid domain: { id: null, result: 'INVALID_DOMAIN' }
 * - Scan failed: { id: null, result: 'SCAN_FAILED' }
 * - DB error: { error: 'failed to save result' }
 */
export async function handleScan(req, res) {
  // Check if domain is provided
  if (!req.body?.domain) {
    return res.status(400).json({ id: null, result: 'INVALID_DOMAIN' });
  }

  const domain = req.body.domain;

  // Normalize and validate domain before calling scanDomain
  const normalized = normalizeDomain(domain);
  if (!isValidDomain(normalized)) {
    return res.status(400).json({ id: null, result: 'INVALID_DOMAIN' });
  }

  try {
    // Perform domain scan
    const result = await scanDomain(domain);

    // Save result to database
    let id;
    try {
      id = insertResult(result);
    } catch (err) {
      return res.status(500).json({ error: 'failed to save result' });
    }

    // Return success response
    return res.json({ id, result });
  } catch (err) {
    // Handle specific error types from scanDomain
    if (err.message === 'INVALID_DOMAIN') {
      return res.status(400).json({ id: null, result: 'INVALID_DOMAIN' });
    }

    if (err.message === 'SCAN_FAILED') {
      return res.status(500).json({ id: null, result: 'SCAN_FAILED' });
    }

    // Unexpected error - return generic error
    return res.status(500).json({ error: err.message || 'scan failed' });
  }
}
