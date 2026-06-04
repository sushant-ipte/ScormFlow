import { describe, expect, it } from 'vitest';

import { ingestScormPackage, parsePackageManifest, PackageIngestError } from '../../src/parser/index.js';
import { validatePackage } from '../../src/services/courses.js';
import { buildScormZip } from '../helpers/scorm-fixture.js';
import { MemoryStorage } from '../helpers/memory-storage.js';

describe('parsePackageManifest', () => {
  it('parses the manifest from a valid SCORM 1.2 zip', async () => {
    const zip = buildScormZip({ version: '1.2', title: 'My Course' });
    const m = await parsePackageManifest(zip);
    expect(m.version).toBe('SCORM_1_2');
    expect(m.title).toBe('My Course');
  });

  it('parses the manifest from a valid SCORM 2004 zip', async () => {
    const zip = buildScormZip({ version: '2004', title: 'Adv Course' });
    const m = await parsePackageManifest(zip);
    expect(m.version).toBe('SCORM_2004_4');
    expect(m.title).toBe('Adv Course');
  });

  it('throws missing_manifest when imsmanifest.xml is absent', async () => {
    const zip = buildScormZip({ manifestXml: '' });
    // Build a zip that explicitly lacks the manifest by overriding to empty and removing.
    // Simpler: construct one with no manifest:
    const AdmZip = (await import('adm-zip')).default;
    const z = new AdmZip();
    z.addFile('index.html', Buffer.from('hi'));
    try {
      await parsePackageManifest(z.toBuffer());
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PackageIngestError);
      expect((err as PackageIngestError).code).toBe('missing_manifest');
    }
    // The buildScormZip-built one is well-formed even with empty manifestXml override —
    // parsing it should throw malformed_manifest instead.
    await expect(parsePackageManifest(zip)).rejects.toBeInstanceOf(PackageIngestError);
  });
});

describe('ingestScormPackage', () => {
  it('parses + extracts a valid package end-to-end', async () => {
    const zip = buildScormZip({
      extraFiles: [{ path: 'media/logo.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
    });
    const storage = new MemoryStorage();
    const result = await ingestScormPackage(zip, storage, { storagePrefix: 'tenants/t1/courses/c1' });
    expect(result.manifest.title).toBe('Test Course');
    expect(result.fileCount).toBeGreaterThanOrEqual(3);
    expect(await storage.exists('tenants/t1/courses/c1/imsmanifest.xml')).toBe(true);
    expect(await storage.exists('tenants/t1/courses/c1/media/logo.png')).toBe(true);
  });
});

describe('validatePackage', () => {
  it('returns valid=true for a well-formed package', async () => {
    const report = await validatePackage(buildScormZip());
    expect(report.valid).toBe(true);
    expect(report.version).toBe('SCORM_1_2');
    expect(report.errors).toHaveLength(0);
  });

  it('returns valid=false with an error code for a broken package', async () => {
    const AdmZip = (await import('adm-zip')).default;
    const z = new AdmZip();
    z.addFile('imsmanifest.xml', Buffer.from('<not-xml'));
    const report = await validatePackage(z.toBuffer());
    expect(report.valid).toBe(false);
    expect(report.errors[0]?.code).toBe('malformed_manifest');
  });
});
