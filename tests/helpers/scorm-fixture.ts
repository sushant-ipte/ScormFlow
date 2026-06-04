import AdmZip from 'adm-zip';

export interface ScormFixtureFile {
  path: string;
  content: string | Buffer;
}

export interface ScormFixtureOptions {
  version?: '1.2' | '2004';
  title?: string;
  /** Override or replace the imsmanifest.xml. */
  manifestXml?: string;
  /** Extra files to include in the package. */
  extraFiles?: ScormFixtureFile[];
}

export function buildScormZip(options: ScormFixtureOptions = {}): Buffer {
  const version = options.version ?? '1.2';
  const title = options.title ?? 'Test Course';
  const zip = new AdmZip();
  const manifest = options.manifestXml ?? defaultManifest(version, title);
  zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf8'));
  zip.addFile('index.html', Buffer.from('<html>hi</html>', 'utf8'));
  for (const f of options.extraFiles ?? []) {
    const content = typeof f.content === 'string' ? Buffer.from(f.content, 'utf8') : f.content;
    zip.addFile(f.path, content);
  }
  return zip.toBuffer();
}

function defaultManifest(version: '1.2' | '2004', title: string): string {
  if (version === '1.2') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MAN-1" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>Module 1</title>
        <adlcp:masteryscore>75</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MAN-2" version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>${title}</title>
      <item identifier="I1" identifierref="R1"><title>Chapter 1</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="R1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
}
