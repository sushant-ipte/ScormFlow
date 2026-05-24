import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';

import type { Env } from '../config/env.js';
import { registerRoutes } from './routes/index.js';

export interface AppDeps {
  env: Env;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { env } = deps;

  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            level: env.LOG_LEVEL,
            transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
          }
        : { level: env.LOG_LEVEL },
    // 200 MB celing
    bodyLimit: 200 * 1024 * 1024,
  });

  await app.register(sensible);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(multipart, {
    limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  await app.register(registerRoutes, { prefix: '/api/v1' });

  return app;
}
