import type { Env } from '../config/env.js';
import { LocalStorage } from './local.js';
import type { StorageAdapter } from './types.js';

export { LocalStorage } from './local.js';
export { StorageNotFoundError } from './types.js';
export type { StorageAdapter } from './types.js';

export function createStorage(env: Env): StorageAdapter {
  if (env.STORAGE_DRIVER === 'local') {
    return new LocalStorage({ rootDir: env.STORAGE_LOCAL_DIR });
  }
  throw new Error(`Storage driver '${env.STORAGE_DRIVER}' is not implemented yet`);
}
