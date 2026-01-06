// __tests__/unit/resultsController.test.js

import { jest } from '@jest/globals';

// ESM mocking must happen BEFORE importing the module under test
jest.unstable_mockModule('../../db/db.js', () => ({
  getResults: jest.fn(),
  deleteResult: jest.fn(),
}));

// Now import the mocked module + controllers
const db = await import('../../db/db.js');
const { handleGetResults, handleDeleteResult } = await import(
  '../../controllers/resultsController.js'
);

// Helper to mock Express res object
function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('handleGetResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----- LIMIT VALIDATION -----

  it('returns 400 if limit is non-integer', () => {
    const req = { query: { limit: 'abc' } };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'limit must be a positive integer',
    });
  });

  it('returns 400 if limit <= 0', () => {
    const req = { query: { limit: '0' } };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid limit', () => {
    const req = { query: { limit: '10' } };
    const res = mockRes();

    db.getResults.mockReturnValue([]);

    handleGetResults(req, res);

    expect(db.getResults).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  // ----- OFFSET VALIDATION -----

  it('returns 400 if offset is non-integer', () => {
    const req = { query: { offset: 'abc' } };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'offset must be a non-negative integer',
    });
  });

  it('returns 400 if offset < 0', () => {
    const req = { query: { offset: '-1' } };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts valid offset', () => {
    const req = { query: { offset: '5' } };
    const res = mockRes();

    db.getResults.mockReturnValue([]);

    handleGetResults(req, res);

    expect(db.getResults).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 5 })
    );
  });

  // ----- SSL VALIDATION -----

  it('returns 400 for invalid ssl_valid value', () => {
    const req = { query: { ssl_valid: 'maybe' } };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ssl_valid must be true or false',
    });
  });

  it('parses ssl_valid=true', () => {
    const req = { query: { ssl_valid: 'true' } };
    const res = mockRes();

    db.getResults.mockReturnValue([]);

    handleGetResults(req, res);

    expect(db.getResults).toHaveBeenCalledWith(
      expect.objectContaining({ sslValid: true })
    );
  });

  it('parses ssl_valid=false', () => {
    const req = { query: { ssl_valid: 'false' } };
    const res = mockRes();

    db.getResults.mockReturnValue([]);

    handleGetResults(req, res);

    expect(db.getResults).toHaveBeenCalledWith(
      expect.objectContaining({ sslValid: false })
    );
  });

  // ----- DATE VALIDATION -----

  const dateFields = [
    'created_from',
    'created_to',
    'whois_expiration_from',
    'whois_expiration_to',
  ];

  dateFields.forEach(field => {
    it(`returns 400 for invalid date in ${field}`, () => {
      const req = { query: { [field]: '2025/01/01' } };
      const res = mockRes();

      handleGetResults(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: `${field} must be YYYY-MM-DD`,
      });
    });
  });

  // ----- SUCCESS PATH -----

  it('returns rows from getResults', () => {
    const rows = [{ id: 1, domain: 'example.com' }];
    db.getResults.mockReturnValue(rows);

    const req = { query: {} };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.json).toHaveBeenCalledWith(rows);
  });

  // ----- ERROR PATH -----

  it('returns 500 if getResults throws', () => {
    db.getResults.mockImplementation(() => {
      throw new Error('DB failure');
    });

    const req = { query: {} };
    const res = mockRes();

    handleGetResults(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'DB failure',
    });
  });
});

// ============================================================================
// DELETE /results/:id
// ============================================================================

describe('handleDeleteResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for non-integer id', async () => {
    const req = { params: { id: 'abc' } };
    const res = mockRes();

    await handleDeleteResult(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid result id',
    });
  });

  it('returns 400 for id <= 0', async () => {
    const req = { params: { id: '-1' } };
    const res = mockRes();

    await handleDeleteResult(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when deleteResult returns false', async () => {
    db.deleteResult.mockReturnValue(false);

    const req = { params: { id: '5' } };
    const res = mockRes();

    await handleDeleteResult(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Result not found',
    });
  });

  it('returns success when deleteResult returns true', async () => {
    db.deleteResult.mockReturnValue(true);

    const req = { params: { id: '5' } };
    const res = mockRes();

    await handleDeleteResult(req, res);

    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('returns 500 if deleteResult throws', async () => {
    db.deleteResult.mockImplementation(() => {
      throw new Error('Delete failed');
    });

    const req = { params: { id: '5' } };
    const res = mockRes();

    await handleDeleteResult(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Delete failed',
    });
  });
});
