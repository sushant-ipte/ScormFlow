import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';
import { createTestEnv } from '../helpers/test-env.js';

describe('buildApp', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ env: createTestEnv() });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('health endpoints', () => {
    it('GET /healthz returns 200 with { status: "ok" }', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });

    it('GET /readyz returns 200 with { status: "ready" }', async () => {
      const res = await app.inject({ method: 'GET', url: '/readyz' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ready' });
    });

    it('health endpoints are not under the /api/v1 prefix', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/healthz' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('versioned API root', () => {
    it('GET /api/v1/ returns server name and version', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toMatchObject({ name: '@scormflow/server' });
      expect(typeof body.version).toBe('string');
    });
  });

  describe('error handling', () => {
    it('returns a structured 404 for unknown routes', async () => {
      const res = await app.inject({ method: 'GET', url: '/this-does-not-exist' });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('returns 404 for unknown methods on a known path', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/healthz' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('CORS', () => {
    it('responds to a preflight request with permissive Allow-Origin headers', async () => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'content-type',
        },
      });
      expect(res.statusCode).toBeLessThan(300);
      expect(res.headers['access-control-allow-origin']).toBe('https://example.com');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('JWT plugin registration', () => {
    it('decorates the fastify instance with jwt', () => {
      expect(typeof app.jwt).toBe('object');
      expect(typeof app.jwt.sign).toBe('function');
      expect(typeof app.jwt.verify).toBe('function');
    });

    it('can sign and verify a payload round-trip', async () => {
      const token = app.jwt.sign({ attemptId: 'abc123' });
      const decoded = app.jwt.verify<{ attemptId: string }>(token);
      expect(decoded.attemptId).toBe('abc123');
    });
  });
});
