// controllers/exportResultsController.js
import { Parser } from 'json2csv';
import { getResults } from '../db/db.js';

/**
 * GET /results/export.csv
 * Safe, fast CSV export with hard row limit and useful header.
 * Built for better-sqlite3 (synchronous) — perfect for MVP.
 */
export function handleExportResults(req, res) {
  const { domain, since, limit, offset } = req.query;

  // === Safety: Hard maximum to prevent OOM crashes ===
  const MAX_ROWS = 50_000;

  // Parse and clamp limit
  let numericLimit = MAX_ROWS; // default = export max allowed
  if (limit !== undefined) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'limit must be a positive integer' });
    }
    numericLimit = Math.min(parsed, MAX_ROWS);
  }

  // Parse offset
  const numericOffset = offset === undefined ? 0 : Number(offset);
  if (!Number.isInteger(numericOffset) || numericOffset < 0) {
    return res.status(400).json({ error: 'offset must be a non-negative integer' });
  }

  try {
    // === Fetch data (synchronous — safe with better-sqlite3) ===
    const rows = getResults({
      domain: domain || undefined,
      since: since || undefined,
      limit: numericLimit,
      offset: numericOffset,
    });

    if (rows.length === MAX_ROWS) {
      console.warn(`Export hit hard limit of ${MAX_ROWS} rows (requested ${limit || 'default'})`);
    }

    // === Flatten nested result JSON into flat columns ===
    const flattenedRows = rows.map((row) => {
      let parsed = {};
      if (row.result) {
        try {
          parsed = JSON.parse(row.result);
        } catch (e) {
          console.warn(`Row ${row.id}: Failed to parse result JSON`, e.message);
        }
      }

      const ssl = parsed.ssl || {};
      const whois = parsed.whois || {};

      return {
        id: row.id,
        domain: row.domain,
        created_at: row.created_at,
        ip: row.ip ?? parsed.ip ?? null,

        // SSL: prefer direct DB columns if present
        ssl_valid: row.ssl_valid ?? ssl.valid ?? null,
        ssl_valid_from: row.ssl_valid_from ?? ssl.validFrom ?? null,
        ssl_valid_to: row.ssl_valid_to ?? ssl.validTo ?? null,
        ssl_days_remaining: row.ssl_days_remaining ?? ssl.daysRemaining ?? null,

        // WHOIS: handle both camelCase and snake_case (very common inconsistency)
        registrar: row.registrar ?? whois.registrarName ?? null,
        whois_creationDate: whois.creationDate ?? whois.creation_date ?? null,
        whois_expirationDate: whois.expirationDate ?? whois.expiration_date ?? null,
      };
    });

    // === Generate CSV ===
    const fields = [
      'id',
      'domain',
      'created_at',
      'ip',
      'ssl_valid',
      'ssl_valid_from',
      'ssl_valid_to',
      'ssl_days_remaining',
      'registrar',
      'whois_creationDate',
      'whois_expirationDate',
    ];

    const parser = new Parser({ fields });
    const csvBody = parser.parse(flattenedRows);

    // === Helpful header comment (ignored by Excel/Google Sheets) ===
    const headerComment = [
      `# Domain Results Export`,
      `# Generated: ${new Date().toISOString()}`,
      `# Total rows exported: ${flattenedRows.length}`,
      `# Applied limit: ${numericLimit}${numericLimit === MAX_ROWS ? ' (hard maximum)' : ''}`,
      `# Offset: ${numericOffset}`,
      ``, // blank line for readability
    ].join('\n');

    const csv = headerComment + csvBody;

    // === Send as downloadable file ===
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="domain-results.csv"');

    return res.send(csv);
  } catch (err) {
    console.error('CSV export failed:', err);
    return res.status(500).json({ error: 'Failed to generate CSV export' });
  }
}