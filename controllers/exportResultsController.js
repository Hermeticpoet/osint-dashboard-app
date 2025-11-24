// controllers/exportResultsController.js
import { Parser } from 'json2csv';
import { getResults } from '../db/db.js';

/**
 * GET /results/export.csv handler.
 * Validates filters/pagination, fetches rows, and streams CSV to the client.
 * Prepends a timestamp header for traceability.
 */
export async function handleExportResults(req, res) {
  const { domain, since, limit, offset } = req.query;

  // Validate limit
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

  // Validate offset
  const numericOffset =
    offset === undefined ? 0 : Number(offset);
  if (!Number.isInteger(numericOffset) || numericOffset < 0) {
    return res
      .status(400)
      .json({ error: 'offset must be a non-negative integer' });
  }

  try {
    // Query rows from DB
    const rows = getResults({
      domain: domain || undefined,
      limit: numericLimit === undefined ? undefined : numericLimit,
      offset: numericOffset,
      since: since || undefined,
    });

    // Prepare CSV parser with schema-order fields
    const parser = new Parser({
      fields: [
        'id',
        'domain',
        'ip',
        'ssl_valid',
        'ssl_valid_from',
        'ssl_valid_to',
        'ssl_days_remaining',
        'registrar',
        'created_at',
      ],
    });

    // Generate CSV body and prepend timestamp header
    const csvBody = parser.parse(rows);
    const timestampHeader = `# Exported at ${new Date().toISOString()}`;
    const csv = `${timestampHeader}\n${csvBody}`;

    // Send response with proper headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="results.csv"'
    );
    return res.status(200).send(csv);
  } catch (err) {
    return res
      .status(500)
      .json({ error: err?.message || 'Failed to export results' });
  }
}
