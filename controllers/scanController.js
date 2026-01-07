// controllers/scanController.js
import { scanDomain } from '../services/scanService.js';
import { insertResult } from '../db/db.js';

/**
 * Handles POST /scan requests.
 * Validates input, performs domain scan, and saves result to database.
 */
export async function handleScan(req, res) {
  // Check if domain is provided
  if (!req.body?.domain) {
    return res.status(400).json({ error: 'domain is required' });
  }

  const domain = req.body.domain;

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
    return res.json({
      id,
      result,
    });
  } catch (err) {
    // Handle specific error types
    if (err.message === 'INVALID_DOMAIN') {
      return res.status(400).json({ error: 'invalid domain' });
    }

    if (err.message === 'SCAN_FAILED') {
      return res.status(500).json({ error: 'scan failed' });
    }

    // Unexpected error - return generic error
    return res.status(500).json({ error: err.message || 'scan failed' });
  }
}
