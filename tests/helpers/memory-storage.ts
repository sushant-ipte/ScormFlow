import { Readable } from 'node:stream';

import { StorageNotFoundError, type StorageAdapter } from '../../src/storage/types.js';

/** Test-only StorageAdapter that holds everything in a Map<string, Buffer>. */
export class MemoryStorage implements StorageAdapter {
  readonly files = new Map<string, Buffer>();

  async put(key: string, body: Readable | Buffer): Promise<void> {
    if (Buffer.isBuffer(body)) {
      this.files.set(key, body);
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(chunk as Buffer);
    this.files.set(key, Buffer.concat(chunks));
  }

  async get(key: string): Promise<Readable> {
    const buf = this.files.get(key);
    if (!buf) throw new StorageNotFoundError(key);
    return Readable.from(buf);
  }

  async delete(key: string): Promise<void> {
    // Treat key as a prefix — wipe everything beneath it.
    for (const existing of this.files.keys()) {
      if (existing === key || existing.startsWith(`${key}/`)) {
        this.files.delete(existing);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  async signedUrl(key: string, _ttlSeconds: number): Promise<string> {
    if (!this.files.has(key)) throw new StorageNotFoundError(key);
    return `mem://${key}`;
  }
}
