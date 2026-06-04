import { createHash, randomBytes } from 'node:crypto';

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import type { PrismaClient } from '../db/client.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
    apiKeyId: string;
  }
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export interface GeneratedKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

/** Generate a fresh `sk_xxx`-style API key. The plaintext is shown to the user once. */
export function generateApiKey(): GeneratedKey {
  const body = randomBytes(24).toString('base64url');
  const prefix = body.slice(0, 8);
  const plaintext = `sk_${prefix}_${body}`;
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}

export interface ApiKeyAuthOptions {
  prisma: PrismaClient;
  /** Header name the key is read from. Defaults to `x-api-key`. */
  header?: string;
}

const apiKeyAuthPlugin: FastifyPluginAsync<ApiKeyAuthOptions> = async (app, opts) => {
  const headerName = (opts.header ?? 'x-api-key').toLowerCase();
  const prisma = opts.prisma;

  app.decorateRequest('tenantId', '');
  app.decorateRequest('apiKeyId', '');

  app.decorate('requireApiKey', async (req: FastifyRequest) => {
    const raw = req.headers[headerName];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) {
      throw app.httpErrors.unauthorized('Missing X-API-Key header');
    }
    const hash = hashApiKey(value);
    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey: hash },
      select: { id: true, tenantId: true, revokedAt: true },
    });
    if (!apiKey || apiKey.revokedAt) {
      throw app.httpErrors.unauthorized('Invalid API key');
    }
    req.tenantId = apiKey.tenantId;
    req.apiKeyId = apiKey.id;
  });
};

export const apiKeyAuth = fp(apiKeyAuthPlugin, { name: 'api-key-auth' });

declare module 'fastify' {
  interface FastifyInstance {
    requireApiKey: (req: FastifyRequest) => Promise<void>;
  }
}
