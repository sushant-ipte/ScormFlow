import { describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';

import { extractZipToStorage, readZipEntry, ZipExtractionError, _internal } from '../../src/parser/zip.js';
import { buildScormZip } from '../helpers/scorm-fixture.js';
import { MemoryStorage } from '../helpers/memory-storage.js';

describe('extractZipToStorage', () => {
  it('writes every non-directory entry to storage under the prefix', async () => {
    const zip = buildScormZip({
      extraFiles: [
        { path: 'assets/img.png', content: 'PNG' },
        { path: 'js/app.js', content: 'console.log(1)' },
      ],
    });
    const storage = new MemoryStorage();
    const result = await extractZipToStorage(zip, storage, 'pkg/course-1');
    expect(result.files.map((f) => f.path).sort()).toEqual(
      ['assets/img.png', 'imsmanifest.xml', 'index.html', 'js/app.js'].sort(),
    );
    expect(await storage.exists('pkg/course-1/imsmanifest.xml')).toBe(true);
    expect(await storage.exists('pkg/course-1/js/app.js')).toBe(true);
  });

  it('rejects path traversal entries', async () => {
    const zip = new AdmZip();
    zip.addFile('imsmanifest.xml', Buffer.from('<m/>', 'utf8'));
    zip.addFile('../escape.txt', Buffer.from('bad', 'utf8'));
    const storage = new MemoryStorage();
    const result = await extractZipToStorage(zip.toBuffer(), storage, 'pkg/x');
    expect(result.files.find((f) => f.path.includes('..'))).toBeUndefined();
    expect(await storage.exists('pkg/x/imsmanifest.xml')).toBe(true);
  });

  it('rejects archives that exceed the total size cap', async () => {
    const zip = buildScormZip();
    await expect(
      extractZipToStorage(zip, new MemoryStorage(), 'pkg/y', { maxTotalSizeBytes: 5 }),
    ).rejects.toThrow(ZipExtractionError);
  });

  it('rejects archives that exceed the file-count cap', async () => {
    const zip = buildScormZip({
      extraFiles: Array.from({ length: 5 }, (_, i) => ({ path: `f${i}.txt`, content: 'x' })),
    });
    await expect(
      extractZipToStorage(zip, new MemoryStorage(), 'pkg/z', { maxFileCount: 3 }),
    ).rejects.toThrow(ZipExtractionError);
  });

  it('throws ZipExtractionError on a malformed buffer', async () => {
    await expect(
      extractZipToStorage(Buffer.from('not a zip'), new MemoryStorage(), 'pkg/q'),
    ).rejects.toThrow(ZipExtractionError);
  });
});

describe('readZipEntry', () => {
  it('returns the contents of a single named entry', async () => {
    const zip = buildScormZip({ title: 'Hello' });
    const raw = await readZipEntry(zip, 'imsmanifest.xml');
    expect(raw).not.toBeNull();
    expect(raw!.toString('utf8')).toContain('<title>Hello</title>');
  });

  it('returns null when the entry is missing', async () => {
    const zip = buildScormZip();
    expect(await readZipEntry(zip, 'missing.xml')).toBeNull();
  });

  it('is case-insensitive on the entry name', async () => {
    const zip = buildScormZip();
    const raw = await readZipEntry(zip, 'IMSManifest.XML');
    expect(raw).not.toBeNull();
  });
});

describe('_internal.sanitizeEntryPath', () => {
  it('rejects absolute paths', () => {
    expect(_internal.sanitizeEntryPath('/abs/path.txt')).toBeNull();
  });
  it('rejects path traversal', () => {
    expect(_internal.sanitizeEntryPath('a/../../b.txt')).toBeNull();
  });
  it('normalizes backslashes to forward slashes', () => {
    expect(_internal.sanitizeEntryPath('a\\b\\c.txt')).toBe('a/b/c.txt');
  });
  it('rejects directory entries', () => {
    expect(_internal.sanitizeEntryPath('a/b/')).toBeNull();
  });
});
