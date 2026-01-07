// __tests__/unit/exportResultsController.test.js
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockGetResults = jest.fn();

await jest.unstable_mockModule('../../db/db.js', () => ({
  getResults: mockGetResults,
}));

const { handleExportResults } = await import(
  '../../controllers/exportResultsController.js'
);

describe('handleExportResults', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {} };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  describe('validation errors', () => {
    test('returns 400 when limit is non-integer', () => {
      req.query = { limit: 'abc' };

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'limit must be a positive integer',
      });
      expect(mockGetResults).not.toHaveBeenCalled();
    });

    test('returns 400 when limit is <= 0', () => {
      req.query = { limit: '0' };

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'limit must be a positive integer',
      });
      expect(mockGetResults).not.toHaveBeenCalled();
    });

    test('returns 400 when limit is negative', () => {
      req.query = { limit: '-5' };

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'limit must be a positive integer',
      });
      expect(mockGetResults).not.toHaveBeenCalled();
    });

    test('returns 400 when offset is non-integer', () => {
      req.query = { offset: 'xyz' };

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'offset must be a non-negative integer',
      });
      expect(mockGetResults).not.toHaveBeenCalled();
    });

    test('returns 400 when offset is negative', () => {
      req.query = { offset: '-10' };

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'offset must be a non-negative integer',
      });
      expect(mockGetResults).not.toHaveBeenCalled();
    });
  });

  describe('DB call parameters', () => {
    test('calls getResults with default parameters when query is empty', () => {
      mockGetResults.mockReturnValue([]);

      handleExportResults(req, res);

      expect(mockGetResults).toHaveBeenCalledWith({
        domain: undefined,
        since: undefined,
        limit: 50000,
        offset: 0,
      });
    });

    test('calls getResults with domain, since, limit, and offset', () => {
      req.query = {
        domain: 'example.com',
        since: '2025-01-01T00:00:00Z',
        limit: '100',
        offset: '50',
      };
      mockGetResults.mockReturnValue([]);

      handleExportResults(req, res);

      expect(mockGetResults).toHaveBeenCalledWith({
        domain: 'example.com',
        since: '2025-01-01T00:00:00Z',
        limit: 100,
        offset: 50,
      });
    });

    test('clamps limit to MAX_ROWS (50000) when limit exceeds maximum', () => {
      req.query = { limit: '100000' };
      mockGetResults.mockReturnValue([]);

      handleExportResults(req, res);

      expect(mockGetResults).toHaveBeenCalledWith({
        domain: undefined,
        since: undefined,
        limit: 50000,
        offset: 0,
      });
    });

    test('uses MAX_ROWS as default limit when limit is not provided', () => {
      mockGetResults.mockReturnValue([]);

      handleExportResults(req, res);

      expect(mockGetResults).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50000,
        })
      );
    });
  });

  describe('CSV output', () => {
    test('generates CSV with header comment and data rows', () => {
      const mockRows = [
        {
          id: 1,
          domain: 'example.com',
          created_at: '2025-01-01T00:00:00Z',
          ip: '192.0.2.1',
          ssl_valid: 1,
          ssl_valid_from: '2024-01-01',
          ssl_valid_to: '2025-12-31',
          ssl_days_remaining: 365,
          registrar: 'NameCheap',
          result: null,
        },
      ];
      mockGetResults.mockReturnValue(mockRows);

      handleExportResults(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="domain-results.csv"'
      );
      expect(res.send).toHaveBeenCalledTimes(1);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('# Domain Results Export');
      expect(csvContent).toContain('# Generated:');
      expect(csvContent).toContain('# Total rows exported: 1');
      expect(csvContent).toContain('"id","domain","created_at","ip"');
      expect(csvContent).toContain('1,"example.com"');
    });

    test('handles JSON parse failure gracefully with fallback to DB columns', () => {
      const mockRows = [
        {
          id: 2,
          domain: 'test.com',
          created_at: '2025-01-02T00:00:00Z',
          ip: '192.0.2.2',
          ssl_valid: 0,
          ssl_valid_from: '2024-01-01',
          ssl_valid_to: '2024-12-31',
          ssl_days_remaining: 0,
          registrar: 'GoDaddy',
          result: '{ invalid json }',
        },
      ];
      mockGetResults.mockReturnValue(mockRows);

      handleExportResults(req, res);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('2,"test.com"');
      expect(csvContent).toContain('"GoDaddy"');
    });

    test('handles missing nested fields with fallback to null', () => {
      const mockRows = [
        {
          id: 3,
          domain: 'nodata.com',
          created_at: '2025-01-03T00:00:00Z',
          ip: null,
          ssl_valid: null,
          ssl_valid_from: null,
          ssl_valid_to: null,
          ssl_days_remaining: null,
          registrar: null,
          result: '{}',
        },
      ];
      mockGetResults.mockReturnValue(mockRows);

      handleExportResults(req, res);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('3,"nodata.com"');
      expect(csvContent).toContain('"id","domain","created_at","ip"');
    });

    test('prefers DB columns over parsed JSON when both exist', () => {
      const mockRows = [
        {
          id: 4,
          domain: 'prefer-db.com',
          created_at: '2025-01-04T00:00:00Z',
          ip: '192.0.2.4',
          ssl_valid: 1,
          ssl_valid_from: '2024-01-01',
          ssl_valid_to: '2025-12-31',
          ssl_days_remaining: 365,
          registrar: 'DB-Registrar',
          result: JSON.stringify({
            ip: '192.0.2.999',
            ssl: { valid: false },
            whois: { registrarName: 'JSON-Registrar' },
          }),
        },
      ];
      mockGetResults.mockReturnValue(mockRows);

      handleExportResults(req, res);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('4,"prefer-db.com"');
      expect(csvContent).toContain('"192.0.2.4"');
      expect(csvContent).toContain('"DB-Registrar"');
    });

    test('handles empty result set', () => {
      mockGetResults.mockReturnValue([]);

      handleExportResults(req, res);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('# Total rows exported: 0');
      expect(csvContent).toContain('"id","domain","created_at","ip"');
    });
  });

  describe('error handling', () => {
    test('returns 500 when getResults throws an error', () => {
      mockGetResults.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      handleExportResults(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to generate CSV export',
      });
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});
