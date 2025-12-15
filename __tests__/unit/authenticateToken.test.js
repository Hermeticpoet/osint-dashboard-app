// __tests__/unit/authenticateToken.test.js
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../middleware/auth.js';

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';

function makeApp(handler) {
  const app = express();
  app.get('/protected', authenticateToken, handler);
  return app;
}

describe('authenticateToken (unit)', () => {
  const adminPayload = { sub: 'user-1', role: 'admin' };
  const readerPayload = { sub: 'user-2', role: 'read-only' };

  const sign = (payload, opts = { expiresIn: '1h' }) =>
    jwt.sign(payload, TEST_SECRET, opts);

  test('allows valid admin token and sets req.user', async () => {
    const token = sign(adminPayload);
    const app = makeApp((req, res) => res.json({ role: req.user.role }));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'admin' });
  });

  test('allows valid read-only token and sets req.user', async () => {
    const token = sign(readerPayload);
    const app = makeApp((req, res) => res.json({ role: req.user.role }));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'read-only' });
  });

  test('rejects missing Authorization header', async () => {
    const app = makeApp((req, res) => res.json({ ok: true }));
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token required' });
  });

  test('rejects malformed Authorization header (non-Bearer)', async () => {
    const token = sign(adminPayload);
    const app = makeApp((req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Token ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token required' });
  });

  test('rejects invalid signature', async () => {
    const badToken = jwt.sign(adminPayload, 'wrong-secret', { expiresIn: '1h' });
    const app = makeApp((req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
  });

  test('rejects expired token', async () => {
    const token = jwt.sign(adminPayload, TEST_SECRET, { expiresIn: '1ms' });
    const app = makeApp((req, res) => res.json({ ok: true }));

    // wait so token naturally expires
    await new Promise(r => setTimeout(r, 10));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
  });

  test('rejects non-Bearer scheme (Basic)', async () => {
    const token = sign(adminPayload);
    const app = makeApp((req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token required' });
  });
});
