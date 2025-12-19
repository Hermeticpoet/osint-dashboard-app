// __tests__/unit/authorizeRole.test.js
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { authorizeRole } from '../../middleware/auth.js';

function createMockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('authorizeRole middleware (unit)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = createMockResponse();
    next = jest.fn();
  });

  test('responds with 401 Unauthorized when req.user is missing', () => {
    const middleware = authorizeRole('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows access when single allowed role matches user role', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRole('admin');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('denies access with 403 Forbidden when single allowed role does not match', () => {
    req.user = { role: 'analyst' };
    const middleware = authorizeRole('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('allows access when one of multiple allowed roles matches user role', () => {
    req.user = { role: 'analyst' };
    const middleware = authorizeRole(['admin', 'analyst']);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('denies access with 403 Forbidden when user role is not in multiple allowed roles', () => {
    req.user = { role: 'viewer' };
    const middleware = authorizeRole(['admin', 'analyst']);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('denies access with 403 Forbidden when allowed roles array is empty', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRole([]);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('denies access with 403 Forbidden when allowed is undefined', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRole(undefined);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('treats role comparison as case-sensitive and denies mismatched case', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRole('Admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});