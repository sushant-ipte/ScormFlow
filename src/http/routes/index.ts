import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const registerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get('/', async () => ({ name: '@scormflow/server', version: '0.0.0' }));
};
